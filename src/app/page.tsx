import { DashboardView } from "@/components/dashboard/dashboard-view"
import { loadRawData } from "@/lib/data-loader"
import { calculateKpis, groupByAccount } from "@/lib/kpis"

export default async function Home() {
  const records = await loadRawData()
  const overall = calculateKpis(records)
  const accounts = groupByAccount(records)

  return <DashboardView overall={overall} accounts={accounts} records={records} />
}
