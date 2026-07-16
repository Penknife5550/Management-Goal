// ============================================================
// src/lib/api.ts
// Einheitliche API-Antworten nach CLAUDE.md: { data } oder { error }.
// ============================================================
import { NextResponse } from "next/server";
import type { z } from "zod";

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// Liest + validiert den Request-Body gegen ein Zod-Schema. Liefert bei Fehler eine
// fertige 400-Antwort mit der ersten deutschen Meldung (zentralisiert das Muster).
export async function parseBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: NextResponse }> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError(parsed.error.issues[0]?.message ?? "Ungueltige Eingabe.", 400),
    };
  }
  return { ok: true, data: parsed.data };
}
