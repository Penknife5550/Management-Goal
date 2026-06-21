// ============================================================
// src/lib/client.ts
// Schlanker Fetch-Helfer fuer den Client: liefert data oder wirft
// eine Error mit der deutschen Server-Meldung (aus { error }).
// ============================================================
export async function senden<T>(
  url: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const antwort = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await antwort.json().catch(() => null)) as { data?: T; error?: string } | null;

  if (!antwort.ok || !json) {
    throw new Error(json?.error ?? "Aktion fehlgeschlagen. Bitte erneut versuchen.");
  }
  return json.data as T;
}
