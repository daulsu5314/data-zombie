// 게임 밸런스 상수 — 교실 상황에 맞게 조정하세요

export const GAME_DURATION_SECONDS = 180;      // 3분

// 삭제팀 고정 인원 — 먼저 접속한 N명이 삭제팀, 나머지는 모두 유포자
// 학급 인원수가 달라도 삭제팀 인원은 항상 동일
// 예: 25명 → 13 삭제팀 + 12 유포자 / 28명 → 13 삭제팀 + 15 유포자
export const DELETER_COUNT = 13;

// 최소 인원 (이보다 적으면 게임 시작 불가)
export const MIN_PLAYERS_TO_START = 2;

// 게임 시작 후 모든 카드 삭제 불가 시간 (밀리초)
// 시작 5초 동안 카오스 — 유포자가 마음껏 복제 가능
// 5초 후부터는 즉시 삭제 가능 (보호 표시 없음)
export const GAME_START_GRACE_MS = 5000;

// 카드 작성 개수
export const CARDS_PER_PLAYER = 1;

// 복제 규칙 — 한 번 클릭에 2~3개 랜덤 복제
export const COPY_BURST_MIN = 2;
export const COPY_BURST_MAX = 3;
export const COPY_HIDDEN_PROBABILITY = 0.2;
export const COPY_COOLDOWN_MS = 300;

// 최대 카드 수 (서버 부하 방지)
export const MAX_FIELD_CARDS = 800;

// ============================================
// 감염 단계 (Infection Stage) — 복제 횟수로 카드 색상 결정
// 같은 origin_id를 가진 살아있는 복제본 개수 기준
// 클릭 1번 = 복제 2개 → 약 5번 클릭에 WARNING, 10번 클릭에 CRITICAL
// ============================================
export type InfectionStage = "safe" | "warning" | "critical";

export function getInfectionStage(copyCount: number): InfectionStage {
  if (copyCount >= 20) return "critical";
  if (copyCount >= 10) return "warning";
  return "safe";
}

// 좀비 톤에 맞춘 색상 — 초록(안전) → 노랑(경고) → 빨강(위험)
export const STAGE_STYLES: Record<InfectionStage, {
  bg: string; border: string; text: string; nameColor: string; glow: string;
}> = {
  safe: {
    bg: "bg-green-500/10",
    border: "border-green-400/50",
    text: "text-green-100",
    nameColor: "text-green-300",
    glow: "shadow-[0_0_8px_rgba(34,197,94,0.3),inset_0_0_12px_rgba(34,197,94,0.1)]",
  },
  warning: {
    bg: "bg-amber-500/15",
    border: "border-amber-400/60",
    text: "text-amber-100",
    nameColor: "text-amber-300",
    glow: "shadow-[0_0_10px_rgba(251,191,36,0.4),inset_0_0_14px_rgba(251,191,36,0.15)]",
  },
  critical: {
    bg: "bg-red-500/15",
    border: "border-red-400/70",
    text: "text-red-100",
    nameColor: "text-red-300",
    glow: "shadow-[0_0_12px_rgba(239,68,68,0.5),inset_0_0_16px_rgba(239,68,68,0.2)]",
  },
};

export const STAGE_LABEL: Record<InfectionStage, string> = {
  safe: "SAFE",
  warning: "WARNING",
  critical: "CRITICAL",
};
