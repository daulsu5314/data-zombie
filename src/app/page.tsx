"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getRoomByCode, joinRoom } from "@/lib/game";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin() {
    setError("");
    if (!code.trim() || !nickname.trim()) {
      setError("방 코드와 닉네임을 입력하세요");
      return;
    }
    setLoading(true);
    try {
      const room = await getRoomByCode(code.trim());
      if (!room) {
        setError("방을 찾을 수 없어요. 코드를 다시 확인하세요");
        return;
      }
      if (room.status !== "lobby") {
        setError("이미 시작되었거나 종료된 방이에요");
        return;
      }
      const player = await joinRoom(room.id, nickname.trim());
      // 로컬 스토리지에 본인 식별자 저장
      localStorage.setItem(`player:${room.id}`, player.id);
      router.push(`/play/${room.id}`);
    } catch (e) {
      console.error(e);
      setError("입장 중 오류가 발생했어요");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🧟‍♀️</div>
          <h1 className="text-3xl font-bold text-white">데이터 좀비</h1>
          <p className="text-sm text-white/60 mt-2">3분의 사투 — 디지털 시민교육 게임</p>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-white/60 mb-1.5">방 코드 (6자리)</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              className="w-full bg-black/30 border border-white/15 rounded-lg px-4 py-3 text-white text-center text-2xl tracking-[0.4em] font-mono focus:outline-none focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1.5">내 닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              placeholder="예: 김지우"
              className="w-full bg-black/30 border border-white/15 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-400"
            />
          </div>

          {error && (
            <div className="bg-red-500/15 border border-red-400/30 text-red-200 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition"
          >
            {loading ? "입장 중..." : "입장하기"}
          </button>

          <div className="text-center pt-2">
            <a href="/teacher" className="text-xs text-white/50 hover:text-white underline">
              선생님이신가요? 새 게임방 만들기 →
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-white/40 mt-6 leading-relaxed">
          이 게임은 디지털 공간에서 개인정보가 어떻게 퍼지고,<br />
          왜 한번 퍼지면 되돌리기 어려운지 직접 체험하는 활동입니다.
        </p>
      </div>
    </main>
  );
}
