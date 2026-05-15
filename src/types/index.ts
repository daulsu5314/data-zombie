export type RoomStatus = "lobby" | "playing" | "ended";
export type PlayerRole = "spreader" | "deleter";
export type LogAction = "CREATE" | "COPY" | "DELETE" | "HIDE" | "BREACH";

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  spreader_ratio: number;
  duration_seconds: number;
  started_at: string | null;
  ended_at: string | null;
  breach_at: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  nickname: string;
  role: PlayerRole | null;
  joined_at: string;
}

export interface Card {
  id: string;
  room_id: string;
  owner_id: string;
  origin_id: string;
  name: string;
  hobby: string;
  birthday: string;
  x: number;
  y: number;
  hidden: boolean;
  deleted: boolean;
  is_original: boolean;
  copy_generation: number;
  created_at: string;
  deleted_at: string | null;
}

export interface LogEntry {
  id: number;
  room_id: string;
  action: LogAction;
  card_id: string;
  origin_id: string;
  actor_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}
