"use client";

import { useEffect, useState } from "react";
import { DELETE_PROTECTION_MS, STAGE_STYLES, STAGE_LABEL, type InfectionStage } from "@/lib/constants";
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

  // 보호 시간 계산 — 본인 카드 + 삭제팀에게만 의미 있음
  const [protectionRemaining, setProtectionRemaining] = useState<number>(() => {
    const age = Date.now() - new Date(card.created_at).getTime();
    return Math.max(0, DELETE_PROTECTION_MS - age);
  });

  useEffect(() => {
    const age = Date.now() - new Date(card.created_at).getTime();
    if (age >= DELETE_PROTECTION_MS) return;  // 이미 보호 끝났으면 interval 안 만듦

    const id = setInterval(() => {
      const currentAge = Date.now() - new Date(card.created_at).getTime();
      const left = Math.max(0, DELETE_PROTECTION_MS - currentAge);
      setProtectionRemaining(left);
      if (left <= 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [card.created_at]);

  const isProtected = protectionRemaining > 0;
  // 본인 카드일 때만 보호 표시가 의미 있음 (다른 사람 카드 클릭은 어차피 안 됨)
  const showProtection = isMine && isProtected;

  // 숨김 카드는 투명도 낮춤 (검색에 걸리면 다시 보임)
  // focusMine 모드: 내 카드가 아니면 반투명, 내 카드는 100% 진하게
  let opacity = 1;
  if (card.hidden && !searchHit) opacity = 0.08;
  else if (focusMine && !isMine) opacity = 0.15;

  // 내 카드는 강하게 강조 + 항상 맨 위 (z-index)
  // 보호 중이면 호박색 ring(아직 못 지움), 보호 끝나면 흰색 ring(지울 수 있음)
  const mineRing = isMine
    ? (showProtection
        ? "ring-2 ring-amber-300/80 ring-offset-2 ring-offset-black"
        : "ring-[3px] ring-white shadow-[0_0_24px_rgba(255,255,255,0.8)]")
    : "";
  const hitRing = searchHit ? "ring-2 ring-yellow-300 ring-offset-1 ring-offset-black" : "";
  const pulse = stage === "critical" ? "animate-pulse" : "";
  const protectedCursor = showProtection ? "cursor-not-allowed" : "cursor-pointer";

  // z-index 계층 (높을수록 위)
  //   1000: 내 카드 (절대 맨 위 — 다른 카드에 묻히지 않도록)
  //    500: 검색에 걸린 카드
  //      1: 일반 카드
  const zIndex = isMine ? 1000 : searchHit ? 500 : 1;

  // 내 카드는 살짝 크게 (15% 키움) — 더 잘 보이게
  const scaleClass = isMine ? "scale-[1.15]" : "";

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        if (showProtection) return;  // 보호 중이면 클릭 무시
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
      className={`absolute -translate-x-1/2 -translate-y-1/2 ${protectedCursor}
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

      {/* 보호 시간 카운트다운 - 본인 카드일 때만 */}
      {showProtection && (
        <div className="absolute -top-2 -right-2 bg-black border border-amber-400/60 rounded-full
          w-7 h-7 flex items-center justify-center text-[10px] font-bold text-amber-300
          shadow-[0_0_8px_rgba(251,191,36,0.5)] tabular-nums">
          {Math.ceil(protectionRemaining / 1000)}
        </div>
      )}
    </div>
  );
}
