"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function useUnreadNotifCount(intervalMs = 30_000) {
  const [count, setCount] = useState(0);

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { count: c } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("student_id", null)
      .eq("is_read", false);
    setCount(c ?? 0);
  }, []);

  useEffect(() => {
    fetch();
    const timer = setInterval(fetch, intervalMs);
    return () => clearInterval(timer);
  }, [fetch, intervalMs]);

  return { count, refresh: fetch };
}
