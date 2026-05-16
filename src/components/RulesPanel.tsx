"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  useRoom, usePlayers, useCards, useLogs,
} from "@/lib/realtime";
import {
  copyCard, createOriginalCards, deleteCard, endRoom,
} from "@/lib/game";
import { CARDS_PER_PLAYER, CARD_PROTECTION_MS, COPY_COOLDOWN_MS, DELETER_COUNT, GAME_START_GRACE_MS, getInfectionStage } from "@/lib/constants";
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

  // 탭 닫기/새로고침/백그라운드 이동 시 lobby 상태면 자동 퇴장
  // 게임 시작 후에는 유지 (다시 들어올 수 있게)
  useEffect(() => {
    if (!myId || !room) return;
    const handler = () => {
      if (room.status === "lobby") {
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/players?id=eq.${myId}`;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        fetch(url, {
          method: "DELETE",
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          keepalive: true,
        }).catch(() => {});
        localStorage.removeItem(`player:${roomId}`);
      }
    };
    // 여러 이벤트 동시 등록 — 브라우저별로 동작 다름
    window.addEventListener("beforeunload", handler);
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      window.removeEventListener("pagehide", handler);
    };
  }, [myId, room, roomId]);

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
  const endRoomTriggerRef = useRef(false); // 종료 중복 호출 방지
  // 시간 0 도달 시 즉시 종료 화면 보여주기 (DB 응답 안 기다림)
  const [forceEnd, setForceEnd] = useState(false);
  // 낙관적 업데이트 — 삭제 클릭한 카드는 즉시 화면에서 숨김 (DB 응답 안 기다림)
  const [optimisticDeleted, setOptimisticDeleted] = useState<Set<string>>(new Set());

  // 타이머
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!room || room.status !== "playing" || !room.started_at) return;
    const tick = () => {
      const elapsed = (Date.now() - new Date(room.started_at!).getTime()) / 1000;
      const left = Math.max(0, room.duration_seconds - elapsed);
      setTimeLeft(left);

      // 시간 다 되면 즉시 종료 화면으로 (DB 응답 안 기다림)
      if (left <= 0 && room.status === "playing") {
        if (!forceEnd) setForceEnd(true);
        if (!endRoomTriggerRef.current) {
          endRoomTriggerRef.current = true;
          endRoom(room.id).catch(() => {
            endRoomTriggerRef.current = false;
          });
        }
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [room]);

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
  const liveCards = useMemo(
    () => cards.filter((c) => !c.deleted && !optimisticDeleted.has(c.id)),
    [cards, optimisticDeleted]
  );

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

  // 검색 — 매칭되는 카드 중 1개만 노란 ring으로 강조 (내 카드 우선)
  const searchLower = search.trim().toLowerCase();

  const searchHitId = useMemo(() => {
    if (!searchLower) return null;
    // 매칭되는 카드들 필터링
    const matches = liveCards.filter((c) =>
      c.name.toLowerCase().includes(searchLower) ||
      c.hobby.toLowerCase().includes(searchLower) ||
      c.birthday.toLowerCase().includes(searchLower)
    );
    if (matches.length === 0) return null;
    // 내 카드 우선, 그 중 가장 오래된 것 우선
    const mine = matches.filter((c) => c.owner_id === myId);
    const pool = mine.length > 0 ? mine : matches;
    pool.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return pool[0].id;
  }, [searchLower, liveCards, myId]);

  function searchHit(c: Card) {
    return c.id === searchHitId;
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
    // 게임 시작 후 grace(10초) 동안은 삭제 불가
    if (room?.started_at) {
      const elapsed = Date.now() - new Date(room.started_at).getTime();
      if (elapsed < GAME_START_GRACE_MS) {
        return;
      }
    }
    // 개별 카드 보호 시간 — 생성 후 3초간 삭제 불가
    const cardAge = Date.now() - new Date(c.created_at).getTime();
    if (cardAge < CARD_PROTECTION_MS) {
      return;
    }
    // 낙관적 업데이트 — 즉시 화면에서 숨김 (DB 응답 안 기다림)
    setOptimisticDeleted(prev => {
      const next = new Set(prev);
      next.add(c.id);
      return next;
    });
    // DB 호출은 백그라운드 (Realtime이 곧 동기화해줌)
    deleteCard(c, myId).catch(console.error);
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

  // 종료 화면 (status가 ended이거나 forceEnd로 강제 종료된 경우)
  if (room.status === "ended" || forceEnd) {
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
    const isExpectedSpreader = expectedRole === "spreader";
    const isExpectedDeleter = expectedRole === "deleter";

    return (
      <main className="min-h-screen p-4 md:p-6 max-w-3xl mx-auto">
        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold">대기실</h1>
          <p className="text-sm text-white/60 mt-1">
            방 코드 <span className="text-purple-300 font-mono">{room.code}</span> · 입장자{" "}
            <span className="text-purple-300">{players.length}</span>명
          </p>
        </div>

        {/* ============================================ */}
        {/* 1단계 공통: 역할 발표 (큰 배너로 강조)        */}
        {/* ============================================ */}
        {expectedRole && (
          <div
            className={`rounded-2xl p-6 mb-4 text-center border-2 ${
              isExpectedDeleter
                ? "bg-green-500/15 border-green-400/60"
                : "bg-red-500/15 border-red-400/60"
            }`}
          >
            <div className="text-[11px] tracking-[0.3em] text-white/60 mb-2">
              YOUR ROLE
            </div>
            <div className="text-6xl mb-2">{isExpectedDeleter ? "🛡" : "🦠"}</div>
            <div
              className={`text-3xl font-bold mb-1 ${
                isExpectedDeleter ? "text-green-200" : "text-red-200"
              }`}
            >
              {isExpectedDeleter ? "삭제팀 (PURGE TEAM)" : "유포자 (INFECTED)"}
            </div>
            <p className="text-sm text-white/70 mt-2">
              {isExpectedDeleter
                ? "🎯 내 정보를 지키는 임무 — 화면에 보이는 내 카드를 빠르게 지우세요"
                : "🎯 정보를 퍼뜨리는 임무 — 다른 학생들 카드를 클릭해서 복제하세요"}
            </p>
            <div className="text-[10px] text-white/40 mt-3 font-mono tracking-widest">
              입장 순번 #{myIdx + 1} ·{" "}
              {isExpectedDeleter
                ? `먼저 입장한 ${DELETER_COUNT}명 중 1명`
                : "삭제팀 이후 입장자"}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* 2단계: 역할별 분기                           */}
        {/* ============================================ */}

        {/* 삭제팀 — 카드 작성 → 대기 */}
        {isExpectedDeleter && !submitted && (
          <div className="space-y-4">
            <RulesPanel expectedRole={expectedRole} />

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-sm text-white/70 mb-3">
                📇 <b>지킬 내 정보 카드 {CARDS_PER_PLAYER}장</b>을 작성하세요. 게임이 시작되면
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
                        className="bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400 text-white"
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
                        className="bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400 text-white"
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
                        className="bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400 text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleSubmit}
                className="w-full bg-green-500 hover:bg-green-400 text-white font-medium py-3 rounded-xl transition mt-4"
              >
                카드 등록하고 대기하기
              </button>
              <p className="text-xs text-white/40 text-center mt-3">
                💡 실제 개인정보는 적지 마세요. 게임용 가상 정보로 충분합니다.
              </p>
            </div>
          </div>
        )}

        {/* 삭제팀 — 카드 등록 완료 후 대기 */}
        {isExpectedDeleter && submitted && (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-400/30 rounded-xl p-5 text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="font-medium mb-1">카드 등록 완료!</p>
              <p className="text-sm text-white/60 mb-1">
                선생님이 게임을 시작하면 자동으로 이동합니다...
              </p>
              <p className="text-[11px] text-white/40 mt-3">
                총 {players.length}명 대기 중
              </p>
            </div>

            <RulesPanel expectedRole={expectedRole} />
          </div>
        )}

        {/* 유포자 — 카드 작성 없이 바로 대기 + 룰 학습 */}
        {isExpectedSpreader && (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-5 text-center">
              <div className="text-3xl mb-2">🦠</div>
              <p className="font-medium text-red-200 mb-1">대기 중...</p>
              <p className="text-sm text-white/70">
                유포자는 카드를 만들지 않아요.
                <br />
                다른 학생들의 카드를 <b className="text-red-300">복제</b>하는 것이 임무입니다.
              </p>
              <p className="text-[11px] text-white/40 mt-3">
                선생님이 게임을 시작하면 자동으로 이동합니다 · 총 {players.length}명 대기 중
              </p>
            </div>

            <RulesPanel expectedRole={expectedRole} />
          </div>
        )}

        {/* 역할 아직 결정 안 됨 (예외 케이스) */}
        {!expectedRole && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-white/60">
            역할 배정 중...
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

  // 시작 grace 카운트다운 (삭제팀에게만 의미 있음)
  const graceRemainingMs = room?.started_at
    ? Math.max(0, GAME_START_GRACE_MS - (Date.now() - new Date(room.started_at).getTime()))
    : 0;
  const inGracePeriod = graceRemainingMs > 0;

  return (
    <main className="min-h-screen p-3 md:p-4">
      {/* 시작 grace — 삭제 불가 안내 배너 */}
      {inGracePeriod && !amSpreader && (
        <div className="bg-amber-500/15 border border-amber-400/50 rounded-xl px-4 py-2 mb-3 text-center">
          <span className="text-amber-200 text-sm font-medium">
            ⏱ 시작 직후 — 아직 삭제 불가!{" "}
            <span className="text-amber-300 font-bold tabular-nums">
              {Math.ceil(graceRemainingMs / 1000)}초
            </span>{" "}
            후 삭제 가능
          </span>
        </div>
      )}
      {inGracePeriod && amSpreader && (
        <div className="bg-red-500/15 border border-red-400/50 rounded-xl px-4 py-2 mb-3 text-center">
          <span className="text-red-200 text-sm font-medium">
            ⚡ 황금시간! 마음껏 복제하세요{" "}
            <span className="text-red-300 font-bold tabular-nums">
              {Math.ceil(graceRemainingMs / 1000)}초
            </span>{" "}
            남음
          </span>
        </div>
      )}

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
              placeholder="🔍 내 이름/생일/취미 검색해서 찾기"
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
