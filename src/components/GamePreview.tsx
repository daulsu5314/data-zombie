"use client";

/**
 * 게임 화면 미리보기 — 선생님이 학생들에게 설명할 때 보여주는 시각 예시
 * 실제 게임 카드와 동일한 스타일로 SAFE/WARNING/CRITICAL/MINE 보여줌
 */
export function GamePreview() {
  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-4">
      <div className="text-[11px] text-amber-300/80 tracking-[0.15em] mb-3 font-mono">
        // PREVIEW :: 실제 게임 화면 예시
      </div>

      <div
        className="relative w-full h-[240px] rounded-lg overflow-hidden"
        style={{
          backgroundColor: "#0a0505",
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(139,0,0,0.15) 0%, transparent 40%), " +
            "radial-gradient(circle at 80% 70%, rgba(0,80,30,0.12) 0%, transparent 40%), " +
            "repeating-linear-gradient(0deg, rgba(0,255,80,0.03) 0px, rgba(0,255,80,0.03) 1px, transparent 1px, transparent 4px)",
        }}
      >
        {/* SAFE 카드 — 초록 */}
        <div className="absolute left-[8%] top-[18%] bg-green-500/10 border border-green-400/50 rounded px-2 py-1.5 font-mono"
          style={{ boxShadow: "0 0 8px rgba(34,197,94,0.3)" }}>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[11px] font-medium text-green-300">▸ 김지우</span>
            <span className="text-[8px] tracking-widest opacity-70 text-green-300">SAFE</span>
          </div>
          <div className="text-[9px] opacity-75 text-green-100">생일: 0315</div>
          <div className="text-[9px] opacity-75 text-green-100">취미: 댄스</div>
        </div>

        {/* WARNING 카드 — 노랑 */}
        <div className="absolute left-[35%] top-[12%] bg-amber-500/15 border border-amber-400/60 rounded px-2 py-1.5 font-mono"
          style={{ boxShadow: "0 0 10px rgba(251,191,36,0.4)" }}>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[11px] font-medium text-amber-300">▸ 박서준</span>
            <span className="text-[8px] tracking-widest opacity-70 text-amber-300">WARNING</span>
          </div>
          <div className="text-[9px] opacity-75 text-amber-100">생일: 0721</div>
          <div className="text-[9px] opacity-75 text-amber-100">취미: 축구</div>
          <div className="text-[8px] opacity-60 mt-0.5 text-amber-300">×12 SPREADING</div>
        </div>

        {/* CRITICAL 카드 — 빨강 + 펄스 */}
        <div className="absolute left-[62%] top-[18%] bg-red-500/15 border border-red-400/70 rounded px-2 py-1.5 font-mono animate-pulse"
          style={{ boxShadow: "0 0 12px rgba(239,68,68,0.5)" }}>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[11px] font-medium text-red-300">▸ 이하늘</span>
            <span className="text-[8px] tracking-widest opacity-70 text-red-300">CRITICAL</span>
          </div>
          <div className="text-[9px] opacity-75 text-red-100">생일: 1108</div>
          <div className="text-[9px] opacity-75 text-red-100">취미: 아이돌</div>
          <div className="text-[8px] opacity-60 mt-0.5 text-red-300">×24 PANDEMIC</div>
        </div>

        {/* 내 카드 (MINE) — 흰 테두리 + MINE 배지 */}
        <div className="absolute left-[20%] top-[58%] bg-green-500/10 border border-green-400/50 rounded px-2 py-1.5 font-mono"
          style={{
            boxShadow: "0 0 0 3px white, 0 0 20px rgba(255,255,255,0.6)",
            transform: "scale(1.1)",
          }}>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[11px] font-medium text-green-300">
              ▸ 최민호
              <span className="ml-1 text-[7px] bg-white text-black px-1 py-0.5 rounded tracking-widest align-middle">
                MINE
              </span>
            </span>
            <span className="text-[8px] tracking-widest opacity-70 text-green-300">SAFE</span>
          </div>
          <div className="text-[9px] opacity-75 text-green-100">생일: 0502</div>
          <div className="text-[9px] opacity-75 text-green-100">취미: 게임</div>
        </div>

        {/* 숨김 카드 (반투명) */}
        <div className="absolute left-[78%] top-[60%] bg-amber-500/15 border border-amber-400/60 rounded px-2 py-1.5 font-mono"
          style={{ opacity: 0.15 }}>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[11px] font-medium text-amber-300">▸ 한수민</span>
            <span className="text-[8px] tracking-widest opacity-70 text-amber-300">WARNING</span>
          </div>
          <div className="text-[9px] opacity-75 text-amber-100">생일: 0307</div>
          <div className="text-[9px] opacity-75 text-amber-100">취미: 책</div>
        </div>

        {/* Pop! 효과 */}
        <div className="absolute left-[48%] top-[42%] text-red-400 font-bold text-sm font-mono"
          style={{ textShadow: "0 0 8px rgba(239,68,68,0.8)" }}>
          Pop!
        </div>
      </div>

      {/* 범례 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400"></span>
          <span className="text-green-300">SAFE</span>
          <span className="text-white/40">아직 안전</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span className="text-amber-300">WARNING</span>
          <span className="text-white/40">10회+ 복제</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
          <span className="text-red-300">CRITICAL</span>
          <span className="text-white/40">20회+ 복제</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 bg-white rounded-sm border border-white"></span>
          <span className="text-white">MINE</span>
          <span className="text-white/40">내 카드 (흰 테두리)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="opacity-30">▸ 카드</span>
          <span className="text-white/40">숨김 (검색으로 발견)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-red-400 font-bold">Pop!</span>
          <span className="text-white/40">복제 효과</span>
        </div>
      </div>
    </div>
  );
}
