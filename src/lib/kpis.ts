import type {
  RawRecord,
  KpiSet,
  AccountGroup,
  CountryGroup,
  ProductGroup,
  AccountId,
  DailyKpiPoint,
} from "./types"

interface Totals {
  revenue: number
  units: number
  refunds: number
  refundValue: number
  ppcSpend: number
  netProfit: number
}

export function calculateKpis(records: RawRecord[]): KpiSet {
  const totals = sumRecordTotals(records)

  const tacos = totals.revenue > 0 ? totals.ppcSpend / totals.revenue : 0
  const margin = totals.revenue > 0 ? totals.netProfit / totals.revenue : 0

  return {
    revenue: totals.revenue,
    units: totals.units,
    refunds: totals.refunds,
    refundValue: totals.refundValue,
    ppcSpend: totals.ppcSpend,
    tacos,
    netProfit: totals.netProfit,
    margin,
  }
}

export function groupByAccount(records: RawRecord[]): AccountGroup[] {
  const grouped = new Map<AccountId, RawRecord[]>()

  for (const record of records) {
    if (!grouped.has(record.account)) {
      grouped.set(record.account, [])
    }
    grouped.get(record.account)!.push(record)
  }

  return Array.from(grouped.entries()).map(([account, accountRecords]) => ({
    account,
    kpis: calculateKpis(accountRecords),
    countries: groupByCountry(accountRecords),
  }))
}

export function groupByCountry(records: RawRecord[]): CountryGroup[] {
  const grouped = new Map<string, RawRecord[]>()

  for (const record of records) {
    const key = record.marketplace
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(record)
  }

  return Array.from(grouped.entries()).map(([marketplace, countryRecords]) => ({
    marketplace,
    kpis: calculateKpis(countryRecords),
    products: groupByProduct(countryRecords),
  }))
}

