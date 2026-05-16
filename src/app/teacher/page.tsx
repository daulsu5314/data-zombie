"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createRoom, assignRolesAndStart, endRoom } from "@/lib/game";
import { usePlayers, useRoom, useCards, useLogs } from "@/lib/realtime";
import { DELETER_COUNT, MIN_PLAYERS_TO_START } from "@/lib/constants";
import { TeacherFieldView } from "@/components/TeacherFieldView";
import { ResultsView } from "@/components/ResultsView";
import { RulesPanel } from "@/components/RulesPanel";
import type { Room } from "@/types";

export default function TeacherPage() {
  const [room, setRoom] = useState<Room | null>(null);
  const [creating, setCreating] = useState(false);
  const players = usePlayers(room?.id ?? null);
  const liveRoom = useRoom(room?.id ?? null);
  const cards = useCards(room?.id ?? null);
  const logs = useLogs(room?.id ?? null);

  const activeRoom = liveRoom ?? room;

  async function handleCreate() {
    setCreating(true);
    try {
      const r = await createRoom();
      setRoom(r as Room);
    } catch (e) {
      console.error(e);
      alert("방 생성 실패. Supabase 연결을 확인하세요.");
    } finally {
      setCreating(false);
    }
  }

  async function handleStart() {
    if (!activeRoom) return;
    if (players.length < MIN_PLAYERS_TO_START) {
      alert(`최소 ${MIN_PLAYERS_TO_START}명 이상 입장해야 시작할 수 있어요`);
      return;
    }
    const deleterCount = Math.min(DELETER_COUNT, players.length);
    const spreaderCount = players.length - deleterCount;
    const ok = confirm(
      `${players.length}명으로 게임을 시작할까요?\n\n` +
      `먼저 접속한 ${deleterCount}명 → 삭제팀\n` +
      `나머지 ${spreaderCount}명 → 유포자`
    );
    if (!ok) return;
    await assignRolesAndStart(activeRoom.id);
  }

  async function handleEnd() {
    if (!activeRoom) return;
    if (!confirm("게임을 종료할까요?")) return;
    await endRoom(activeRoom.id);
  }

  // 게임 진행 중 통계
  const liveCards = cards.filter((c) => !c.deleted);
  const liveCardCount = liveCards.length;
  const copyCount = logs.filter((l) => l.action === "COPY").length;
  const deleteCount = logs.filter((l) => l.action === "DELETE").length;
  const spreaderCount = players.filter((p) => p.role === "spreader").length;
  const deleterCount = players.filter((p) => p.role === "deleter").length;

  // 카드를 등록한 학생 id 집합 (대기실에서 누가 카드 썼는지 표시용)
  const playersWithCards = new Set(cards.filter((c) => c.is_original).map((c) => c.owner_id));

  // origin_id별 살아있는 복제본 수 (CardItem과 동일 로직)
  const copyByOrigin: Record<string, { count: number; name: string }> = {};
  liveCards.forEach((c) => {
    if (!copyByOrigin[c.origin_id]) {
      copyByOrigin[c.origin_id] = { count: 0, name: c.name };
    }
    if (!c.is_original) copyByOrigin[c.origin_id].count += 1;
  });

  // 단계별 카드 개수 (원본 기준)
  let safeCount = 0, warningCount = 0, criticalCount = 0;
  Object.values(copyByOrigin).forEach(({ count }) => {
    if (count >= 20) criticalCount++;
    else if (count >= 10) warningCount++;
    else safeCount++;
  });

  // 가장 많이 복제된 Top 3
  const topInfected = Object.values(copyByOrigin)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // 남은 시간 (사용자 페이지와 같은 방식)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (activeRoom?.status !== "playing") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeRoom?.status]);

  const timeLeft = activeRoom?.started_at && activeRoom.status === "playing"
    ? Math.max(0, activeRoom.duration_seconds - Math.floor((now - new Date(activeRoom.started_at).getTime()) / 1000))
    : 0;
  const timeLeftStr = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`;

  // 최근 로그 5개
  const recentLogs = [...logs].slice(-8).reverse();

  if (!activeRoom) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-3">👩‍🏫</div>
          <h1 className="text-3xl font-bold mb-2">교사용 페이지</h1>
          <p className="text-white/60 mb-8">
            게임방을 만들면 6자리 코드와 QR이 생성됩니다.<br />
            학생들이 핸드폰으로 접속해서 입장할 수 있어요.
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white font-medium px-8 py-3 rounded-lg text-lg transition"
          >
            {creating ? "생성 중..." : "새 게임방 만들기"}
          </button>
          <div className="mt-6">
            <a href="/" className="text-xs text-white/50 hover:text-white underline">
              ← 메인으로
            </a>
          </div>
        </div>
      </main>
    );
  }

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?code=${activeRoom.code}`
      : "";

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">교사 대시보드</h1>
            <p className="text-xs text-white/50 mt-1">
              상태: <span className="text-purple-300">{statusLabel(activeRoom.status)}</span>
            </p>
          </div>
          {activeRoom.status === "playing" && (
            <button
              onClick={handleEnd}
              className="bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-200 px-4 py-2 rounded-lg text-sm"
            >
              게임 강제 종료
            </button>
          )}
        </div>

        {activeRoom.status === "lobby" && (
          <div className="space-y-6">
            {/* 게임 룰 패널 — 학생들에게 설명할 때 사용 */}
            <details open className="bg-white/5 border border-white/10 rounded-2xl">
              <summary className="cursor-pointer px-5 py-3 flex items-center justify-between hover:bg-white/5 rounded-2xl select-none">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📖</span>
                  <span className="font-medium">게임 룰 설명 <span className="text-xs text-white/40">(학생들에게 보여주세요)</span></span>
                </div>
                <span className="text-xs text-white/40">▼ 펼치기/접기</span>
              </summary>
              <div className="px-5 pb-5">
                <RulesPanel />
              </div>
            </details>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* QR + 코드 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <p className="text-sm text-white/60 mb-2">학생들에게 보여주세요</p>
                <div className="text-5xl font-bold font-mono tracking-[0.3em] my-3 text-purple-300">
                  {activeRoom.code}
                </div>
                <div className="bg-white p-4 rounded-xl inline-block mt-2">
                  {joinUrl && <QRCodeSVG value={joinUrl} size={180} />}
                </div>
                <p className="text-xs text-white/40 mt-3 break-all">{joinUrl}</p>
              </div>

              {/* 입장한 학생 목록 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium">
                  입장한 학생 <span className="text-purple-300">{players.length}</span>명
                </h2>
                <button
                  onClick={handleStart}
                  disabled={players.length < 2}
                  className="bg-green-500 hover:bg-green-400 disabled:opacity-30 text-white font-medium px-5 py-2 rounded-lg text-sm"
                >
                  게임 시작 ▶
                </button>
              </div>

              {/* 카드 작성 진행률 — 삭제팀 예정자만 카드 만들기 */}
              <div className="mb-3 text-xs text-white/60 flex items-center gap-2">
                <span>📇 삭제팀 카드 작성:</span>
                <span className="text-green-300 font-medium">{playersWithCards.size}</span>
                <span>/</span>
                <span>{Math.min(DELETER_COUNT, players.length)}명</span>
                {players.length > 0 && (
                  <div className="flex-1 ml-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400 transition-all"
                      style={{
                        width: `${Math.min(100, (playersWithCards.size / Math.max(1, Math.min(DELETER_COUNT, players.length))) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {players.length === 0 && (
                  <p className="text-sm text-white/40 text-center py-8">
                    아직 입장한 학생이 없어요...
                  </p>
                )}
                {players.map((p, idx) => {
                  const deleterCnt = Math.min(DELETER_COUNT, players.length);
                  const willBeDeleter = idx < deleterCnt;
                  const hasCard = playersWithCards.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg"
                    >
                      <span className="text-[10px] text-white/40 tabular-nums w-5">#{idx + 1}</span>
                      <div className={`w-2 h-2 rounded-full ${willBeDeleter ? "bg-green-400" : "bg-red-400"}`} />
                      <span className="text-sm flex-1">{p.nickname}</span>
                      {willBeDeleter ? (
                        <span
                          className={`text-[10px] ${hasCard ? "text-green-300" : "text-white/30"}`}
                          title={hasCard ? "카드 등록 완료" : "카드 미작성"}
                        >
                          {hasCard ? "📇 ✓" : "📇 ⋯"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-red-300/50" title="유포자는 카드 작성 안 함">
                          🦠 대기
                        </span>
                      )}
                      <span className={`text-[10px] tracking-wider ${willBeDeleter ? "text-green-300/70" : "text-red-300/70"}`}>
                        {willBeDeleter ? "삭제팀" : "유포자"}
                      </span>
                    </div>
                  );
                })}
              </div>
              {players.length >= MIN_PLAYERS_TO_START && (
                <p className="text-xs text-white/40 mt-3 text-center">
                  먼저 들어온 {Math.min(DELETER_COUNT, players.length)}명 = 삭제팀 ·
                  나머지 {Math.max(0, players.length - DELETER_COUNT)}명 = 유포자
                </p>
              )}
            </div>
            </div>
          </div>
        )}

        {activeRoom.status === "playing" && (
          <div className="space-y-4">
            {/* BREACH 발생 배너 */}
            {activeRoom.breach_at ? (
              <div className="bg-red-500/15 border border-red-400/50 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-pulse">⚠</span>
                  <div>
                    <div className="text-red-300 font-bold tracking-wider text-sm">DATA BREACH 발생</div>
                    <div className="text-[11px] text-red-200/70">
                      {new Date(activeRoom.breach_at).toLocaleTimeString("ko-KR")} · 카드 2배 + 위치 재배치 완료
                    </div>
                  </div>
                </div>
              </div>
            ) : timeLeft > 0 && timeLeft < activeRoom.duration_seconds - 90 + 10 && timeLeft > activeRoom.duration_seconds - 90 - 10 ? (
              <div className="bg-amber-500/15 border border-amber-400/50 rounded-xl px-4 py-2 text-center">
                <span className="text-amber-300 text-sm font-medium animate-pulse">
                  ⚠ 곧 데이터 유출 사고가 발생합니다...
                </span>
              </div>
            ) : null}

            {/* 상단: 타이머 + 핵심 지표 */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3">
              {/* 큰 타이머 */}
              <div className={`rounded-2xl p-5 text-center border ${
                timeLeft < 60
                  ? "bg-red-500/15 border-red-400/40"
                  : "bg-white/5 border-white/10"
              }`}>
                <div className="text-[10px] text-white/50 tracking-[0.2em] mb-1">REMAINING</div>
                <div className={`text-5xl font-bold tabular-nums ${
                  timeLeft < 30 ? "text-red-300 animate-pulse" : timeLeft < 60 ? "text-amber-300" : "text-white"
                }`}>
                  {timeLeftStr}
                </div>
                <div className="text-[10px] text-white/40 mt-1">/ {Math.floor(activeRoom.duration_seconds / 60)}:00</div>
              </div>

              {/* 핵심 4지표 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat label="필드 정보" value={liveCardCount} color="text-blue-300" />
                <Stat label="총 복제" value={copyCount} color="text-red-300" />
                <Stat label="총 삭제" value={deleteCount} color="text-green-300" />
                <Stat label="영구 로그" value={logs.length} color="text-amber-300" />
              </div>
            </div>

            {/* 감염 단계 분포 + 진행률 바 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium tracking-wide">🦠 감염 단계 분포</h3>
                <span className="text-[10px] text-white/50">학생 카드 {Object.keys(copyByOrigin).length}개 기준</span>
              </div>
              {/* 진행률 바 — SAFE → WARNING → CRITICAL 비율 */}
              {Object.keys(copyByOrigin).length > 0 && (
                <div className="flex h-3 rounded-full overflow-hidden bg-black/50 mb-3">
                  <div className="bg-green-400 transition-all"
                    style={{ width: `${(safeCount / Object.keys(copyByOrigin).length) * 100}%` }} />
                  <div className="bg-amber-400 transition-all"
                    style={{ width: `${(warningCount / Object.keys(copyByOrigin).length) * 100}%` }} />
                  <div className="bg-red-400 transition-all animate-pulse"
                    style={{ width: `${(criticalCount / Object.keys(copyByOrigin).length) * 100}%` }} />
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    <span className="text-[10px] text-green-300 tracking-widest">SAFE</span>
                  </div>
                  <div className="text-2xl font-bold text-green-300 tabular-nums">{safeCount}</div>
                  <div className="text-[9px] text-white/40 mt-0.5">~9회 복제</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span className="text-[10px] text-amber-300 tracking-widest">WARNING</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-300 tabular-nums">{warningCount}</div>
                  <div className="text-[9px] text-white/40 mt-0.5">10회+ 복제</div>
                </div>
                <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                    <span className="text-[10px] text-red-300 tracking-widest">CRITICAL</span>
                  </div>
                  <div className="text-2xl font-bold text-red-300 tabular-nums">{criticalCount}</div>
                  <div className="text-[9px] text-white/40 mt-0.5">20회+ 복제</div>
                </div>
              </div>
            </div>

            {/* 학생 화면 관전 (선생님이 실시간으로 게임 필드 보기) */}
            <TeacherFieldView cards={liveCards} copyByOrigin={copyByOrigin} />

            {/* 양 팀 + Top 3 + 최근 로그 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 가장 위험한 카드 Top 3 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h3 className="text-sm font-medium tracking-wide mb-3">🚨 가장 위험한 카드 Top 3</h3>
                {topInfected.length === 0 || topInfected[0].count === 0 ? (
                  <p className="text-xs text-white/40 text-center py-6">아직 복제된 카드가 없어요</p>
                ) : (
                  <div className="space-y-2">
                    {topInfected.map((t, i) => (
                      <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                        t.count >= 20 ? "bg-red-500/15 border border-red-400/40"
                        : t.count >= 10 ? "bg-amber-500/15 border border-amber-400/40"
                        : "bg-green-500/10 border border-green-400/30"
                      }`}>
                        <span className="text-sm flex items-center gap-2">
                          <span className="text-base">{["🥇","🥈","🥉"][i]}</span>
                          <span>{t.name}</span>
                        </span>
                        <span className={`text-sm font-bold tabular-nums ${
                          t.count >= 20 ? "text-red-300"
                          : t.count >= 10 ? "text-amber-300"
                          : "text-green-300"
                        }`}>
                          ×{t.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 실시간 활동 피드 */}
              <div className="bg-black/40 border border-green-500/30 rounded-2xl p-4 font-mono">
                <h3 className="text-sm font-medium tracking-wide mb-2 text-green-300">📡 실시간 활동</h3>
                <div className="space-y-1 text-[11px]">
                  {recentLogs.length === 0 ? (
                    <p className="text-white/40 text-center py-6 font-sans text-xs">아직 활동이 없어요</p>
                  ) : recentLogs.map((l) => {
                    const time = new Date(l.created_at).toLocaleTimeString("ko-KR", { hour12: false });
                    const isDelete = l.action === "DELETE";
                    const isCopy = l.action === "COPY";
                    const color = isDelete ? "text-red-400" : isCopy ? "text-amber-400" : "text-green-400";
                    const name = (l.payload as any)?.name ?? "";
                    return (
                      <div key={l.id} className={`${color} truncate`}>
                        [{time}] {l.action.padEnd(7)} {name}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 팀 패널 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RolePanel title="🛡 삭제팀" count={deleterCount} players={players.filter(p => p.role === "deleter")} accent="blue" />
              <RolePanel title="🦠 유포자" count={spreaderCount} players={players.filter(p => p.role === "spreader")} accent="red" />
            </div>
          </div>
        )}

        {activeRoom.status === "ended" && (
          <div className="space-y-4">
            <ResultsView
              cards={cards}
              logs={logs}
              durationSec={activeRoom.duration_seconds}
              myRole={null}
            />
            <div className="text-center">
              <button
                onClick={handleCreate}
                className="bg-purple-500 hover:bg-purple-400 text-white font-medium px-6 py-2 rounded-lg"
              >
                새 게임 시작
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function statusLabel(s: string) {
  return { lobby: "대기 중", playing: "진행 중", ended: "종료됨" }[s] ?? s;
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
      <div className="text-xs text-white/50">{label}</div>
      <div className={`text-2xl font-bold ${color} tabular-nums`}>{value}</div>
    </div>
  );
}

function RolePanel({
  title, count, players, accent,
}: { title: string; count: number; players: any[]; accent: "red" | "blue" }) {
  const accentClass = accent === "red"
    ? "border-red-400/30 bg-red-500/10"
    : "border-blue-400/30 bg-blue-500/10";
  return (
    <div className={`border rounded-xl p-4 ${accentClass}`}>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-medium">{title}</h3>
        <span className="text-2xl font-bold">{count}</span>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto text-sm">
        {players.map((p) => (
          <div key={p.id} className="bg-black/20 px-2 py-1 rounded">
            {p.nickname}
          </div>
        ))}
      </div>
    </div>
  );
}
