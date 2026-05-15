"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !key) {
  console.warn("Supabase 환경변수가 비어있습니다. .env.local을 확인하세요.");
}

export const supabase = createClient(url, key, {
  realtime: { params: { eventsPerSecond: 50 } },
});
