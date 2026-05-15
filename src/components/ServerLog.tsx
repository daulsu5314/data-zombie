"use client";

import { useEffect, useRef } from "react";
import type { LogEntry } from "@/types";

export function ServerLog({ logs }: { logs: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs.length]);

  return (
    <div className="bg-black border border-green-500/30 rounded-xl h-[420px] overflow-hidden">
      <div className="bg-green-500/10 px-3 py-2 border-b border-green-500/20 text-xs font-mono text-green-300 flex items-center justify-between">
        <span>// SERVER_LOG :: persistent_storage.db</span>
        <span className="text-green-500/50">{logs.length} entries</span>
      </div>
      <div className="px-3 py-2 text-[10px] font-mono text-yellow-400/80 border-b border-green-500/10">
        ⚠ "UI에서 지웠다고 데이터가 사라진 게 아니에요. 여기 다 남아있어요."
      </div>
      <div ref={ref} className="overflow-y-auto h-[calc(100%-65px)] p-3 font-mono text-[11px] leading-relaxed">
        {logs.map((l) => {
          const time = new Date(l.created_at).toLocaleTimeString("ko-KR", { hour12: false });
          const isDelete = l.action === "DELETE";
          const isCopy = l.action === "COPY";
          const isBreach = l.action === "BREACH";
          const color = isBreach
            ? "text-red-500 font-bold bg-red-500/10 px-1"
            : isDelete
              ? "text-red-400 line-through opacity-70"
              : isCopy
                ? "text-orange-300"
                : "text-green-400";
          const payload = l.payload as any;
          const name = payload?.name ?? "";
          const detail = payload?.hobby ? ` hobby="${payload.hobby}" birth="${payload.birthday}"` : "";

          // BREACH는 특별한 형식으로 표시
          if (isBreach) {
            return (
              <div key={l.id} className={`whitespace-pre ${color}`}>
                [{time}] ⚠ BREACH ⚠ 데이터 유출 사고 발생 — 카드 전체 2배 + 위치 재배치
              </div>
            );
          }

          return (
            <div key={l.id} className={`whitespace-pre ${color}`}>
              [{time}] {l.action.padEnd(7)} {name ? `name="${name}"` : ""}{detail} id={l.card_id.slice(0, 8)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
