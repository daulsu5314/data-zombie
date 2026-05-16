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

/**
 * z-index 계층 (높을수록 위)
 *
 * 삭제팀 시점:
 *   1000: 내 카드 (절대 맨 위)
 *    500: 검색 히트
 *      1: 일반 카드
 *
 * 유포자 시점:
 *   1000: 검색 히트 (없음, 검색 자체가 삭제팀 기능)
 *    300: SAFE 카드 (가장 가치 있는 타겟)
 *    200: WARNING 카드
 *    100: CRITICAL 카드 (이미 많이 퍼져서 우선순위 낮음)
 *      1: 기타
 */
function getZIndex(isMine: boolean, searchHit: boolean, amSpreader: boolean, stage: InfectionStage): number {
  if (!amSpreader) {
    // 삭제팀
    if (isMine) return 1000;
    if (searchHit) return 500;
    return 1;
  }
  // 유포자: 덜 감염된 카드(SAFE)일수록 위로
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
  let opacity = 1;
  if (card.hidden && !searchHit) opacity = 0.08;
  else if (focusMine && !isMine) opacity = 0.15;

  // 내 카드 강조 (흰 ring)
  const mineRing = isMine
    ? "ring-[3px] ring-white shadow-[0_0_24px_rgba(255,255,255,0.8)]"
    : "";
  const hitRing = searchHit ? "ring-2 ring-yellow-300 ring-offset-1 ring-offset-black" : "";

  // CRITICAL은 펄스 — 단, 박스 자체가 아니라 inner glow에만 적용해서 클릭 영역 유지
  const pulse = stage === "critical" ? "card-critical-pulse" : "";

  const zIndex = getZIndex(isMine, searchHit, amSpreader, stage);
  const scaleClass = isMine ? "scale-[1.15]" : "";

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
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
      }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer
        ${s.bg} ${s.border} ${s.text} ${s.glow} ${mineRing} ${hitRing} ${pulse} ${scaleClass}
        border rounded-md px-3 py-2 min-w-[130px] backdrop-blur-sm
        animate-pop-in hover:scale-125 select-none font-mono`}
    >
      <div className="flex items-center justify-between mb-0.5">
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
      <div className="text-[10px] opacity-90">생일: {card.birthday}</div>
      <div className="text-[10px] opacity-90">취미: {card.hobby}</div>
      {copyCount > 0 && (
        <div className={`text-[9px] opacity-80 mt-0.5 tracking-wider ${s.nameColor}`}>
          ×{copyCount} {stage === "critical" ? "PANDEMIC" : stage === "warning" ? "SPREADING" : ""}
        </div>
      )}
    </div>
  );
}

/**
 * memo로 깜빡임 방지 — 부모 리렌더가 자주 일어나도 props가 같으면 리렌더 안 함
 */
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
