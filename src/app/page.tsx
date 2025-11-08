import { DashboardView } from "@/components/dashboard/dashboard-view"
import { loadRawData } from "@/lib/data-loader"
import { calculateKpis, groupByAccount } from "@/lib/kpis"

// Seite dynamisch rendern, da sie Supabase-Daten zur Laufzeit lädt
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Home() {
  const records = await loadRawData()
  const overall = calculateKpis(records)
  const accounts = groupByAccount(records)

  return <DashboardView overall={overall} accounts={accounts} records={records} />
}
