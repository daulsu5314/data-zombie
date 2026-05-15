"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Card, LogEntry, Player, Room } from "@/types";

// 방 상태 구독
export function useRoom(roomId: string | null) {
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    if (!roomId) return;
    let mounted = true;

    supabase.from("rooms").select("*").eq("id", roomId).single().then(({ data }) => {
      if (mounted) setRoom(data as Room);
    });

    const ch = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.new) setRoom(payload.new as Room);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  return room;
}

// 플레이어 목록 구독
export function usePlayers(roomId: string | null) {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!roomId) return;
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomId)
        .order("joined_at");
      if (mounted && data) setPlayers(data as Player[]);
    };
    load();

    const ch = supabase
      .channel(`players:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
        () => { load(); }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  return players;
}

// 카드 목록 구독 (필드에 떠있는 것 + 로그용 전체)
export function useCards(roomId: string | null) {
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    if (!roomId) return;
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("cards")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at");
      if (mounted && data) setCards(data as Card[]);
    };
    load();

    const ch = supabase
      .channel(`cards:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "cards", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setCards((prev) => [...prev, payload.new as Card]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "cards", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setCards((prev) =>
            prev.map((c) => (c.id === (payload.new as Card).id ? (payload.new as Card) : c))
          );
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  return cards;
}

// 로그 구독
export function useLogs(roomId: string | null) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!roomId) return;
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("log_entries")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at");
      if (mounted && data) setLogs(data as LogEntry[]);
    };
    load();

    const ch = supabase
      .channel(`logs:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "log_entries", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setLogs((prev) => [...prev, payload.new as LogEntry]);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  return logs;
}
