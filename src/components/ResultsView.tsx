"use client";

import { computeStats, type GameStats } from "@/lib/game";
import type { Card, LogEntry, PlayerRole } from "@/types";

interface Props {
  cards: Card[];
  logs: LogEntry[];
  durationSec: number;
  myRole: PlayerRole | null;
}

export function ResultsView({ cards, logs, durationSec, myRole }: Props) {
  const stats: GameStats = computeStats(cards, logs, durationSec);
  const iWon =
    (myRole === "spreader" && stats.spreadersWon) ||
    (myRole === "deleter" && !stats.spreadersWon);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="text-6xl mb-2">{stats.spreadersWon ? "🧟" : "🛡️"}</div>
        <h1 className="text-3xl font-bold">
          {stats.spreadersWon ? "유포자의 승리" : "삭제팀의 승리"}
        </h1>
        <p className="text-white/60 mt-2 text-sm">
          {stats.spreadersWon
            ? `필드에 ${stats.remaining}개의 정보가 좀비처럼 살아남았습니다.`
            : "필드는 깨끗해졌습니다. 그런데... 서버 로그는요?"}
        </p>
        {myRole && (
          <div className={`inline-block mt-3 text-xs px-3 py-1 rounded-full ${
            iWon ? "bg-green-500/20 text-green-200" : "bg-white/10 text-white/60"
          }`}>
            나는 {myRole === "spreader" ? "유포자" : "삭제팀"} — {iWon ? "이겼어요 🎉" : "졌어요"}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="남은 정보" value={stats.remaining} color="text-white" />
        <StatCard label="총 복제" value={stats.totalCopies} color="text-red-300" />
        <StatCard label="총 삭제" value={stats.totalDeletes} color="text-blue-300" />
        <StatCard label="영구 로그" value={stats.logEntries} color="text-amber-300" />
      </div>

      {/* Top 3: 누적 복제 횟수 (영구 로그 기준) */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-medium mb-1">🏆 가장 많이 복제된 정보 Top 3 <span className="text-white/40 text-xs">(누적 복제 횟수)</span></h2>
        <p className="text-[11px] text-white/40 mb-3">3분 동안 유포자들이 가장 많이 클릭한 카드 — 지워져도 카운트는 그대로 (영구 로그)</p>
        {stats.topCopied.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-4">
            복제 기록이 없습니다
          </p>
        ) : (
          <div className="space-y-2">
            {stats.topCopied.map((t, i) => {
              const medalColors = ["bg-yellow-400/15 border-yellow-400/50", "bg-gray-400/15 border-gray-400/50", "bg-orange-400/15 border-orange-400/50"];
              return (
                <div
                  key={`copied-${t.name}-${i}`}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border ${medalColors[i] ?? "bg-black/30"}`}
                >
                  <span className="text-base flex items-center gap-2">
                    <span className="text-2xl">{["🥇", "🥈", "🥉"][i]}</span>
                    <span className="font-medium">{t.name}</span>
                  </span>
                  <span className="text-base font-bold text-red-300 tabular-nums">
                    {t.count}회 복제됨
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top 3: 게임 종료 시점에 살아남은 카드 */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-medium mb-1">📍 화면에 가장 많이 남은 정보 Top 3 <span className="text-white/40 text-xs">(살아남은 카드)</span></h2>
        <p className="text-[11px] text-white/40 mb-3">게임 종료 시점에 화면에서 못 지운 카드 — 삭제팀이 결국 못 막은 정보</p>
        {stats.topRemaining.length === 0 ? (
          <p className="text-sm text-green-300 text-center py-4">
            모든 카드가 지워졌습니다! 🎉
          </p>
        ) : (
          <div className="space-y-2">
            {stats.topRemaining.map((t, i) => {
              const medalColors = ["bg-red-400/15 border-red-400/50", "bg-amber-400/15 border-amber-400/50", "bg-orange-400/15 border-orange-400/50"];
              return (
                <div
                  key={`remaining-${t.name}-${i}`}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border ${medalColors[i] ?? "bg-black/30"}`}
                >
                  <span className="text-base flex items-center gap-2">
                    <span className="text-2xl">{["🥇", "🥈", "🥉"][i]}</span>
                    <span className="font-medium">{t.name}</span>
                  </span>
                  <span className="text-base font-bold text-amber-300 tabular-nums">
                    {t.count}개 살아남음
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-medium text-amber-200 mb-2">💡 오늘의 교훈</h2>
        <p className="text-sm text-amber-100/90 leading-relaxed">
          한 번 삭제하는 데 평균{" "}
          <b>{(stats.avgDeleteMs / 1000).toFixed(2)}초</b>, 한 번 복제하는 데 평균{" "}
          <b>{(stats.avgCopyMs / 1000).toFixed(2)}초</b>가 걸렸어요.
          <br />
          화면에서는 사라졌어도 서버 로그에는{" "}
          <b>{stats.logEntries}개</b>의 흔적이 그대로 남아있어요.
          <br />
          <span className="text-red-300/90 text-xs mt-2 inline-block">
            💭 위 두 표를 비교해보세요. 같은 이름이라도 <b>복제된 횟수</b>와 <b>화면에 남은 개수</b>가 다르죠?
            지워도 서버 로그에는 그대로 남는다는 뜻이에요.
          </span>
          <br />
          <span className="text-red-300 font-medium mt-2 inline-block">
            "지우는 데 3분이 걸렸지만, 복제하는 데는 0.1초도 안 걸렸습니다."
          </span>
        </p>
      </div>

    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
      <div className="text-[11px] text-white/50">{label}</div>
      <div className={`text-2xl font-bold ${color} tabular-nums mt-0.5`}>{value}</div>
    </div>
  );
}
