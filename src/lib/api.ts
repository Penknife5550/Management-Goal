// ============================================================
// src/lib/api.ts
// Einheitliche API-Antworten nach CLAUDE.md: { data } oder { error }.
// ============================================================
import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
