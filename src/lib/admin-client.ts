// ============================================================
// src/lib/admin-client.ts
// Client-Fetch fuer die Einstellungs-Endpunkte. Schickt das Admin-Token
// (Uebergang bis RBAC) als Header "x-admin-token". Token liegt in der
// sessionStorage und wird beim Gate einmal eingegeben.
// ============================================================
const TOKEN_KEY = "cockpit_admin_token";

export function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(TOKEN_KEY) ?? "";
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

// Wirft Error("UNAUTHORIZED") bei 403 (Token falsch/fehlt) — das Gate faengt es ab.
export async function adminFetch<T>(
  url: string,
  method: "GET" | "PUT" | "POST",
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: {
      "x-admin-token": getAdminToken(),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as { data?: T; error?: string } | null;
  if (res.status === 403) throw new Error("UNAUTHORIZED");
  if (!res.ok || !json) {
    throw new Error(json?.error ?? "Aktion fehlgeschlagen. Bitte erneut versuchen.");
  }
  return json.data as T;
}
