## Amazon Performance Cockpit (Frontend-Prototyp)

Next.js 15 App Router Projekt zum Visualisieren von Sellerboard CSV-Daten für mehrere Amazon-Accounts. Die Oberfläche basiert auf [shadcn/ui](https://ui.shadcn.com/) und zeigt exemplarisch KPIs für vier Accounts (LevCom, Happybrush, AluVerkauf, DOG1).

### Voraussetzungen

- Node.js ≥ 18
- npm

### Installation & Start

```bash
npm install
npm run dev
```

Der lokale Entwicklungsserver läuft anschließend unter [http://localhost:3000](http://localhost:3000).

### Datenquellen

- Beispiel-CSV-Dateien liegen unter `data/` und spiegeln den späteren täglichen Import aus Sellerboard wider.
- `src/lib/data-loader.ts` kapselt den Zugriff auf diese CSVs. Die Funktionen sind so vorbereitet, dass sie zukünftig auf Supabase umgestellt werden können.
- `src/lib/kpis.ts` enthält Hilfsfunktionen zur Aggregation nach Account, Marktplatz und ASIN sowie zur KPI-Berechnung (Umsatz, Units, Erstattungen, PPC Spend, TACOS, Marge).

### UI-Struktur

- `src/app/page.tsx` lädt die Daten serverseitig und gibt sie an die Dashboard-Ansicht weiter.
- `src/components/dashboard/dashboard-view.tsx` ist eine Client-Komponente mit Filtern, KPI-Karten und Tabellen.
- `src/components/dashboard/kpi-card.tsx` kapselt die KPI-Kachel-Darstellung.
- shadcn/ui Komponenten liegen unter `src/components/ui/`.

### Nächste Schritte

- **Supabase-Anbindung:** CSV-Parsing in `data-loader.ts` durch Supabase Queries ersetzen und automatisierte tägliche Imports abbilden.
- **Automatisierte Datenaktualisierung:** Cron-Job oder ETL in Supabase, der die Sellerboard-Links alle 24 h lädt.
- **Visualisierung erweitern:** Charts (z. B. via `@nivo` oder `recharts`) für Zeitreihen und Budgetverteilung ergänzen.
- **Authentifizierung:** optional Zugang pro Account-Team einführen.

Alle Texte sind bewusst auf Deutsch formuliert, um den operativen Teams einen schnellen Einstieg zu ermöglichen.
