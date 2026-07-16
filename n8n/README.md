# n8n — KI-Eisenhower

Async-Klassifizierung von Aufgaben nach der Eisenhower-Matrix über ein **lokales**
Ollama-Modell. Das Cockpit ruft **nur** den n8n-Webhook (nie Ollama direkt).

## Import

1. In n8n: **Workflows → Import from File** → [`ki-eisenhower.workflow.json`](ki-eisenhower.workflow.json).
2. Workflow **aktivieren** (Toggle oben rechts).
3. Die Trigger-URL kopieren (Node „Webhook" → Production-URL, z. B.
   `https://n8n.fes-credo.de/webhook/ki-eisenhower`).

## Cockpit-Konfiguration (`.env`)

```env
N8N_EISENHOWER_WEBHOOK_URL="https://<n8n-host>/webhook/ki-eisenhower"
AI_CALLBACK_SECRET="<openssl rand -hex 24>"
AI_MODEL="qwen2.5:7b"          # lokales Modell, NIE ein :cloud-Modell
APP_URL="https://<cockpit-host>"   # muss von n8n aus erreichbar sein (siehe unten)
```

## Vertrag

**Cockpit → Webhook** (POST, JSON):
```json
{
  "taskId": "...", "titel": "...", "model": "qwen2.5:7b",
  "prompt": "<fertiger Klassifizierungs-Prompt aus dem Cockpit>",
  "callbackUrl": "https://<cockpit>/api/ai/callback",
  "callbackSecret": "<AI_CALLBACK_SECRET>", "jobKey": "<content-hash>"
}
```

**Webhook → Cockpit** (POST an `callbackUrl`, Header `x-ai-callback-secret`):
```json
{ "jobKey": "...", "taskId": "...", "important": true, "urgent": false,
  "confidence": 0.78, "reasoning": "kurze Begruendung" }
```

Der Prompt wird **im Cockpit** gebaut (`src/lib/ai-eisenhower.ts` → `baueKlassifizierungsPrompt`)
und mitgeschickt — n8n reicht ihn nur an Ollama durch (Single-Source, keine Drift).

## Nodes

1. **Webhook** — `responseMode: onReceived` → antwortet sofort 200, läuft dann async weiter.
2. **PII-Guard** (Code) — bricht ab, wenn ein `:cloud`-Modell verlangt wird
   (Aufgaben-Inhalte dürfen nie auf `ollama.com` routen) oder Pflichtfelder fehlen.
3. **Ollama (lokal)** (HTTP) — `POST /api/generate` mit `{ model, prompt, format:"json", stream:false }`,
   Timeout 120 s.
4. **Ergebnis aufbereiten** (Code) — parst den `response`-JSON-String, baut den Callback-Body.
5. **Callback ans Cockpit** (HTTP) — POST an `callbackUrl` mit Secret-Header.

**Fehlerverhalten:** Bricht ein Schritt ab (Ollama-Timeout, kein JSON), wird **kein**
Callback gesendet. Der Cockpit-Spinner läuft nach 90 s aus — kein Halb-Zustand,
kein falscher Vorschlag. Ein erneuter Klick auf „KI fragen" startet den Lauf neu
(gleicher `jobKey` → Callback bleibt idempotent).

## Zwei Infra-Punkte (vor dem Scharfschalten klären)

1. **Modellwahl / Latenz** — `qwen2.5:7b` vs. `qwen3.5:9b`. Async ist Pflicht
   (direkter Call antwortete lokal nicht in 60–90 s).
2. **Callback-Erreichbarkeit** — der n8n-Host muss `APP_URL` erreichen. Läuft das
   Cockpit in Dev auf `localhost:3000`, ist das von außen **nicht** erreichbar →
   Tunnel (cloudflared/ngrok) oder das Cockpit dort betreiben, wo n8n hinkommt.

## Smoke-Test (ohne n8n)

Callback direkt testen — der Vorschlag muss danach in `/aufgaben` erscheinen:
```bash
curl -X POST "$APP_URL/api/ai/callback" \
  -H "content-type: application/json" \
  -H "x-ai-callback-secret: $AI_CALLBACK_SECRET" \
  -d '{"jobKey":"smoke-1","taskId":"<echte-task-id>","important":true,"urgent":false,"confidence":0.8,"reasoning":"Test"}'
```

---

# n8n — KI-Briefing (Wochenkommentar, optional)

Veredelt das **Montags-Briefing** (AP3): die KI formuliert die schon berechneten
Findings zu einem warmen Wochenkommentar aus — sie **erfindet nichts**. Anders als der
KI-Eisenhower läuft dieser Aufruf **synchron** (der Cron-Batch ist nicht latenzkritisch):
das Cockpit ruft den Webhook und bekommt den Text direkt in der HTTP-Antwort zurück.

**Wichtig — reiner Zusatz mit Fallback:** Ist der Webhook nicht gesetzt, ein
`:cloud`-Modell verlangt, oder Ollama/n8n nicht erreichbar (Timeout 30 s im Cockpit),
geht das **deterministische Briefing (Cut 1)** unverändert raus. Die KI blockiert den
Versand nie.

## Import & Konfiguration
1. In n8n: **Workflows → Import from File** → [`ki-briefing.workflow.json`](ki-briefing.workflow.json), aktivieren.
2. Production-URL kopieren und in `.env` setzen:
```env
N8N_BRIEFING_WEBHOOK_URL="https://<n8n-host>/webhook/ki-briefing"
AI_MODEL="qwen2.5:7b"   # dasselbe LOKALE Modell, NIE :cloud
```

## Vertrag (synchron)
**Cockpit → Webhook** (POST, JSON): `{ "model": "qwen2.5:7b", "prompt": "<Reformulierungs-Prompt aus ai-briefing.ts>" }`
**Webhook → Cockpit** (HTTP-Antwort, JSON): `{ "text": "<reformulierter Wochenkommentar>" }`

Der Prompt wird im Cockpit gebaut (`src/lib/ai-briefing.ts` → `baueBriefingPrompt`, mit
strikter „erfinde-nichts"-Leitplanke); n8n reicht ihn nur an Ollama durch (freier Text,
KEIN `format:json`).

## Nodes
1. **Webhook** — `responseMode: lastNode` → antwortet mit der Ausgabe des letzten Nodes.
2. **PII-Guard** (Code) — bricht bei `:cloud`-Modell oder fehlendem Prompt ab.
3. **Ollama (lokal)** (HTTP) — `POST /api/generate` mit `{ model, prompt, stream:false }`, Timeout 60 s.
4. **Antwort aufbereiten** (Code) — extrahiert `response` und gibt `{ text }` zurück.

## Smoke-Test (ohne Cockpit)
```bash
curl -X POST "https://<n8n-host>/webhook/ki-briefing" \
  -H "content-type: application/json" \
  -d '{"model":"qwen2.5:7b","prompt":"Fasse in einem Satz zusammen: Alles auf Kurs."}'
# erwartet: {"text":"..."}
```
