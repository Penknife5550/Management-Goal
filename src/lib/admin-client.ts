// ============================================================
// src/lib/admin-client.ts
// Client-Fetch fuer die Einstellungs-Endpunkte. Auth laeuft ueber das
// Session-Cookie (Rolle ADMIN, serverseitig via withAdmin) — der fruehere
// x-admin-token-Header samt sessionStorage entfaellt.
// ============================================================

// Wirft Error("UNAUTHORIZED") bei 401/403 (nicht angemeldet oder keine
// Admin-Rolle) — die Einstellungen zeigen dann die Hinweis-Karte.
export async function adminFetch<T>(
  url: string,
  method: "GET" | "PUT" | "POST",
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as { data?: T; error?: string } | null;
  if (res.status === 401 || res.status === 403) throw new Error("UNAUTHORIZED");
  if (!res.ok || !json) {
    throw new Error(json?.error ?? "Aktion fehlgeschlagen. Bitte erneut versuchen.");
  }
  return json.data as T;
}
