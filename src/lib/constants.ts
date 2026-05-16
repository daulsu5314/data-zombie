// 게임 밸런스 상수 — 교실 상황에 맞게 조정하세요

export const GAME_DURATION_SECONDS = 180;      // 3분

// 삭제팀 고정 인원 — 먼저 접속한 N명이 삭제팀, 나머지는 모두 유포자
// 학급 인원수가 달라도 삭제팀 인원은 항상 동일
// 예: 25명 → 13 삭제팀 + 12 유포자 / 28명 → 13 삭제팀 + 15 유포자
export const DELETER_COUNT = 13;

// 최소 인원 (이보다 적으면 게임 시작 불가)
export const MIN_PLAYERS_TO_START = 2;

// 게임 시작 후 모든 카드 삭제 불가 시간 (밀리초)
// 시작 10초 동안 카오스 — 유포자가 마음껏 복제 가능
// 10초 후부터는 즉시 삭제 가능 (보호 표시 없음)
export const GAME_START_GRACE_MS = 10000;

// 카드 작성 개수
export const CARDS_PER_PLAYER = 1;

// 복제 규칙 — 한 번 클릭에 정확히 2개씩 복제
export const COPY_BURST_COUNT = 2;
// 새로 생성되는 카드가 숨김 상태일 확률
// 80% → 대부분 카드가 숨겨져 있고, 검색해야만 보임
// 정보가 어디 떠다니는지 모르는 채로 존재하는 현실 비유
export const COPY_HIDDEN_PROBABILITY = 0.8;
export const COPY_COOLDOWN_MS = 500;

// 최대 카드 수 (서버/브라우저 부하 방지)
// 800 → 500: 게임 후반 버벅임 줄임
export const MAX_FIELD_CARDS = 500;

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
    bg: "bg-green-500/30",
    border: "border-green-400/80",
    text: "text-green-50",
    nameColor: "text-green-200",
    glow: "shadow-[0_0_10px_rgba(34,197,94,0.5),inset_0_0_14px_rgba(34,197,94,0.2)]",
  },
  warning: {
    bg: "bg-amber-500/35",
    border: "border-amber-400/90",
    text: "text-amber-50",
    nameColor: "text-amber-200",
    glow: "shadow-[0_0_12px_rgba(251,191,36,0.6),inset_0_0_16px_rgba(251,191,36,0.25)]",
  },
  critical: {
    bg: "bg-red-500/35",
    border: "border-red-400",
    text: "text-red-50",
    nameColor: "text-red-200",
    glow: "shadow-[0_0_14px_rgba(239,68,68,0.7),inset_0_0_18px_rgba(239,68,68,0.3)]",
  },
};

export const STAGE_LABEL: Record<InfectionStage, string> = {
  safe: "SAFE",
  warning: "WARNING",
  critical: "CRITICAL",
};
