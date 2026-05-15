"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  useRoom, usePlayers, useCards, useLogs,
} from "@/lib/realtime";
import {
  copyCard, createOriginalCards, deleteCard, endRoom, triggerBreach,
} from "@/lib/game";
import { CARDS_PER_PLAYER, COPY_COOLDOWN_MS, DELETER_COUNT, DELETE_PROTECTION_MS, getInfectionStage } from "@/lib/constants";
import { CardItem } from "@/components/CardItem";
import { ServerLog } from "@/components/ServerLog";
import { usePopEffects } from "@/components/PopEffect";
import { ResultsView } from "@/components/ResultsView";
import { RulesPanel } from "@/components/RulesPanel";
import type { Card } from "@/types";

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.room as string;

  const room = useRoom(roomId);
  const players = usePlayers(roomId);
  const cards = useCards(roomId);
  const logs = useLogs(roomId);

  // 본인 ID는 localStorage에서 (입장 시 저장됨)
  const [myId, setMyId] = useState<string | null>(null);
  useEffect(() => {
    setMyId(localStorage.getItem(`player:${roomId}`));
  }, [roomId]);

  const me = players.find((p) => p.id === myId);
  const amSpreader = me?.role === "spreader";

  // 카드 작성 상태
  const [inputs, setInputs] = useState(
    Array.from({ length: CARDS_PER_PLAYER }, () => ({
      name: "", hobby: "", birthday: "",
    }))
  );
  const [submitted, setSubmitted] = useState(false);

  // 게임 화면 상태
  const [tab, setTab] = useState<"field" | "log">("field");
  const [focusMine, setFocusMine] = useState(false);
  const [search, setSearch] = useState("");
  const pop = usePopEffects();
  const cooldownRef = useRef<Record<string, number>>({});
  const breachTriggerRef = useRef(false);  // 중복 발동 방지

  // 타이머
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!room || room.status !== "playing" || !room.started_at) return;
    const tick = () => {
      const elapsed = (Date.now() - new Date(room.started_at!).getTime()) / 1000;
      const left = Math.max(0, room.duration_seconds - elapsed);
      setTimeLeft(left);

      // 1분 30초 (90초) 경과 시 데이터 유출 사고 자동 발동
      // 모든 클라이언트가 동시에 조건 만족하지만 DB 함수에서 한 번만 실행되게 처리
      const BREACH_TRIGGER_SECONDS = 90;
      if (
        elapsed >= BREACH_TRIGGER_SECONDS &&
        !room.breach_at &&
        !breachTriggerRef.current
      ) {
        breachTriggerRef.current = true;
        triggerBreach(room.id).catch(() => {
          breachTriggerRef.current = false; // 실패 시 다시 시도 가능
        });
      }

      // 시간 다 되면 자동 종료 (먼저 본 사람이 종료)
      if (left <= 0 && room.status === "playing") {
        endRoom(room.id);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [room]);

  // BREACH 발생 시 화면에 알람 표시 (3초간)
  const [breachAlert, setBreachAlert] = useState(false);
  useEffect(() => {
    if (!room?.breach_at) return;
    setBreachAlert(true);
    const id = setTimeout(() => setBreachAlert(false), 3500);
    return () => clearTimeout(id);
  }, [room?.breach_at]);

  // 카드 제출
  async function handleSubmit() {
    if (!myId || !roomId) return;
    const filled = inputs.filter((c) => c.name.trim() && c.hobby.trim() && c.birthday.trim());
    if (filled.length < CARDS_PER_PLAYER) {
      alert(`${CARDS_PER_PLAYER}개 카드를 모두 작성해주세요`);
      return;
    }
    try {
      await createOriginalCards(roomId, myId, filled);
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      alert("카드 등록 실패");
    }
  }

  // 활성 카드만 (삭제 안 된 것)
  const liveCards = useMemo(() => cards.filter((c) => !c.deleted), [cards]);

  // origin_id별 살아있는 복제본 수 계산 → 감염 단계 결정에 사용
  // 같은 origin에 속한 카드 중 (원본 제외) 개수를 셈
  const copyCountByOrigin = useMemo(() => {
    const m: Record<string, number> = {};
    liveCards.forEach((c) => {
      if (!c.is_original) {
        m[c.origin_id] = (m[c.origin_id] || 0) + 1;
      } else if (!(c.origin_id in m)) {
        m[c.origin_id] = 0;
      }
    });
    return m;
  }, [liveCards]);

  // 검색
  const searchLower = search.trim().toLowerCase();

  function searchHit(c: Card) {
    if (!searchLower) return false;
    return (
      c.name.toLowerCase().includes(searchLower) ||
      c.hobby.toLowerCase().includes(searchLower) ||
      c.birthday.toLowerCase().includes(searchLower)
    );
  }

  // 카드 좌클릭 — 역할에 따라 다르게 동작
  // 유포자 → 복제 / 삭제팀 → 삭제 (본인 카드만)
  async function onCardClick(c: Card) {
    if (!myId) return;

    if (amSpreader) {
      // 유포자: 좌클릭 = 복제
      await tryCopy(c);
      return;
    }

    // 삭제팀: 좌클릭 = 삭제 (본인 카드만)
    if (c.owner_id !== myId) {
      // 다른 친구 카드 — 클릭해도 삭제 안 됨
      return;
    }
    // 카드 생성 후 5초간은 삭제 불가 (유포자 보호 시간)
    const cardAge = Date.now() - new Date(c.created_at).getTime();
    if (cardAge < DELETE_PROTECTION_MS) {
      return;
    }
    await deleteCard(c, myId);
  }

  // 우클릭/길게누르기 — 유포자 보조 입력 (기존 호환성)
  async function onCardCopy(c: Card) {
    if (!myId || !amSpreader) return;
    await tryCopy(c);
  }

  // 복제 공통 로직
  async function tryCopy(c: Card) {
    if (!myId) return;
    // 본인 카드는 복제 안 함 (시드 방지)
    if (c.owner_id === myId) return;
    // 쿨다운 체크
    const now = Date.now();
    if ((cooldownRef.current[c.id] ?? 0) > now) return;
    cooldownRef.current[c.id] = now + COPY_COOLDOWN_MS;

    pop.trigger(c.x, c.y);
    await copyCard(c, myId, liveCards.length);
  }

  // ============================================
  // 화면 분기
  // ============================================

  if (!room) {
    return <Centered>방 정보를 불러오는 중...</Centered>;
  }
  if (!myId) {
    return (
      <Centered>
        <p className="mb-3">입장 정보가 없어요</p>
        <button
          onClick={() => router.push("/")}
          className="text-purple-300 underline"
        >
          메인으로 돌아가기
        </button>
      </Centered>
    );
  }

  // 종료 화면
  if (room.status === "ended") {
    return (
      <main className="min-h-screen">
        <ResultsView
          cards={cards}
          logs={logs}
          durationSec={room.duration_seconds}
          myRole={me?.role ?? null}
        />
      </main>
    );
  }

  // 대기실 (카드 작성 + 다른 학생 기다림)
  if (room.status === "lobby") {
    // 예정 역할 계산: 입장 순서가 DELETER_COUNT 안에 들면 삭제팀
    const myIdx = players.findIndex((p) => p.id === myId);
    const expectedRole: "deleter" | "spreader" | null = myIdx < 0
      ? null
      : myIdx < DELETER_COUNT
        ? "deleter"
        : "spreader";

    return (
      <main className="min-h-screen p-4 md:p-6 max-w-3xl mx-auto">
        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold">대기실</h1>
          <p className="text-sm text-white/60 mt-1">
            방 코드 <span className="text-purple-300 font-mono">{room.code}</span> · 입장자{" "}
            <span className="text-purple-300">{players.length}</span>명
          </p>
        </div>

        {!submitted ? (
          <div className="space-y-4">
            {/* 게임 룰 패널 */}
            <RulesPanel expectedRole={expectedRole} />

            {/* 카드 작성 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-sm text-white/70 mb-3">
                📇 <b>내 개인정보 카드 {CARDS_PER_PLAYER}개</b>를 작성하세요. 게임이 시작되면
                이 정보가 다른 학생들 화면에 나타나요.
              </p>
              <div className="space-y-3">
                {inputs.map((row, i) => (
                  <div
                    key={i}
                    className="bg-black/30 border border-white/10 rounded-xl p-4"
                  >
                    <div className="text-xs text-white/50 mb-2">카드 {i + 1}</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="이름"
                        value={row.name}
                        onChange={(e) => {
                          const next = [...inputs];
                          next[i].name = e.target.value;
                          setInputs(next);
                        }}
                        className="bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 text-white"
                      />
                      <input
                        type="text"
                        placeholder="생일 (예: 0315)"
                        value={row.birthday}
                        onChange={(e) => {
                          const next = [...inputs];
                          next[i].birthday = e.target.value;
                          setInputs(next);
                        }}
                        maxLength={8}
                        className="bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 text-white"
                      />
                      <input
                        type="text"
                        placeholder="취미"
                        value={row.hobby}
                        onChange={(e) => {
                          const next = [...inputs];
                          next[i].hobby = e.target.value;
                          setInputs(next);
                        }}
                        className="bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleSubmit}
                className="w-full bg-purple-500 hover:bg-purple-400 text-white font-medium py-3 rounded-xl transition mt-4"
              >
                카드 등록하고 대기하기
              </button>
              <p className="text-xs text-white/40 text-center mt-3">
                💡 실제 개인정보는 적지 마세요. 게임용 가상 정보로 충분합니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 등록 완료 + 예정 역할 */}
            <div className="bg-green-500/10 border border-green-400/30 rounded-xl p-5 text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="font-medium mb-1">카드 등록 완료!</p>
              <p className="text-sm text-white/60 mb-3">
                선생님이 게임을 시작하면 자동으로 이동합니다...
              </p>
              {expectedRole && (
                <div className="inline-block px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider"
                  style={{
                    background: expectedRole === "deleter" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                    color: expectedRole === "deleter" ? "#86efac" : "#fca5a5",
                    border: `1px solid ${expectedRole === "deleter" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
                  }}>
                  내 입장 순번 #{myIdx + 1} → 예정: {expectedRole === "deleter" ? "🛡 삭제팀" : "🦠 유포자"}
                </div>
              )}
              <p className="text-[11px] text-white/40 mt-3">
                총 {players.length}명 대기 중 · 먼저 들어온 {DELETER_COUNT}명만 삭제팀
              </p>
            </div>

            {/* 내 역할 행동 가이드 */}
            <RulesPanel expectedRole={expectedRole} />
          </div>
        )}
      </main>
    );
  }

  // ============================================
  // 진행 중 (room.status === "playing")
  // ============================================
  const myCardsRemaining = liveCards.filter((c) => c.owner_id === myId).length;
  const totalCopies = logs.filter((l) => l.action === "COPY").length;

  return (
    <main className="min-h-screen p-3 md:p-4">
      {/* 상단 HUD */}
      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧟‍♀️</span>
          <div className="text-xs">
            <div className="text-white/50">나의 역할</div>
            <div className={amSpreader ? "text-red-300 font-medium" : "text-blue-300 font-medium"}>
              {amSpreader ? "유포자 — 복제하라!" : "삭제팀 — 지워라!"}
            </div>
          </div>
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <div className="text-[10px] text-white/50">남은 시간</div>
            <div className={`text-xl font-bold tabular-nums ${timeLeft < 30 ? "text-red-400" : "text-white"}`}>
              {Math.floor(timeLeft / 60)}:{String(Math.floor(timeLeft % 60)).padStart(2, "0")}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-white/50">필드</div>
            <div className="text-xl font-bold text-blue-300 tabular-nums">{liveCards.length}</div>
          </div>
          <div>
            <div className="text-[10px] text-white/50">총 복제</div>
            <div className="text-xl font-bold text-red-300 tabular-nums">{totalCopies}</div>
          </div>
          {!amSpreader && (
            <div>
              <div className="text-[10px] text-white/50">내 카드 남음</div>
              <div className="text-xl font-bold text-amber-300 tabular-nums">{myCardsRemaining}</div>
            </div>
          )}
        </div>
      </div>

      {/* 탭 + 검색 */}
      <div className="flex gap-2 mb-2 items-center flex-wrap">
        <button
          onClick={() => setTab("field")}
          className={`px-3 py-1.5 rounded-lg text-sm ${
            tab === "field" ? "bg-purple-500/30 text-purple-100" : "bg-white/5 text-white/60"
          }`}
        >
          🖥 디지털 공간
        </button>
        <button
          onClick={() => setTab("log")}
          className={`px-3 py-1.5 rounded-lg text-sm ${
            tab === "log" ? "bg-purple-500/30 text-purple-100" : "bg-white/5 text-white/60"
          }`}
        >
          📜 서버 로그 ({logs.length})
        </button>
        {tab === "field" && !amSpreader && (
          <>
            <input
              type="text"
              placeholder="🔍 숨겨진 내 정보 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[180px] bg-black/30 border border-white/15 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={() => setFocusMine(!focusMine)}
              className={`px-3 py-1.5 rounded-lg text-sm transition whitespace-nowrap ${
                focusMine
                  ? "bg-white text-black font-medium shadow-[0_0_12px_rgba(255,255,255,0.5)]"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
              title="내 카드만 진하게, 나머지는 흐리게"
            >
              {focusMine ? "👁 내 카드만" : "👁 강조 OFF"}
            </button>
          </>
        )}
      </div>

      {/* 메인 화면 */}
      {tab === "field" ? (
        <div className="relative w-full h-[480px] md:h-[560px] field-bg bg-black/40 border border-white/10 rounded-xl overflow-hidden">
          {/* 데이터 유출 사고 알람 오버레이 */}
          {breachAlert && (
            <div
              className="absolute inset-0 z-[9999] flex items-center justify-center pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at center, rgba(239,68,68,0.4) 0%, rgba(0,0,0,0.85) 100%)",
                animation: "breach-flash 0.5s ease-out",
              }}
            >
              <div className="text-center font-mono animate-pulse">
                <div className="text-red-500 text-6xl md:text-8xl font-bold tracking-widest mb-2"
                  style={{ textShadow: "0 0 20px rgba(239,68,68,0.8), 4px 0 0 rgba(0,255,80,0.6), -4px 0 0 rgba(239,68,68,0.6)" }}>
                  ⚠ BREACH ⚠
                </div>
                <div className="text-red-300 text-lg md:text-2xl tracking-[0.3em] mb-1">
                  DATA LEAK DETECTED
                </div>
                <div className="text-amber-300 text-sm md:text-base tracking-wider">
                  데이터 유출 사고 발생! 카드들이 흩어졌어요...
                </div>
              </div>
            </div>
          )}

          {liveCards.map((c) => {
            const cnt = copyCountByOrigin[c.origin_id] ?? 0;
            return (
              <CardItem
                key={c.id}
                card={c}
                stage={getInfectionStage(cnt)}
                copyCount={cnt}
                isMine={c.owner_id === myId}
                amSpreader={amSpreader}
                searchHit={searchHit(c)}
                focusMine={focusMine && !amSpreader}
                onClick={() => onCardClick(c)}
                onContextMenu={() => onCardCopy(c)}
              />
            );
          })}
          {pop.render}

          {liveCards.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">
              아직 정보가 없습니다... 곧 나타날 거예요
            </div>
          )}
        </div>
      ) : (
        <ServerLog logs={logs} />
      )}

      {/* 하단 안내 */}
      <div className="mt-3 text-xs text-white/40 text-center">
        {amSpreader ? (
          <>🖱 클릭으로 복제 · 본인이 만든 카드는 복제 불가</>
        ) : (
          <>🖱 클릭으로 내 카드만 삭제 · 다른 친구 카드는 클릭해도 안 지워져요</>
        )}
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-center text-white/70">
      <div>{children}</div>
    </main>
  );
}
