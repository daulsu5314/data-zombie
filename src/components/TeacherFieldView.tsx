"use client";

import { getInfectionStage, STAGE_STYLES } from "@/lib/constants";
import type { Card } from "@/types";

interface Props {
  cards: Card[];           // 살아있는 카드만 전달
  copyByOrigin: Record<string, { count: number; name: string }>;
}

/**
 * 교사용 관전 필드 — 학생들 화면과 동일한 카드 배치를 표시
 * 클릭 불가 (읽기 전용)
 */
export function TeacherFieldView({ cards, copyByOrigin }: Props) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium tracking-wide">🖥 학생 화면 관전 (실시간)</h3>
        <span className="text-[11px] text-white/50 font-mono">{cards.length} cards · 클릭 불가</span>
      </div>

      <div
        className="relative w-full h-[640px] field-bg bg-black/40 border border-white/10 rounded-xl overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(139,0,0,0.15) 0%, transparent 40%), " +
            "radial-gradient(circle at 80% 70%, rgba(0,80,30,0.12) 0%, transparent 40%), " +
            "repeating-linear-gradient(0deg, rgba(0,255,80,0.03) 0px, rgba(0,255,80,0.03) 1px, transparent 1px, transparent 4px)",
        }}
      >
        {cards.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">
            아직 정보가 없습니다
          </div>
        )}

        {cards.map((c) => {
          const cnt = copyByOrigin[c.origin_id]?.count ?? 0;
          const stage = getInfectionStage(cnt);
          const s = STAGE_STYLES[stage];
          const opacity = c.hidden ? 0.35 : 1;
          const pulse = stage === "critical" ? "animate-pulse" : "";
          // CRITICAL이 위로 오게 z-index
          const z = stage === "critical" ? 30 : stage === "warning" ? 20 : 10;

          return (
            <div
              key={c.id}
              style={{
                left: `${c.x}%`,
                top: `${c.y}%`,
                opacity,
                zIndex: z,
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2
                ${s.bg} ${s.border} ${s.text} ${pulse}
                border rounded px-2 py-1 min-w-[80px]
                font-mono pointer-events-none select-none`}
            >
              <div className={`text-[11px] font-medium ${s.nameColor} truncate max-w-[110px]`}>
                ▸ {c.name}
              </div>
              <div className="text-[9px] opacity-70">생일: {c.birthday}</div>
              <div className="text-[9px] opacity-70 truncate max-w-[110px]">취미: {c.hobby}</div>
              {cnt > 0 && (
                <div className={`text-[9px] font-medium ${s.nameColor} mt-0.5`}>
                  ×{cnt} {stage === "critical" ? "🔥" : stage === "warning" ? "⚠" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] text-white/40 mt-2">
        <span>💡 학생들의 디지털 공간을 실시간으로 봅니다</span>
        <span className="font-mono">
          🟢 SAFE · 🟡 WARNING · 🔴 CRITICAL (깜빡임)
        </span>
      </div>
    </div>
  );
}
