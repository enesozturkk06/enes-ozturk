import { NextRequest, NextResponse } from "next/server";
import { hasOpenRouterKey } from "@/lib/openrouter";
import { generateKediProgram, KediProgramError } from "@/lib/kediPrograms";
import { insertKediProgramVersion } from "@/lib/db";
import type { KediSport, KediProgramGoal, KediProgramCreatedBy, KediProgramStatus } from "@/lib/types";

const VALID_SPORTS: KediSport[] = ["kickboks", "muaythai", "boks", "fitness"];
const VALID_GOALS: KediProgramGoal[] = ["kilo-verme", "kilo-alma", "kas-kazanma", "yag-yakma", "kondisyon"];

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Yapılandırılmış antrenman + beslenme programı üretir ve YENİ bir sürüm
 * olarak kaydeder (geçmiş korunur, bkz. lib/db.ts insertKediProgramVersion).
 * İki paralel LLM çağrısı içerdiği için (bkz. lib/kediPrograms.ts) 30-90
 * saniye sürebilir — bu kullanıcı tarafından bilinçli tetiklenen, seyrek
 * bir işlem olduğu için kabul edilebilir (chat mesajı gibi anlık değil).
 *
 * - createdBy:"student" + status:"published" → öğrencinin kendi ürettiği
 *   program (Kedi AI Premium Program), mevcut davranış, anında yayında.
 * - createdBy:"admin" + status:"draft" → Koç Merkezi'nden üretilen taslak,
 *   antrenör onaylayıp yayınlayana kadar öğrenciye görünmez.
 */
export async function POST(req: NextRequest) {
  if (!hasOpenRouterKey()) {
    return jsonError("OPENROUTER_API_KEY tanımlı değil — .env.local ve Vercel'e eklenmeli", 503);
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const studentId = typeof body.studentId === "string" ? body.studentId : undefined;
  const sport = body.sport as KediSport;
  const goal = body.goal as KediProgramGoal;
  const daysPerWeek = typeof body.daysPerWeek === "number" ? body.daysPerWeek : undefined;
  const createdBy: KediProgramCreatedBy = body.createdBy === "admin" ? "admin" : "student";
  const status: KediProgramStatus = body.status === "draft" ? "draft" : "published";

  if (!studentId) return jsonError("studentId gerekli", 400);
  if (!VALID_SPORTS.includes(sport)) return jsonError("Geçersiz spor dalı", 400);
  if (!VALID_GOALS.includes(goal)) return jsonError("Geçersiz hedef", 400);
  if (!daysPerWeek || daysPerWeek < 2 || daysPerWeek > 6) {
    return jsonError("daysPerWeek 2-6 arası olmalı", 400);
  }

  try {
    const generated = await generateKediProgram({ studentId, sport, goal, daysPerWeek });
    const saved = await insertKediProgramVersion(generated, { status, createdBy });
    return NextResponse.json({ program: saved });
  } catch (err) {
    if (err instanceof KediProgramError) {
      return jsonError(err.message, 422);
    }
    console.error("[kedi-ai/program]", err);
    return jsonError("Program oluşturulurken bir hata oluştu, lütfen tekrar deneyin.", 500);
  }
}
