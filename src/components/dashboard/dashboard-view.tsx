"use client"

import Image from "next/image"
import { useMemo, useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

import { buildDailySeries, buildWeeklySeries, groupByCountry, groupByProduct } from "@/lib/kpis"
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format"
import type { AccountGroup, DailyMetricKey, KpiSet, ProductGroup, RawRecord } from "@/lib/types"

import { KpiChart, KPI_METRIC_OPTIONS } from "./kpi-chart"

interface DashboardViewProps {
  overall: KpiSet
  accounts: AccountGroup[]
  records: RawRecord[]
}

export function DashboardView({ overall: _overall, accounts, records }: DashboardViewProps) {
  // overall wird von außen übergeben, aber aktuell nicht verwendet
  void _overall
  const [selectedAccount, setSelectedAccount] = useState<string>("all")
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>("all")
  const [selectedProductKey, setSelectedProductKey] = useState<string>("")
  const [selectedMetrics, setSelectedMetrics] = useState<DailyMetricKey[]>(["revenue"])
  const [granularity, setGranularity] = useState<"daily" | "weekly">("daily")
  const [showGif, setShowGif] = useState(true)

  // Nach 5 Sekunden das GIF durch statisches Bild ersetzen
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGif(false)
    }, 5000) // 5 Sekunden

    return () => clearTimeout(timer)
  }, [])
  
  // Datumsbereich für Graph (letzte 30 Tage als Standard)
  // Verwende Berliner Zeitzone für korrekte Datumsberechnung
  const getTodayInBerlin = () => {
    const now = new Date()
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
  
  const today = getTodayInBerlin()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: thirtyDaysAgo,
    to: today,
  })
  
  // Passe Datumsbereich an, wenn Granularität wechselt
  const updateDateRangeForGranularity = (newGranularity: "daily" | "weekly") => {
    const todayInBerlin = getTodayInBerlin()
    if (newGranularity === "weekly") {
      // Für Wochen: Standard 12 Wochen zurück
      const newFrom = new Date(todayInBerlin)
      newFrom.setDate(todayInBerlin.getDate() - 84)
      setDateRange({ from: newFrom, to: todayInBerlin })
    } else {
      // Für Tage: Standard 30 Tage zurück
      const newFrom = new Date(todayInBerlin)
      newFrom.setDate(todayInBerlin.getDate() - 30)
      setDateRange({ from: newFrom, to: todayInBerlin })
    }
  }

  const filteredByAccount = useMemo(() => {
    if (selectedAccount === "all") {
      return records
    }
    return records.filter((record) => record.account === selectedAccount)
  }, [records, selectedAccount])

  const marketplaceOptions = useMemo(() => {
    const unique = new Set<string>()
    filteredByAccount.forEach((record) => unique.add(record.marketplace))
    return Array.from(unique).sort()
  }, [filteredByAccount])

  const effectiveMarketplace =
    selectedMarketplace !== "all" && marketplaceOptions.includes(selectedMarketplace)
      ? selectedMarketplace
      : "all"

  const filteredRecords = useMemo(() => {
    if (effectiveMarketplace === "all") {
      return filteredByAccount
    }
    return filteredByAccount.filter((record) => record.marketplace === effectiveMarketplace)
  }, [filteredByAccount, effectiveMarketplace])

  const productGroups = useMemo(() => groupByProduct(filteredRecords), [filteredRecords])
  const countryGroups = useMemo(() => groupByCountry(filteredRecords), [filteredRecords])
  
  // Immer tägliche Serie für die Kacheln (unabhängig von Granularität)
  const dailySeriesForTiles = useMemo(() => {
    return buildDailySeries(filteredRecords)
  }, [filteredRecords])
  
  // Erstelle Serie basierend auf gewählter Granularität für das Diagramm
  const chartSeries = useMemo(() => {
    if (granularity === "weekly") {
      return buildWeeklySeries(filteredRecords, 12) // Letzte 12 Wochen
    }
    return buildDailySeries(filteredRecords)
  }, [filteredRecords, granularity])
  
  // Letzte 3 Tage + aktueller Monat extrahieren basierend auf Berliner Zeit
  // "Gestern", "Vorgestern", "Vor 2 Tagen", "Aktueller Monat"
  // Verwendet immer tägliche Daten, unabhängig von der Diagramm-Granularität
  const lastThreeDays = useMemo(() => {
    const todayInBerlin = getTodayInBerlin()
    const yesterday = new Date(todayInBerlin)
    yesterday.setDate(todayInBerlin.getDate() - 1)
    const dayBeforeYesterday = new Date(todayInBerlin)
    dayBeforeYesterday.setDate(todayInBerlin.getDate() - 2)
    const threeDaysAgo = new Date(todayInBerlin)
    threeDaysAgo.setDate(todayInBerlin.getDate() - 3)
    
    // Erstelle Map für schnellen Zugriff (verwendet immer tägliche Daten)
    const dailyMap = new Map(dailySeriesForTiles.map(point => [point.date, point]))
    
    // Format Date zu YYYY-MM-DD
    const formatDateKey = (date: Date): string => {
      const year = date.getFullYear()
      const month = `${date.getMonth() + 1}`.padStart(2, "0")
      const day = `${date.getDate()}`.padStart(2, "0")
      return `${year}-${month}-${day}`
    }
    
    const yesterdayKey = formatDateKey(yesterday)
    const dayBeforeYesterdayKey = formatDateKey(dayBeforeYesterday)
    const threeDaysAgoKey = formatDateKey(threeDaysAgo)
    
    // Hole Daten für die letzten 3 Tage, falls vorhanden
    // Reihenfolge: Gestern, Vorgestern, Vor 2 Tagen
    const createEmptyPoint = (date: Date): typeof dailySeriesForTiles[0] => ({
      date: formatDateKey(date),
      revenue: 0,
      units: 0,
      refunds: 0,
      refundValue: 0,
      ppcSpend: 0,
      tacos: 0,
      margin: 0,
      netProfit: 0,
    })
    
    const result: typeof dailySeriesForTiles = [
      dailyMap.get(yesterdayKey) || createEmptyPoint(yesterday),
      dailyMap.get(dayBeforeYesterdayKey) || createEmptyPoint(dayBeforeYesterday),
      dailyMap.get(threeDaysAgoKey) || createEmptyPoint(threeDaysAgo),
    ]
    
    return result
  }, [dailySeriesForTiles])

  // Aktueller Monat aggregiert (vom 1. des Monats bis gestern)
  const currentMonthData = useMemo(() => {
    const todayInBerlin = getTodayInBerlin()
    const yesterday = new Date(todayInBerlin)
    yesterday.setDate(todayInBerlin.getDate() - 1)
    
    // Erster Tag des aktuellen Monats
    const firstDayOfMonth = new Date(todayInBerlin.getFullYear(), todayInBerlin.getMonth(), 1)
    
    // Format Date zu YYYY-MM-DD
    const formatDateKey = (date: Date): string => {
      const year = date.getFullYear()
      const month = `${date.getMonth() + 1}`.padStart(2, "0")
      const day = `${date.getDate()}`.padStart(2, "0")
      return `${year}-${month}-${day}`
    }
    
    const firstDayKey = formatDateKey(firstDayOfMonth)
    const yesterdayKey = formatDateKey(yesterday)
    
    // Aggregiere alle Tage vom 1. des Monats bis gestern
    const aggregated: typeof dailySeriesForTiles[0] = {
      date: firstDayKey, // Verwende ersten Tag des Monats als Datum
      revenue: 0,
      units: 0,
      refunds: 0,
      refundValue: 0,
      ppcSpend: 0,
      tacos: 0,
      margin: 0,
      netProfit: 0,
    }
    
    // Durchlaufe alle Tage im Monat bis gestern
    const currentDate = new Date(firstDayOfMonth)
    while (currentDate <= yesterday) {
      const dateKey = formatDateKey(currentDate)
      const dayData = dailySeriesForTiles.find(point => point.date === dateKey)
      
      if (dayData) {
        aggregated.revenue += dayData.revenue
        aggregated.units += dayData.units
        aggregated.refunds += dayData.refunds
        aggregated.refundValue += dayData.refundValue
        aggregated.ppcSpend += dayData.ppcSpend
        aggregated.netProfit += dayData.netProfit
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Berechne TACOS und Marge für aggregierte Daten
    aggregated.tacos = aggregated.revenue > 0 ? aggregated.ppcSpend / aggregated.revenue : 0
    aggregated.margin = aggregated.revenue > 0 ? aggregated.netProfit / aggregated.revenue : 0
    
    return aggregated
  }, [dailySeriesForTiles])
  
  // Gefilterte Serie basierend auf Datumsbereich und Granularität
  // Heutiges Datum wird bei täglicher Ansicht ausgeschlossen
  // Aktuelle Woche wird bei wöchentlicher Ansicht angezeigt
  const filteredChartSeries = useMemo(() => {
    const todayInBerlin = getTodayInBerlin()
    const formatDateKey = (date: Date): string => {
      const year = date.getFullYear()
      const month = `${date.getMonth() + 1}`.padStart(2, "0")
      const day = `${date.getDate()}`.padStart(2, "0")
      return `${year}-${month}-${day}`
    }
    
    // Für Wochen: Finde den Montag der aktuellen Woche
    const getMondayOfWeek = (date: Date): Date => {
      const d = new Date(date)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      return new Date(d.setDate(diff))
    }
    
    if (granularity === "weekly") {
      // Aktuelle Woche wird angezeigt (nicht ausgeschlossen)
      return chartSeries.filter((point) => {
        const pointDate = new Date(point.date + "T00:00:00")
        pointDate.setHours(0, 0, 0, 0)
        const fromDate = new Date(dateRange.from)
        fromDate.setHours(0, 0, 0, 0)
        const toDate = new Date(dateRange.to)
        toDate.setHours(23, 59, 59, 999)
        return pointDate >= fromDate && pointDate <= toDate
      })
    } else {
      const todayKey = formatDateKey(todayInBerlin)
      
      return chartSeries.filter((point) => {
        // Heutiges Datum ausschließen
        if (point.date === todayKey) {
          return false
        }
        const pointDate = new Date(point.date + "T00:00:00")
        pointDate.setHours(0, 0, 0, 0)
        const fromDate = new Date(dateRange.from)
        fromDate.setHours(0, 0, 0, 0)
        const toDate = new Date(dateRange.to)
        toDate.setHours(23, 59, 59, 999)
        return pointDate >= fromDate && pointDate <= toDate
      })
    }
  }, [chartSeries, dateRange, granularity])
  
  const defaultProductKey = productGroups[0] ? productKey(productGroups[0]) : ""
  const activeProductKey =
    selectedProductKey && productGroups.some((group) => productKey(group) === selectedProductKey)
      ? selectedProductKey
      : defaultProductKey

  const selectedProduct = useMemo(() => {
    if (!activeProductKey) return undefined
    return productGroups.find((group) => productKey(group) === activeProductKey)
  }, [productGroups, activeProductKey])

  return (
    <div className="flex min-h-screen flex-col bg-black text-foreground">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        {/* Überschrift */}
        <div className="flex items-center justify-center gap-3">
          <Image
            src={showGif ? "/coffee_parrot.gif" : "/coffee_parrot_static.png"}
            alt="Coffee Parrot"
            width={48}
            height={48}
            className="h-9 w-auto"
            unoptimized
          />
          <h1 className="text-3xl font-bold text-foreground">LevCom Daily Snapshot</h1>
        </div>

        {/* Header: Dropdowns in Card */}
        <Card className="bg-card/60 border-border/50">
          <CardContent className="pt-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <FilterSelect
                label="Account"
                value={selectedAccount}
                onValueChange={(value) => {
                  setSelectedAccount(value)
                  setSelectedMarketplace("all")
                  setSelectedProductKey("")
                }}
                options={[
                  { value: "all", label: "Alle Accounts" },
                  ...accounts.map((account) => ({ value: account.account, label: account.account })),
                ]}
              />
              <FilterSelect
                label="Marktplatz"
                value={effectiveMarketplace}
                onValueChange={(value) => {
                  setSelectedMarketplace(value)
                  setSelectedProductKey("")
                }}
                options={[
                  { value: "all", label: "Alle Länder" },
                  ...marketplaceOptions.map((marketplace) => ({
                    value: marketplace,
                    label: marketplace,
                  })),
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* 4 Kacheln: Gestern, Vorgestern, Vor 2 Tagen, Aktueller Monat */}
        <section className="grid gap-4 md:grid-cols-4">
          {lastThreeDays.map((dayData, index) => {
            const dayLabels = ["Gestern", "Vorgestern", "Vor 2 Tagen"]
            const dayLabel = dayLabels[index] || `Tag ${index + 1}`
            return (
              <Card key={dayData.date} className="bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">{dayLabel}</CardTitle>
                  <p className="text-xs text-muted-foreground">{formatDateShort(dayData.date)}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DayMetricRow label="Umsatz" value={formatCurrency(dayData.revenue)} />
                  <DayMetricRow label="Units" value={formatNumber(dayData.units)} />
                  <DayMetricRow label="PPC Spend" value={formatCurrency(dayData.ppcSpend)} />
                  <DayMetricRow label="TACOS" value={formatPercent(dayData.tacos)} />
                  <DayMetricRow label="Marge" value={formatPercent(dayData.margin)} />
                  <DayMetricRow label="Profit" value={formatCurrency(dayData.netProfit)} />
                </CardContent>
              </Card>
            )
          })}
          {/* Aktueller Monat Kachel */}
          <Card key="current-month" className="bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Aktueller Monat</CardTitle>
              <p className="text-xs text-muted-foreground">
                {format(new Date(currentMonthData.date + "T00:00:00"), "MMMM yyyy", { locale: de })}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <DayMetricRow label="Umsatz" value={formatCurrency(currentMonthData.revenue)} />
              <DayMetricRow label="Units" value={formatNumber(currentMonthData.units)} />
              <DayMetricRow label="PPC Spend" value={formatCurrency(currentMonthData.ppcSpend)} />
              <DayMetricRow label="TACOS" value={formatPercent(currentMonthData.tacos)} />
              <DayMetricRow label="Marge" value={formatPercent(currentMonthData.margin)} />
              <DayMetricRow label="Profit" value={formatCurrency(currentMonthData.netProfit)} />
            </CardContent>
          </Card>
          {lastThreeDays.length === 0 && (
            <Card className="bg-card/60 md:col-span-4">
              <CardContent className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Keine Daten vorhanden.
              </CardContent>
            </Card>
          )}
        </section>

        {/* Graph mit Datumsbereich-Auswahl */}
        <Card className="bg-card/60">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <CardTitle>Performance Last 30 Days</CardTitle>
                <div className="flex gap-1 rounded-lg border border-border/50 bg-background/50 p-1">
                  <Button
                    size="sm"
                    variant={granularity === "daily" ? "default" : "ghost"}
                    onClick={() => {
                      setGranularity("daily")
                      updateDateRangeForGranularity("daily")
                    }}
                    className="h-7 px-3 text-xs"
                  >
                    Täglich
                  </Button>
                  <Button
                    size="sm"
                    variant={granularity === "weekly" ? "default" : "ghost"}
                    onClick={() => {
                      setGranularity("weekly")
                      updateDateRangeForGranularity("weekly")
                    }}
                    className="h-7 px-3 text-xs"
                  >
                    Wöchentlich
                  </Button>
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-fit">
                    {dateRange.from && dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd.MM.yyyy", { locale: de })} -{" "}
                        {format(dateRange.to, "dd.MM.yyyy", { locale: de })}
                      </>
                    ) : (
                      <span>Datumsbereich wählen</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange as DateRange}
                    onSelect={(range: DateRange | undefined) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to })
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-wrap gap-2">
              {KPI_METRIC_OPTIONS.map((option) => {
                const isActive = selectedMetrics.includes(option.key)
                return (
                  <Button
                    key={option.key}
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    onClick={() => toggleMetric(option.key, selectedMetrics, setSelectedMetrics)}
                  >
                    {option.label}
                  </Button>
                )
              })}
            </div>
          </CardHeader>
          <CardContent>
            <KpiChart data={filteredChartSeries} metricKeys={selectedMetrics} granularity={granularity} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

interface FilterSelectProps {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onValueChange: (value: string) => void
}

function FilterSelect({ label, value, options, onValueChange }: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Bitte wählen" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{label}</SelectLabel>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

interface ProductDetailProps {
  product?: ProductGroup
}

function ProductDetail({ product }: ProductDetailProps) {
  if (!product) {
    return (
      <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
        <CardContent className="flex h-36 items-center justify-center text-sm text-muted-foreground">
          Produkt auswählen, um Detaildaten zu sehen.
        </CardContent>
      </Card>
    )
  }

  const revenueTrend = product.records.map((record) => ({
    date: record.date,
    revenue: record.salesOrganic + record.salesPpc + record.salesSponsoredProducts + record.salesSponsoredDisplay,
    units:
      record.unitsOrganic + record.unitsPpc + record.unitsSponsoredProducts + record.unitsSponsoredDisplay,
    netProfit: record.netProfit,
    tacos:
      record.salesOrganic + record.salesPpc > 0
        ? record.adsSpend /
          Math.max(1, record.salesOrganic + record.salesPpc + record.salesSponsoredProducts + record.salesSponsoredDisplay)
        : 0,
  }))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Produktdetails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <div className="text-lg font-semibold text-foreground">{product.name}</div>
            <div className="text-xs text-muted-foreground">
              ASIN {product.asin} · SKU {product.sku}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <DetailMetric label="Umsatz" value={formatCurrency(product.kpis.revenue)} />
            <DetailMetric label="Units" value={formatNumber(product.kpis.units)} />
            <DetailMetric label="PPC Spend" value={formatCurrency(product.kpis.ppcSpend)} />
            <DetailMetric label="Marge" value={formatPercent(product.kpis.margin)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Trend (Tage)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-36">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Umsatz</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Netto</TableHead>
                  <TableHead className="text-right">TACOS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueTrend.map((row) => (
                  <TableRow key={`${product.asin}-${row.date}`}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.units)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.netProfit)}</TableCell>
                    <TableCell className="text-right">{formatPercent(row.tacos)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

interface DetailMetricProps {
  label: string
  value: string
}

function DetailMetric({ label, value }: DetailMetricProps) {
  return (
    <div className="rounded-lg border border-transparent bg-muted/30 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}

function productKey(product: ProductGroup) {
  return `${product.asin}-${product.sku}`
}

function toggleMetric(
  key: DailyMetricKey,
  current: DailyMetricKey[],
  setMetrics: (value: DailyMetricKey[]) => void,
) {
  if (current.includes(key)) {
    if (current.length === 1) return
    setMetrics(current.filter((item) => item !== key))
  } else {
    setMetrics([...current, key])
  }
}

function formatDateShort(date: string) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

interface DayMetricRowProps {
  label: string
  value: string
}

function DayMetricRow({ label, value }: DayMetricRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-muted-foreground/10 pb-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}

