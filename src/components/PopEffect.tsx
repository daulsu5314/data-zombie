"use client";

import { useEffect, useState } from "react";

interface PopEffect {
  id: number;
  x: number;
  y: number;
}

let popIdCounter = 0;

export function usePopEffects() {
  const [effects, setEffects] = useState<PopEffect[]>([]);

  const trigger = (x: number, y: number) => {
    const id = ++popIdCounter;
    setEffects((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setEffects((prev) => prev.filter((e) => e.id !== id));
    }, 600);
  };

  const render = (
    <>
      {effects.map((e) => (
        <div
          key={e.id}
          className="absolute pointer-events-none text-red-400 font-bold text-lg animate-pop-text"
          style={{ left: `${e.x}%`, top: `${e.y}%` }}
        >
          Pop!
        </div>
      ))}
    </>
  );

  return { trigger, render };
}
