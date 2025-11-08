## LevCom Performance Cockpit

Next.js App Router Projekt (Next.js 16, Tailwind/shadcn/ui) für den täglichen Überblick über die Sellerboard KPIs der vier Amazon-Accounts **LevCom**, **Happybrush**, **AluVerkauf** und **DOG1**. Die Daten werden in Supabase persistiert und per Cron-Job alle drei Stunden automationsgestützt aktualisiert.

### Voraussetzungen

- Node.js ≥ 18
- npm
- Supabase Projekt mit den Tabellen `levcom_data`, `happybrush_data`, `alu_verkauf_data`, `dog1_data`

### Installation & Entwicklung

```bash
npm install
npm run dev
```

Der lokale Entwicklungsserver läuft anschließend unter [http://localhost:3000](http://localhost:3000).

### Umgebungsvariablen

- `NEXT_PUBLIC_SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` werden sowohl lokal als auch auf Vercel benötigt.
- Die Sellerboard-CSV-Links sind im Code (`src/lib/sellerboard-import.ts`) hart verdrahtet und erfordern keine Authentifizierung.

### Automatischer Import (Cron)

- `src/app/api/cron/import/route.ts` implementiert den Drei-Stunden-Cronjob.
  - Prüft die Erreichbarkeit jeder CSV-URL (HEAD/GET).
  - Lädt den kompletten 30-Tage-Zeitraum.
  - Löscht in Supabase (je Tabelle) die letzten 7 Tage (Zeitzone Berlin) und schreibt sie neu.
  - Upsertet zusätzlich Tage 8–30, um neue Datensätze zu ergänzen.
  - Bricht bei Duplikaten (ASIN + Marketplace + Datum) mit ausführlichem Logging ab.
- `vercel.json` enthält den Cron-Eintrag `0 */3 * * *` auf `/api/cron/import`.
- Das Response-JSON sowie reichhaltige `console.log`-Ausgaben dokumentieren gelöschte, geschriebene und übersprungene Zeilen sowie fehlende CSV-Spalten.

Manuelles Auslösen (lokal):

```bash
# Terminal 1
npm run dev

# Terminal 2
curl -s http://localhost:3000/api/cron/import | jq
```

### Datenverarbeitung & Hilfslogik

- `src/lib/sellerboard-import.ts` kapselt CSV-Download, Header-basiertes Mapping (reihenfolgeunabhängig), Duplikat-Erkennung und Zeitfenster-Helfer für die Berliner Zeitzone.
- `src/lib/data-loader.ts` liest die Daten zur Laufzeit aus Supabase (inkl. Pagination > 1000 Zeilen) und liefert sie dem Dashboard.
- `src/lib/kpis.ts` enthält Aggregationslogik (Accounts/Marktplätze/Produkte) und KPI-Berechnung.

### UI-Struktur

- `src/app/page.tsx` rendert das Dashboard dynamisch (SSR) und ruft die Supabase-Daten bei jedem Request ab.
- `src/components/dashboard/dashboard-view.tsx` enthält Filter, Kennzahlenkarten, Mehrfach-KPI-Chart (daily/weekly) und Tageskacheln.
- `src/components/dashboard/kpi-chart.tsx` nutzt `recharts` für Mehrfach-Linien, duale Achsen und KPI-Auswahl.
- shadcn/ui Komponenten liegen unter `src/components/ui/` und bilden das einheitliche Design-System.

### Tests & Deployment

- Lokale Smoke-Tests: `curl` auf `/api/cron/import` und Sichtprüfung des Dashboards.
- Deployment via Vercel (GitHub Integration). Wichtig: Environment Variables inkl. Sellerboard-URLs im Vercel-Projekt setzen – sonst schlägt der Build fehl.

Alle Texte sind bewusst auf Deutsch formuliert, damit die operativen Teams direkt mit dem Cockpit arbeiten können.