export function groupByProduct(records: RawRecord[]): ProductGroup[] {
  const grouped = new Map<string, RawRecord[]>()

  for (const record of records) {
    const key = `${record.account}-${record.asin}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(record)
  }

  return Array.from(grouped.values()).map((productRecords) => {
    const base = productRecords[0]

    return {
      asin: base.asin,
      sku: base.sku,
      name: base.name,
      kpis: calculateKpis(productRecords),
      records: productRecords,
    }
  })
}

export function buildDailySeries(records: RawRecord[], days = 30): DailyKpiPoint[] {
  if (records.length === 0) return []

  const byDate = new Map<string, Totals>()
  for (const record of records) {
    const key = normalizeDate(record.date)
    const current = byDate.get(key) ?? createEmptyTotals()
    addRecordTotals(current, record)
    byDate.set(key, current)
  }

  // Verwende immer heute (Berliner Zeit) als Enddatum für die Serie
  // Das stellt sicher, dass die letzten 3 Tage immer korrekt berechnet werden
  const todayInBerlin = getTodayInBerlin()
  
  const series: DailyKpiPoint[] = []

  // Erstelle Serie für die letzten N Tage, endend mit heute
  for (let offset = days - 1; offset >= 0; offset--) {
    const currentDate = addDays(todayInBerlin, -offset)
    const key = formatDateKey(currentDate)
    const totals = byDate.get(key) ?? createEmptyTotals()
    series.push({
      date: key,
      revenue: totals.revenue,
      units: totals.units,
      refunds: totals.refunds,
      refundValue: totals.refundValue,
      ppcSpend: totals.ppcSpend,
      tacos: totals.revenue > 0 ? totals.ppcSpend / totals.revenue : 0,
      margin: totals.revenue > 0 ? totals.netProfit / totals.revenue : 0,
      netProfit: totals.netProfit,
    })
  }

  return series
}

// Funktion zum Finden des Montags einer Woche (Wochentag 1)
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sonntag, 1 = Montag, ..., 6 = Samstag
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Anpassung: Montag = 1
  d.setDate(diff)
  return d
}

// Funktion zum Formatieren einer Woche als String (z.B. "2024-11-04" für Montag)
function formatWeekKey(monday: Date): string {
  return formatDateKey(monday)
}

export function buildWeeklySeries(records: RawRecord[], weeks = 12): DailyKpiPoint[] {
  if (records.length === 0) return []

  // Gruppiere Daten nach Wochen (Montag-Sonntag)
  const byWeek = new Map<string, Totals>()
  
  for (const record of records) {
    const recordDate = new Date(normalizeDate(record.date) + "T00:00:00")
    
    // Alle Tage von Montag bis Sonntag berücksichtigen
    const monday = getMondayOfWeek(recordDate)
    const weekKey = formatWeekKey(monday)
    
    const current = byWeek.get(weekKey) ?? createEmptyTotals()
    addRecordTotals(current, record)
    byWeek.set(weekKey, current)
  }

  // Verwende immer heute (Berliner Zeit) als Referenz
  const todayInBerlin = getTodayInBerlin()
  
  // Finde den Montag der aktuellen Woche
  const currentMonday = getMondayOfWeek(todayInBerlin)
  
  const series: DailyKpiPoint[] = []

  // Erstelle Serie für die letzten N Wochen, endend mit der aktuellen Woche
  for (let offset = weeks - 1; offset >= 0; offset--) {
    const weekMonday = addDays(currentMonday, -offset * 7)
    const weekKey = formatWeekKey(weekMonday)
    const totals = byWeek.get(weekKey) ?? createEmptyTotals()
    
    series.push({
      date: weekKey, // Montag der Woche als Datum
      revenue: totals.revenue,
      units: totals.units,
      refunds: totals.refunds,
      refundValue: totals.refundValue,
      ppcSpend: totals.ppcSpend,
      tacos: totals.revenue > 0 ? totals.ppcSpend / totals.revenue : 0,
      margin: totals.revenue > 0 ? totals.netProfit / totals.revenue : 0,
      netProfit: totals.netProfit,
    })
  }

  return series
}

function sumRecordTotals(records: RawRecord[]): Totals {
  const totals = createEmptyTotals()
  for (const record of records) {
    addRecordTotals(totals, record)
  }
  return totals
}

function addRecordTotals(target: Totals, record: RawRecord) {
  // Umsatz = sales_organic + sales_ppc
  const revenue = record.salesOrganic + record.salesPpc
  
  // Units = unitsOrganic + unitsPpc
  const units = record.unitsOrganic + record.unitsPpc
  
  // PPC Spend = ads_spend * -1 (ads_spend ist in der DB negativ)
  const ppcSpend = record.adsSpend ? Math.abs(record.adsSpend) : 0

  target.revenue += revenue
  target.units += units
  target.refunds += record.refunds
  target.refundValue += record.valueReturned
  target.ppcSpend += ppcSpend
  target.netProfit += record.netProfit
}

function createEmptyTotals(): Totals {
  return {
    revenue: 0,
    units: 0,
    refunds: 0,
    refundValue: 0,
    ppcSpend: 0,
    netProfit: 0,
  }
}

function normalizeDate(date: string): string {
  // Wenn das Datum bereits im Format YYYY-MM-DD ist, verwende es direkt
  // Das vermeidet Zeitzonen-Probleme beim Parsen
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date
  }
  // Andernfalls parse es als Date
  return formatDateKey(new Date(date))
}

function formatDateKey(date: Date): string {
  // Verwende lokale Zeit (Berlin) statt UTC
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Funktion zum Erhalten des aktuellen Datums in Berliner Zeitzone
function getTodayInBerlin(): Date {
  const now = new Date()
  // Konvertiere zu Berliner Zeit
  // Verwende Intl.DateTimeFormat für korrekte Zeitzone-Konvertierung
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(now)
  const year = parseInt(parts.find(p => p.type === "year")!.value, 10)
  const month = parseInt(parts.find(p => p.type === "month")!.value, 10) - 1 // Monate sind 0-indexiert
  const day = parseInt(parts.find(p => p.type === "day")!.value, 10)
  
  // Erstelle Date-Objekt in lokaler Zeit, aber mit Berliner Datum
  const berlinDate = new Date(year, month, day, 0, 0, 0, 0)
  return berlinDate
}

