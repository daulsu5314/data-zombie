"use client";

import type { PlayerRole } from "@/types";

interface Props {
  /** 역할이 정해진 경우 그 역할에 맞는 행동 가이드 강조 */
  role?: PlayerRole | null;
  /** 예정 역할 (대기 중에 미리 보여줄 때) */
  expectedRole?: PlayerRole | null;
}

export function RulesPanel({ role, expectedRole }: Props) {
  const myRole = role ?? expectedRole ?? null;
  const isDeleter = myRole === "deleter";
  const isSpreader = myRole === "spreader";

  return (
    <div className="bg-black/40 border border-red-400/30 rounded-xl overflow-hidden font-mono">
      {/* 헤더 */}
      <div className="bg-red-500/10 px-4 py-2 border-b border-red-400/20 flex items-center justify-between">
        <span className="text-red-300 text-xs tracking-[0.2em]">▸ MISSION_BRIEFING</span>
        <span className="text-[10px] text-red-300/50 tracking-widest">3:00 TIMER</span>
      </div>

      <div className="p-4 space-y-3 text-sm">
        {/* 게임 목표 */}
        <div>
          <div className="text-[11px] text-amber-300/80 tracking-[0.15em] mb-1">// OBJECTIVE</div>
          <p className="text-white/80 leading-relaxed">
            디지털 공간에 떠다니는 개인정보 카드를{" "}
            <span className="text-green-300">지키거나(삭제팀)</span> /{" "}
            <span className="text-red-300">퍼뜨리는(유포자)</span> 3분짜리 사투
          </p>
        </div>

        {/* 양 팀 액션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
          {/* 삭제팀 */}
          <div className={`rounded-lg p-3 border ${
            isDeleter ? "bg-green-500/15 border-green-400/60" : "bg-white/[0.02] border-white/10"
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs tracking-wider ${isDeleter ? "text-green-300" : "text-green-300/60"}`}>
                🛡 PURGE TEAM
              </span>
              {isDeleter && (
                <span className="text-[9px] bg-green-500/30 text-green-200 px-1.5 py-0.5 rounded tracking-widest">YOU</span>
              )}
            </div>
            <div className="text-[11px] text-white/70 leading-relaxed space-y-0.5">
              <div>• 화면에서 <b className="text-white">내 카드만</b> 클릭해서 삭제</div>
              <div>• 다른 친구 카드는 클릭 안 됨</div>
              <div>• ⏱ <b className="text-amber-300">카드 생성 후 5초간 삭제 불가</b> (보호 시간)</div>
              <div>• 🔍 검색창으로 숨겨진 내 정보 찾기</div>
              <div className="text-green-300/80 pt-1">
                🎯 3분 안에 내 카드 전부 0개 만들기
              </div>
            </div>
          </div>

          {/* 유포자 */}
          <div className={`rounded-lg p-3 border ${
            isSpreader ? "bg-red-500/15 border-red-400/60" : "bg-white/[0.02] border-white/10"
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs tracking-wider ${isSpreader ? "text-red-300" : "text-red-300/60"}`}>
                🦠 INFECTED
              </span>
              {isSpreader && (
                <span className="text-[9px] bg-red-500/30 text-red-200 px-1.5 py-0.5 rounded tracking-widest">YOU</span>
              )}
            </div>
            <div className="text-[11px] text-white/70 leading-relaxed space-y-0.5">
              <div>• 카드 <b className="text-white">클릭</b>해서 복제</div>
              <div>• 한 번에 <b className="text-white">2개</b>로 복제 (펑!)</div>
              <div>• ⚡ <b className="text-amber-300">처음 5초가 황금시간</b> (이때 삭제 불가)</div>
              <div>• 내가 만든 카드는 복제 불가</div>
              <div className="text-red-300/80 pt-1">
                🎯 3분 뒤 필드에 1개라도 남기기
              </div>
            </div>
          </div>
        </div>

        {/* 감염 단계 색상 */}
        <div className="pt-2 border-t border-white/10">
          <div className="text-[11px] text-amber-300/80 tracking-[0.15em] mb-2">// INFECTION_STAGE</div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              <span className="text-green-300">SAFE</span>
              <span className="text-white/40">~9회</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-amber-300">WARNING</span>
              <span className="text-white/40">10회+</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
              <span className="text-red-300">CRITICAL</span>
              <span className="text-white/40">20회+</span>
            </div>
          </div>
          <p className="text-[10px] text-white/40 mt-2">
            같은 카드가 복제될수록 색이 바뀌어요 (CRITICAL은 깜빡임)
          </p>
        </div>

        {/* 돌발 이벤트 안내 */}
        <div className="pt-2 border-t border-white/10">
          <div className="text-[11px] text-red-400/90 tracking-[0.15em] mb-1">// ⚠ BREACH_EVENT</div>
          <p className="text-[11px] text-white/70 leading-relaxed">
            <b className="text-red-300">1분 30초 경과 시 데이터 유출 사고 발생!</b>
            <br />→ 모든 카드 위치가 무작위로 흩어지고, <b className="text-red-300">전체 카드 수가 2배</b>로 늘어나요
          </p>
        </div>

        {/* 영구 로그 경고 */}
        <div className="pt-2 border-t border-white/10">
          <div className="text-[11px] text-amber-300/80 tracking-[0.15em] mb-1">// QUARANTINE_LOG</div>
          <p className="text-[11px] text-white/60 leading-relaxed">
            ⚠ 화면에서 지워도 <b className="text-amber-300">서버 로그</b>에는 영구히 기록돼요.
            게임 중 [📜 서버 로그] 탭에서 확인 가능
          </p>
        </div>
      </div>
    </div>
  );
}
