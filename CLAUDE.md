# CLAUDE.md — App Manager

> Czytaj ten plik przed wykonaniem jakiejkolwiek pracy w projekcie.
> Globalne zasady (wiki, subagents, tech stack, wzorce): `../CLAUDE.md`

---

## Czym jest ten projekt

**App Manager** — lokalny dashboard do zarządzania wszystkimi projektami Artura.
Działa na porcie **3333** (backend) + **5174** (frontend Vite).

Uruchamianie/zatrzymywanie projektów, streaming logów, kanban z plików .md, wykrywanie portów.

---

## Stack

| Warstwa | Tech |
|---|---|
| Backend | Express 5 + TypeScript + `ws` WebSocket |
| Frontend | React 19 + Vite + Tailwind v4 |
| Persystencja | `server/data/config.json` |
| Procesy | `child_process.spawn` + `taskkill /T /F` |

---

## Kluczowe pliki

```
server/src/
├── index.ts              # HTTP + WebSocket serwer
├── config.ts             # loadConfig / saveConfig / upsertProjectConfig
├── scanner/              # Auto-odkrywanie projektów
│   ├── index.ts          # scanProjects() — uwzględnia overrideAutoDetect
│   ├── detector.ts       # detectProject() → typ + startCommand
│   └── kanban-parser.ts  # parseKanban() — Obsidian + plain markdown
├── process/
│   ├── manager.ts        # start/stop/status
│   ├── port-detector.ts  # regex z logów + netstat fallback
│   └── log-streamer.ts   # CircularBuffer(500) + EventEmitter
└── api/
    └── projects.ts       # REST endpoints + WebSocket handler
```

---

## Ważne: config.json

- **overrideAutoDetect: true** — bez tego scanner nadpisze ręczne zmiany
- PUT `/api/projects/:id/config` — jedyna bezpieczna metoda aktualizacji (atomowa)
- Scanner uruchamia się gdy cache > 30s lub po `lastScanTime = 0`
- Projekty z custom ścieżką (np. `Aplikacje/product-builder`) wymagają `overrideAutoDetect: true`

---

## Uruchomienie

```bash
npm run dev  # uruchamia server + client przez concurrently
```

---

## Dedicated Tools

<!-- List project-specific tools here. -->
