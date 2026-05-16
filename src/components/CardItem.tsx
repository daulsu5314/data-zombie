"use client";

import { memo } from "react";
import { STAGE_STYLES, STAGE_LABEL, type InfectionStage } from "@/lib/constants";
import type { Card } from "@/types";

interface Props {
  card: Card;
  stage: InfectionStage;
  copyCount: number;
  isMine: boolean;
  amSpreader: boolean;
  searchHit: boolean;
  focusMine?: boolean;
  onClick: () => void;
  onContextMenu: () => void;
}

function getZIndex(isMine: boolean, searchHit: boolean, amSpreader: boolean, stage: InfectionStage): number {
  if (!amSpreader) {
    if (isMine) return 1000;
    if (searchHit) return 500;
    return 1;
  }
  // 유포자: 덜 감염된 카드가 위로 (SAFE > WARNING > CRITICAL)
  if (stage === "safe") return 300;
  if (stage === "warning") return 200;
  if (stage === "critical") return 100;
  return 1;
}

function CardItemImpl({
  card, stage, copyCount, isMine, amSpreader, searchHit, focusMine, onClick, onContextMenu,
}: Props) {
  const s = STAGE_STYLES[stage];

  // opacity 계산
  // 숨김 + 검색에 안 걸림 → 거의 안 보임 (인터넷에서 정보의 존재를 모르는 상태)
  // 검색 매칭 시 → 또렷하게 (opacity 1, 노란 ring)
  // focusMine 모드: 내 카드 아니면 매우 흐리게
  let opacity = 1;
  if (card.hidden && !searchHit) {
    opacity = isMine ? 0.15 : 0.05;  // 거의 안 보임
  } else if (focusMine && !isMine) {
    opacity = 0.15;
  }

  const mineRing = isMine
    ? "ring-[3px] ring-white shadow-[0_0_24px_rgba(255,255,255,0.8)]"
    : "";
  const hitRing = searchHit ? "ring-2 ring-yellow-300 ring-offset-1 ring-offset-black" : "";
  const pulse = stage === "critical" ? "card-critical-pulse" : "";

  const zIndex = getZIndex(isMine, searchHit, amSpreader, stage);
  const scaleClass = isMine ? "scale-[1.15]" : "";

  // 카드 본문 클릭 = 카드 클릭으로 처리. 자식이 가로채지 못하게 pointer-events 제어.
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  return (
    <div
      onClick={handleClick}
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
        // 카드 hover scale 자체는 className에서 처리. 클릭 영역 안정성을 위해
        // 자식 요소의 pointer-events 차단 (자식 hover/animation이 클릭 가로채는 것 방지)
      }}
      className={`card-item absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer
        ${s.bg} ${s.border} ${s.text} ${s.glow} ${mineRing} ${hitRing} ${pulse} ${scaleClass}
        border rounded-md px-3 py-2 min-w-[130px] backdrop-blur-sm
        animate-pop-in hover:scale-125 select-none font-mono`}
    >
      {/* 자식 요소들 모두 pointer-events: none — 클릭은 무조건 부모 div에서 처리 */}
      <div className="flex items-center justify-between mb-0.5 pointer-events-none">
        <span className={`text-sm font-medium tracking-wide ${s.nameColor}`}>
          ▸ {card.name}
          {isMine && (
            <span className="ml-1.5 text-[8px] bg-white text-black px-1 py-0.5 rounded tracking-widest align-middle font-bold">
              MINE
            </span>
          )}
        </span>
        <span className={`text-[8px] tracking-widest opacity-90 ${s.nameColor}`}>
          {STAGE_LABEL[stage]}
        </span>
      </div>
      <div className="text-[10px] opacity-90 pointer-events-none">생일: {card.birthday}</div>
      <div className="text-[10px] opacity-90 pointer-events-none">취미: {card.hobby}</div>
      {copyCount > 0 && (
        <div className={`text-[9px] opacity-80 mt-0.5 tracking-wider pointer-events-none ${s.nameColor}`}>
          ×{copyCount} {stage === "critical" ? "PANDEMIC" : stage === "warning" ? "SPREADING" : ""}
        </div>
      )}
    </div>
  );
}

export const CardItem = memo(CardItemImpl, (prev, next) => {
  return (
    prev.card.id === next.card.id &&
    prev.card.x === next.card.x &&
    prev.card.y === next.card.y &&
    prev.card.hidden === next.card.hidden &&
    prev.card.deleted === next.card.deleted &&
    prev.stage === next.stage &&
    prev.copyCount === next.copyCount &&
    prev.isMine === next.isMine &&
    prev.amSpreader === next.amSpreader &&
    prev.searchHit === next.searchHit &&
    prev.focusMine === next.focusMine
  );
});
