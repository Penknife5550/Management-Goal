# Go-Live-Checkliste — CREDO Führungs-Cockpit

Stand: alle Features (AP1–AP6) gebaut, verifiziert (tsc · 186 Unit · 9/9 E2E · Browser),
je adversarial reviewt, auf `origin/main`. Die App **baut und läuft im Production-Modus**
(CSP-Prerender-Bug gefixt). Bevor sie erreichbar wird, folgende Punkte abarbeiten.

## 1. MUSS vor dem Livegang (sonst unsicher/kaputt)

Alle Secrets **frisch** erzeugen (nicht die Dev-Werte aus dem Repo verwenden):

```bash
openssl rand -hex 32   # fuer JWT_SECRET
openssl rand -hex 32   # fuer ENCRYPTION_KEY
openssl rand -hex 24   # fuer CRON_SECRET
```

Produktions-Umgebung (`.env` auf dem Server, NICHT ins Git):

| Variable | Wert | Warum kritisch |
|---|---|---|
| `NODE_ENV` | `production` | schaltet `secure`-Cookies + strikte CSP scharf |
| `JWT_SECRET` | frisch (32 Byte hex) | signiert Sessions — der Dev-Wert steht oeffentlich im Verlauf, damit waeren Sessions faelschbar |
| `ADMIN_INITIAL_PASSWORD` | starkes Passwort | sonst ist das Admin-Passwort der Repo-Fallback `Cockpit2026!Start` → jeder kommt rein. **Nach erstem Login aendern.** |
| `ENCRYPTION_KEY` | frisch (32 Byte hex) | verschluesselt das SMTP-Passwort in der DB |
| `CRON_SECRET` | frisch (24 Byte hex) | schuetzt die Cron-Endpunkte |
| `DATABASE_URL` | Prod-Postgres | — |
| `APP_URL` | oeffentliche URL (https) | Links in Mails, Magic-Link |
| `MAIL_ALLOWED_DOMAINS` | `credo-gruppe.de,fes-minden.de` | Relay-Schutz; sonst kann das System als Spam-Relay dienen bzw. Mails gehen an fremde Domains |
| `MAIL_DRY_RUN` | **nicht setzen** (bzw. ≠ `1`) | sonst geht KEINE echte Mail raus |
| `SEED_DEMO` | **nicht setzen** | sonst werden 2 login-faehige Demo-Konten mit Repo-Passwort angelegt |

- **Hinter HTTPS + Reverse-Proxy** betreiben (Cookie `secure` greift nur mit https).
- **SMTP** unter Einstellungen → SMTP eintragen, aktivieren, Verbindung testen (fuer Login-Magic-Links, Reminder, Briefing).

## 2. DB & Deploy-Schritte

```bash
npx prisma migrate deploy      # alle Migrationen auf die Prod-DB anwenden
npx prisma db seed             # legt Rechtseinheit + Admin an (mit ADMIN_INITIAL_PASSWORD)
npm run build && npm run start # oder via Dockerfile / docker-compose
```

Danach: **einloggen, Admin-Passwort aendern**, pruefen dass die Seiten rendern (Login → /heute).

## 3. Cron einrichten (Host-Crontab, Europe/Berlin)

```cron
0 7 * * 1  curl -fsS -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/montags-briefing
0 8 * * 1  curl -fsS -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/reminders
0 3 * * 0  curl -fsS -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/cleanup
```

## 4. Noch offen (bewusste Entscheidung, ob damit live)

- **Backup/Restore** der Postgres-DB einrichten (Datenverlust-Schutz).
- **DSGVO-Loeschkonzept** (Zusage an Personalrat/DSB). Audit-Log ist gebaut.
- **Adoptions-Telemetrie** fehlt (misst nicht, ob genutzt) — kein Betriebs-Blocker.
- **Reverse-Proxy-IP fuer Rate-Limits**: `clientIp` liest die linke `x-forwarded-for`-Adresse
  (spoofbar). Hinter dem eigenen Proxy die vertrauenswuerdige Adresse setzen (Details:
  Kommentar in `src/lib/audit.ts`). Die konto-gebundenen Limits greifen unabhaengig davon.
- **Lib-PII-Guard** fuer den KI-Eisenhower-Trigger nachziehen (Task-Chip).

## 5. Bekannte Grenze

- **Keine Nutzerverwaltungs-UI**: neue Fuehrungskraefte lassen sich (noch) nicht in der App
  anlegen. Der Fuehrungs-Ueberblick (`/ueberblick`) zeigt nur Nutzer, die in der DB existieren.
  Fuer den Einzelbetrieb (du) sofort nutzbar; fuer echten Mehrbenutzer-Ueberblick braucht es
  entweder manuelles Seeden weiterer Nutzer oder eine Nutzerverwaltung.

## KI-Features (optional, nur falls genutzt)

Nur wenn KI-Eisenhower / KI-Briefing aktiv sein sollen: laufendes lokales Ollama + n8n
(Workflows unter `n8n/` importieren), `N8N_*_WEBHOOK_URL` + `AI_CALLBACK_SECRET` + `AI_MODEL`
(LOKALES Modell, nie `-cloud`/`:cloud`) setzen. Ohne das laeuft alles deterministisch weiter.
