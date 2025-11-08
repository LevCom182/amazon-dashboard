import { loadRawData } from "@/lib/data-loader"
import { buildDailySeries } from "@/lib/kpis"
import { NextResponse } from "next/server"

// Helper function für normalizeDate (kopiert aus kpis.ts)
function normalizeDate(date: string): string {
  return formatDateKey(new Date(date))
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

export async function GET() {
  try {
    const records = await loadRawData()
    const dailySeries = buildDailySeries(records)
    
    // Berechne die letzten 3 Tage wie im Dashboard
    const getTodayInBerlin = () => {
      const now = new Date()
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      const parts = formatter.formatToParts(now)
      const year = parseInt(parts.find(p => p.type === "year")!.value, 10)
      const month = parseInt(parts.find(p => p.type === "month")!.value, 10) - 1
      const day = parseInt(parts.find(p => p.type === "day")!.value, 10)
      return new Date(year, month, day, 0, 0, 0, 0)
    }
    
    const todayInBerlin = getTodayInBerlin()
    const yesterday = new Date(todayInBerlin)
    yesterday.setDate(todayInBerlin.getDate() - 1)
    const dayBeforeYesterday = new Date(todayInBerlin)
    dayBeforeYesterday.setDate(todayInBerlin.getDate() - 2)
    const threeDaysAgo = new Date(todayInBerlin)
    threeDaysAgo.setDate(todayInBerlin.getDate() - 3)
    
    const formatDateKey = (date: Date): string => {
      const year = date.getFullYear()
      const month = `${date.getMonth() + 1}`.padStart(2, "0")
      const day = `${date.getDate()}`.padStart(2, "0")
      return `${year}-${month}-${day}`
    }
    
    const dailyMap = new Map(dailySeries.map(point => [point.date, point]))
    const yesterdayKey = formatDateKey(yesterday)
    const dayBeforeYesterdayKey = formatDateKey(dayBeforeYesterday)
    const threeDaysAgoKey = formatDateKey(threeDaysAgo)
    
    const lastThreeDays = [
      dailyMap.get(yesterdayKey) || { date: yesterdayKey, revenue: 0, units: 0, refunds: 0, refundValue: 0, ppcSpend: 0, tacos: 0, margin: 0, netProfit: 0 },
      dailyMap.get(dayBeforeYesterdayKey) || { date: dayBeforeYesterdayKey, revenue: 0, units: 0, refunds: 0, refundValue: 0, ppcSpend: 0, tacos: 0, margin: 0, netProfit: 0 },
      dailyMap.get(threeDaysAgoKey) || { date: threeDaysAgoKey, revenue: 0, units: 0, refunds: 0, refundValue: 0, ppcSpend: 0, tacos: 0, margin: 0, netProfit: 0 },
    ]
    
    // Filtere nach Account für Test
    const happybrushRecords = records.filter(r => r.account === "Happybrush")
    const aluVerkaufRecords = records.filter(r => r.account === "AluVerkauf")
    
    const happybrushSeries = buildDailySeries(happybrushRecords)
    const aluVerkaufSeries = buildDailySeries(aluVerkaufRecords)
    
    const happybrushMap = new Map(happybrushSeries.map(point => [point.date, point]))
    const aluVerkaufMap = new Map(aluVerkaufSeries.map(point => [point.date, point]))
    
    const happybrushLastThreeDays = [
      happybrushMap.get(yesterdayKey) || { date: yesterdayKey, revenue: 0, units: 0, refunds: 0, refundValue: 0, ppcSpend: 0, tacos: 0, margin: 0, netProfit: 0 },
      happybrushMap.get(dayBeforeYesterdayKey) || { date: dayBeforeYesterdayKey, revenue: 0, units: 0, refunds: 0, refundValue: 0, ppcSpend: 0, tacos: 0, margin: 0, netProfit: 0 },
      happybrushMap.get(threeDaysAgoKey) || { date: threeDaysAgoKey, revenue: 0, units: 0, refunds: 0, refundValue: 0, ppcSpend: 0, tacos: 0, margin: 0, netProfit: 0 },
    ]
    
    const aluVerkaufLastThreeDays = [
      aluVerkaufMap.get(yesterdayKey) || { date: yesterdayKey, revenue: 0, units: 0, refunds: 0, refundValue: 0, ppcSpend: 0, tacos: 0, margin: 0, netProfit: 0 },
      aluVerkaufMap.get(dayBeforeYesterdayKey) || { date: dayBeforeYesterdayKey, revenue: 0, units: 0, refunds: 0, refundValue: 0, ppcSpend: 0, tacos: 0, margin: 0, netProfit: 0 },
      aluVerkaufMap.get(threeDaysAgoKey) || { date: threeDaysAgoKey, revenue: 0, units: 0, refunds: 0, refundValue: 0, ppcSpend: 0, tacos: 0, margin: 0, netProfit: 0 },
    ]
    
    // Debug: Prüfe die Datumsformatierung und die dailySeries
    const happybrushSampleDates = happybrushRecords.slice(0, 5).map(r => ({
      original: r.date,
      normalized: normalizeDate(r.date),
    }))
    
    // Debug: Prüfe die byDate Map für Happybrush
    const happybrushByDate = new Map<string, any>()
    for (const record of happybrushRecords) {
      const key = normalizeDate(record.date)
      const current = happybrushByDate.get(key) || { count: 0, totalRevenue: 0, totalPpcSpend: 0 }
      current.count++
      current.totalRevenue += record.salesOrganic + record.salesPpc
      current.totalPpcSpend += Math.abs(record.adsSpend || 0)
      happybrushByDate.set(key, current)
    }
    
    const happybrushByDateForLast3Days = {
      [yesterdayKey]: happybrushByDate.get(yesterdayKey) || null,
      [dayBeforeYesterdayKey]: happybrushByDate.get(dayBeforeYesterdayKey) || null,
      [threeDaysAgoKey]: happybrushByDate.get(threeDaysAgoKey) || null,
    }
    
    // Prüfe die dailySeries für die letzten 3 Tage
    const happybrushSeriesForLast3Days = happybrushSeries.filter(p => 
      p.date === yesterdayKey || p.date === dayBeforeYesterdayKey || p.date === threeDaysAgoKey
    )
    
    const aluVerkaufSeriesForLast3Days = aluVerkaufSeries.filter(p => 
      p.date === yesterdayKey || p.date === dayBeforeYesterdayKey || p.date === threeDaysAgoKey
    )
    
    return NextResponse.json({
      success: true,
      totalRecords: records.length,
      todayInBerlin: formatDateKey(todayInBerlin),
      yesterday: yesterdayKey,
      dayBeforeYesterday: dayBeforeYesterdayKey,
      threeDaysAgo: threeDaysAgoKey,
      dailySeriesLength: dailySeries.length,
      lastThreeDays: lastThreeDays,
      happybrushRecords: happybrushRecords.length,
      happybrushSeriesLength: happybrushSeries.length,
      happybrushLastThreeDays: happybrushLastThreeDays,
      happybrushSeriesForLast3Days: happybrushSeriesForLast3Days,
      happybrushByDateForLast3Days: happybrushByDateForLast3Days,
      happybrushSampleDates: happybrushSampleDates,
      aluVerkaufRecords: aluVerkaufRecords.length,
      aluVerkaufSeriesLength: aluVerkaufSeries.length,
      aluVerkaufLastThreeDays: aluVerkaufLastThreeDays,
      aluVerkaufSeriesForLast3Days: aluVerkaufSeriesForLast3Days,
      sampleDailySeries: dailySeries.slice(-5),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

