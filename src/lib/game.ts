import { supabase } from "./supabase";
import {
  COPY_BURST_MIN,
  COPY_BURST_MAX,
  COPY_HIDDEN_PROBABILITY,
  MAX_FIELD_CARDS,
  DELETER_COUNT,
} from "./constants";
import type { Card, LogEntry, Player } from "@/types";

// ============================================
// 방 생성 / 조회 / 시작
// ============================================
export async function createRoom() {
  const { data: codeData, error: codeErr } = await supabase.rpc("generate_room_code");
  if (codeErr) throw codeErr;

  const { data, error } = await supabase
    .from("rooms")
    .insert({ code: codeData, status: "lobby" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRoomByCode(code: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .neq("status", "ended")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function joinRoom(roomId: string, nickname: string) {
  const { data, error } = await supabase
    .from("players")
    .insert({ room_id: roomId, nickname })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// 역할 자동 배정 (게임 시작 시 호출)
// 입장 순서 기반:
//   - 먼저 접속한 절반 → 삭제팀 (deleter)
//   - 나중에 접속한 절반 → 유포자 (spreader)
// 28명이면 13명 삭제팀 + 15명 유포자 (홀수면 유포자가 1명 더)
// 의도: 먼저 자기 정보를 등록한 학생이 자기 정보를 지킬 기회를 얻음
// ============================================
export async function assignRolesAndStart(roomId: string) {
  const { data: players, error } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });  // 입장 순서대로 정렬
  if (error) throw error;
  if (!players || players.length === 0) throw new Error("플레이어가 없습니다");

  // 먼저 접속한 절반 → 삭제팀
  // 먼저 접속한 DELETER_COUNT명 → 삭제팀
  // 나머지 전원 → 유포자
  // 인원이 DELETER_COUNT보다 적으면 전원 삭제팀, 유포자 0명
  const deleterCount = Math.min(DELETER_COUNT, players.length);

  const updates = players.map((p, i) => ({
    id: p.id,
    room_id: p.room_id,
    nickname: p.nickname,
    role: i < deleterCount ? "deleter" : "spreader",
  }));

  // 일괄 upsert
  const { error: upErr } = await supabase.from("players").upsert(updates);
  if (upErr) throw upErr;

  // 방 상태 업데이트
  const { error: roomErr } = await supabase
    .from("rooms")
    .update({ status: "playing", started_at: new Date().toISOString() })
    .eq("id", roomId);
  if (roomErr) throw roomErr;

  return { deleterCount, spreaderCount: players.length - deleterCount, totalCount: players.length };
}

export async function endRoom(roomId: string) {
  await supabase
    .from("rooms")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", roomId);
}

// 학생이 lobby에서 탭 닫을 때 자신을 제거 (게임 시작 후에는 유지)
export async function leaveRoom(playerId: string) {
  await supabase.from("players").delete().eq("id", playerId);
}

// ============================================
// 데이터 유출 사고 발동
// 모든 카드의 위치를 무작위로 변경 + 숨김 비율 증가
// 한 번만 발동 가능 (DB 함수에서 체크)
// ============================================
export async function triggerBreach(roomId: string) {
  const { error } = await supabase.rpc("trigger_data_breach", {
    target_room_id: roomId,
  });
  if (error) {
    console.error("Breach trigger failed:", error);
    throw error;
  }
}

// ============================================
// 카드 생성 (학생이 자기 카드 3개 등록)
// ============================================
export async function createOriginalCards(
  roomId: string,
  ownerId: string,
  cards: { name: string; hobby: string; birthday: string }[]
) {
  const rows = cards.map((c) => {
    const originId = crypto.randomUUID();
    return {
      room_id: roomId,
      owner_id: ownerId,
      origin_id: originId,
      name: c.name,
      hobby: c.hobby,
      birthday: c.birthday,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      is_original: true,
      copy_generation: 0,
    };
  });

  const { data, error } = await supabase.from("cards").insert(rows).select();
  if (error) throw error;

  // 로그
  if (data) {
    await supabase.from("log_entries").insert(
      data.map((c) => ({
        room_id: roomId,
        action: "CREATE",
        card_id: c.id,
        origin_id: c.origin_id,
        actor_id: ownerId,
        payload: { name: c.name, hobby: c.hobby, birthday: c.birthday },
      }))
    );
  }
  return data;
}

// ============================================
// 복제 (유포자 액션) — 핵심 로직
// 한 번 클릭으로 2~3개가 사방으로 튀어나감, 일부는 숨김 처리
// ============================================
export async function copyCard(card: Card, actorId: string, currentCardCount: number) {
  if (currentCardCount >= MAX_FIELD_CARDS) {
    return { copies: [], throttled: true };
  }

  // 클릭 1번에 2~3개 랜덤 복제
  const burst = COPY_BURST_MIN + Math.floor(Math.random() * (COPY_BURST_MAX - COPY_BURST_MIN + 1));
  const safeBurst = Math.min(burst, MAX_FIELD_CARDS - currentCardCount);

  const rows = [];
  for (let i = 0; i < safeBurst; i++) {
    // 화면 전체에 무작위로 흩뿌리기 (한 곳에 뭉치는 것 방지)
    // 가장자리는 살짝 피함 (5~95%)
    rows.push({
      room_id: card.room_id,
      owner_id: card.owner_id,
      origin_id: card.origin_id,
      name: card.name,
      hobby: card.hobby,
      birthday: card.birthday,
      x: 5 + Math.random() * 90,
      y: 5 + Math.random() * 90,
      hidden: Math.random() < COPY_HIDDEN_PROBABILITY,
      is_original: false,
      copy_generation: card.copy_generation + 1,
    });
  }

  const { data, error } = await supabase.from("cards").insert(rows).select();
  if (error) throw error;

  // 로그
  if (data) {
    await supabase.from("log_entries").insert(
      data.map((c) => ({
        room_id: card.room_id,
        action: "COPY",
        card_id: c.id,
        origin_id: c.origin_id,
        actor_id: actorId,
        payload: { from_generation: card.copy_generation, hidden: c.hidden },
      }))
    );
  }
  return { copies: data || [], throttled: false };
}

// ============================================
// 삭제 (삭제팀 액션)
// 자기 owner_id인 카드만 삭제 가능
// 로그에는 영구히 남음
// ============================================
export async function deleteCard(card: Card, actorId: string) {
  const { error } = await supabase
    .from("cards")
    .update({ deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", card.id);
  if (error) throw error;

  await supabase.from("log_entries").insert({
    room_id: card.room_id,
    action: "DELETE",
    card_id: card.id,
    origin_id: card.origin_id,
    actor_id: actorId,
    payload: { name: card.name, was_hidden: card.hidden },
  });
}

// ============================================
// 종료 시 통계 계산
// ============================================
export interface GameStats {
  totalCopies: number;
  totalDeletes: number;
  remaining: number;
  logEntries: number;
  topCopied: { name: string; count: number }[];
  spreadersWon: boolean;
  avgCopyMs: number;
  avgDeleteMs: number;
}

export function computeStats(
  cards: Card[],
  logs: LogEntry[],
  durationSec: number
): GameStats {
  const remaining = cards.filter((c) => !c.deleted).length;
  const copies = logs.filter((l) => l.action === "COPY").length;
  const deletes = logs.filter((l) => l.action === "DELETE").length;

  // 가장 많이 복제된 origin 별 집계 (사람 이름 기준)
  const byName: Record<string, number> = {};
  logs
    .filter((l) => l.action === "COPY")
    .forEach((l) => {
      const card = cards.find((c) => c.origin_id === l.origin_id);
      if (card) byName[card.name] = (byName[card.name] || 0) + 1;
    });
  const topCopied = Object.entries(byName)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  const totalMs = durationSec * 1000;
  return {
    totalCopies: copies,
    totalDeletes: deletes,
    remaining,
    logEntries: logs.length,
    topCopied,
    spreadersWon: remaining > 0,
    avgCopyMs: copies > 0 ? Math.round(totalMs / copies) : 0,
    avgDeleteMs: deletes > 0 ? Math.round(totalMs / deletes) : 0,
  };
}

// ============================================
// 유틸
// ============================================
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function pickRandomTarget<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}
