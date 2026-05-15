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

      {stats.topCopied.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-medium mb-3">🏆 가장 많이 복제된 정보 Top 3</h2>
          <div className="space-y-2">
            {stats.topCopied.map((t, i) => (
              <div key={t.name} className="flex items-center justify-between bg-black/30 px-4 py-2.5 rounded-lg">
                <span className="text-sm">
                  {["🥇", "🥈", "🥉"][i]} {t.name}
                </span>
                <span className="text-sm font-medium text-red-300 tabular-nums">{t.count}회 복제</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <span className="text-red-300 font-medium mt-2 inline-block">
            "지우는 데 3분이 걸렸지만, 복제하는 데는 0.1초도 안 걸렸습니다."
          </span>
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-medium mb-3">🗣️ 토론 질문</h2>
        <ol className="text-sm text-white/80 space-y-2 list-decimal list-inside leading-relaxed">
          <li>유포자가 단 몇 명뿐인데 왜 삭제팀이 따라잡기 힘들었을까요?</li>
          <li>실제 SNS에서 누군가의 사진/말이 퍼졌다면, 어떻게 다를까요?</li>
          <li>"서버 로그"는 현실에서 무엇에 해당할까요? (캐시, 스크린샷, 백업, 검색엔진...)</li>
          <li>이 게임에서 가장 좋은 방어 전략은 무엇이었나요? 현실에서는요?</li>
        </ol>
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
