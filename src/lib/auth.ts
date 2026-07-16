// ============================================================
// src/lib/auth.ts
// Echte Auth (AP6): JWT-Session im HttpOnly-Cookie, signiert mit jose (HS256).
// Ersetzt den historischen Stub (hartcodierter Test-Nutzer).
//
// Schichten:
//  - Middleware (src/middleware.ts) prueft das Cookie kantenseitig und blockt
//    unangemeldete Zugriffe (Seiten -> Redirect /login, APIs -> 401).
//  - getAktuellerNutzer() ist die zweite Verteidigungslinie in den Routen:
//    verifiziert erneut und wirft NichtAngemeldetError, falls doch keine
//    gueltige Session vorliegt (z.B. Ablauf zwischen Middleware und Handler).
// ============================================================
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_DAUER_TAGE } from "./constants";
import { prisma } from "./db";

const SESSION_DAUER_SEK = SESSION_DAUER_TAGE * 24 * 60 * 60;

// Payload der Session. Signiert (nicht faelschbar), aber vom Cookie-Inhaber
// lesbar - enthaelt bewusst nur die eigenen Stammdaten (email/name/rolle),
// nichts Fremdes/Geheimes. Rolle/isActive gelten als Snapshot; die
// autoritative Pruefung macht getAktuellerNutzer() frisch gegen die DB.
export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  rolle: "ADMIN" | "NUTZER";
  rechtseinheitId: string;
}

// Kompatibilitaets-Interface der 25 bestehenden Call-Sites (+ neue Felder).
export interface AktuellerNutzer {
  id: string;
  rechtseinheitId: string;
  rolle: "ADMIN" | "NUTZER";
  email: string;
  name: string;
}

/** Wird geworfen, wenn keine gueltige Session vorliegt (Middleware faengt das normal vorher ab). */
export class NichtAngemeldetError extends Error {
  constructor() {
    super("Nicht angemeldet.");
    this.name = "NichtAngemeldetError";
  }
}

// Bekannte Platzhalter-Secrets, die in Produktion niemals akzeptiert werden.
const VERBOTENE_SECRETS = new Set(["dev_secret", "secret", "test", "changeme", ""]);

let cachedSecret: Uint8Array | null = null;

/** JWT-Secret lazy laden + haerten (Muster aus dem HR-Portal). */
function getJwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const secret = process.env.JWT_SECRET ?? "";
  const prod = process.env.NODE_ENV === "production";
  if (!secret) {
    throw new Error("JWT_SECRET ist nicht gesetzt. Generieren mit: openssl rand -hex 32");
  }
  if (prod && (VERBOTENE_SECRETS.has(secret) || secret.length < 32)) {
    throw new Error(
      "JWT_SECRET ist zu schwach fuer Produktion (min. 32 Zeichen, kein Platzhalter).",
    );
  }
  cachedSecret = new TextEncoder().encode(secret);
  return cachedSecret;
}

/** Signiertes Session-JWT erzeugen (HS256, Ablauf SESSION_DAUER_TAGE). */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAUER_SEK}s`)
    .sign(getJwtSecret());
}

/** JWT pruefen; null bei ungueltig/abgelaufen (wirft bewusst nicht). */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
    const p = payload as Record<string, unknown>;
    if (
      typeof p.userId !== "string" ||
      typeof p.email !== "string" ||
      typeof p.name !== "string" ||
      typeof p.rechtseinheitId !== "string" ||
      (p.rolle !== "ADMIN" && p.rolle !== "NUTZER")
    ) {
      return null;
    }
    return {
      userId: p.userId,
      email: p.email,
      name: p.name,
      rolle: p.rolle,
      rechtseinheitId: p.rechtseinheitId,
    };
  } catch {
    return null;
  }
}

/** Session-Cookie setzen (HttpOnly; secure nur in Produktion, damit Dev-HTTP geht). */
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DAUER_SEK,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Aktuelle Session aus dem Cookie lesen; null wenn nicht angemeldet. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Aktuellen Nutzer liefern oder NichtAngemeldetError werfen.
 * Autoritative Auth-Pruefung der Routen: laedt den Nutzer FRISCH aus der DB
 * (nicht nur aus dem Token), damit Deaktivierung (isActive=false) und
 * Rollenwechsel sofort greifen - der stateless-JWT-Snapshot wird hier nicht
 * mehr blind vertraut. Gleicher Name/Rueckgabe-Kern wie der fruehere Stub,
 * damit die bestehenden Call-Sites nur ein `await` brauchen.
 */
export async function getAktuellerNutzer(): Promise<AktuellerNutzer> {
  const session = await getSession();
  if (!session) throw new NichtAngemeldetError();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      rechtseinheitId: true,
      role: true,
      email: true,
      name: true,
      isActive: true,
    },
  });
  if (!user || !user.isActive) throw new NichtAngemeldetError();

  return {
    id: user.id,
    rechtseinheitId: user.rechtseinheitId,
    rolle: user.role,
    email: user.email,
    name: user.name,
  };
}
