"use client";

import { STAGE_STYLES, STAGE_LABEL, type InfectionStage } from "@/lib/constants";
import type { Card } from "@/types";

interface Props {
  card: Card;
  stage: InfectionStage;     // 같은 origin의 총 복제 횟수로 결정된 단계
  copyCount: number;         // 디버그/표시용
  isMine: boolean;
  amSpreader: boolean;
  searchHit: boolean;
  /** 강조 모드: true면 내 카드 아닌 카드들을 반투명으로 */
  focusMine?: boolean;
  onClick: () => void;
  onContextMenu: () => void;
}

export function CardItem({
  card, stage, copyCount, isMine, amSpreader, searchHit, focusMine, onClick, onContextMenu,
}: Props) {
  const s = STAGE_STYLES[stage];

  // 숨김 카드는 투명도 낮춤 (검색에 걸리면 다시 보임)
  // focusMine 모드: 내 카드가 아니면 반투명
  let opacity = 1;
  if (card.hidden && !searchHit) opacity = 0.08;
  else if (focusMine && !isMine) opacity = 0.15;

  // 내 카드는 흰 ring + 빛 + 약간 크게 — 보호 시간 개념 없음
  const mineRing = isMine
    ? "ring-[3px] ring-white shadow-[0_0_24px_rgba(255,255,255,0.8)]"
    : "";
  const hitRing = searchHit ? "ring-2 ring-yellow-300 ring-offset-1 ring-offset-black" : "";
  const pulse = stage === "critical" ? "animate-pulse" : "";

  // z-index 계층
  //   1000: 내 카드 (절대 맨 위)
  //    500: 검색에 걸린 카드
  //      1: 일반 카드
  const zIndex = isMine ? 1000 : searchHit ? 500 : 1;
  const scaleClass = isMine ? "scale-[1.15]" : "";

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(); }}
      onTouchStart={(e) => {
        if (!amSpreader) return;
        const timer = setTimeout(() => onContextMenu(), 400);
        const cancel = () => clearTimeout(timer);
        e.currentTarget.addEventListener("touchend", cancel, { once: true });
        e.currentTarget.addEventListener("touchmove", cancel, { once: true });
      }}
      style={{
        left: `${card.x}%`,
        top: `${card.y}%`,
        opacity,
        zIndex,
        transition: "opacity 0.2s ease, box-shadow 0.3s ease",
      }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer
        ${s.bg} ${s.border} ${s.text} ${s.glow} ${mineRing} ${hitRing} ${pulse} ${scaleClass}
        border rounded-md px-3 py-2 min-w-[130px] backdrop-blur-sm
        animate-pop-in hover:scale-125 transition-transform select-none
        font-mono`}
    >
      <div className={`flex items-center justify-between mb-0.5`}>
        <span className={`text-sm font-medium tracking-wide ${s.nameColor}`}>
          ▸ {card.name}
          {isMine && (
            <span className="ml-1.5 text-[8px] bg-white text-black px-1 py-0.5 rounded tracking-widest align-middle">
              MINE
            </span>
          )}
        </span>
        <span className={`text-[8px] tracking-widest opacity-70 ${s.nameColor}`}>
          {STAGE_LABEL[stage]}
        </span>
      </div>
      <div className="text-[10px] opacity-75">생일: {card.birthday}</div>
      <div className="text-[10px] opacity-75">취미: {card.hobby}</div>
      {copyCount > 0 && (
        <div className="text-[9px] opacity-60 mt-0.5 tracking-wider">
          ×{copyCount} {stage === "critical" ? "PANDEMIC" : stage === "warning" ? "SPREADING" : ""}
        </div>
      )}
    </div>
  );
}
