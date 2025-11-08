import { cache } from "react"
import { getSupabaseServiceClient } from "./supabaseServer"
import type { AccountId, RawRecord } from "./types"

const accountTableMap: Record<AccountId, string> = {
  LevCom: "levcom_data",
  Happybrush: "happybrush_data",
  AluVerkauf: "alu_verkauf_data",
  DOG1: "dog1_data",
}

// Mapping von DB-Spalten (snake_case) zu RawRecord (camelCase)
function mapDbRecordToRawRecord(dbRecord: Record<string, unknown>, account: AccountId): RawRecord {
  return {
    date: String(dbRecord.date || ""),
    account,
    marketplace: String(dbRecord.marketplace || ""),
    asin: String(dbRecord.asin || ""),
    sku: String(dbRecord.sku || ""),
    name: String(dbRecord.name || ""),
    salesOrganic: Number(dbRecord.sales_organic) || 0,
    salesPpc: Number(dbRecord.sales_ppc) || 0,
    salesSponsoredProducts: Number(dbRecord.sales_sponsored_products) || 0,
    salesSponsoredDisplay: Number(dbRecord.sales_sponsored_display) || 0,
    unitsOrganic: Number(dbRecord.units_organic) || 0,
    unitsPpc: Number(dbRecord.units_ppc) || 0,
    unitsSponsoredProducts: Number(dbRecord.units_sponsored_products) || 0,
    unitsSponsoredDisplay: Number(dbRecord.units_sponsored_display) || 0,
    refunds: Number(dbRecord.refunds) || 0,
    valueReturned: Number(dbRecord.value_of_returned_items) || 0,
    sponsoredProductsCost: Number(dbRecord.sponsored_products) || 0,
    sponsoredDisplayCost: Number(dbRecord.sponsored_display) || 0,
    sponsoredBrandsCost: Number(dbRecord.sponsored_brands) || 0,
    sponsoredBrandsVideoCost: Number(dbRecord.sponsored_brands_video) || 0,
    adsSpend: Number(dbRecord.ads_spend) || 0,
    netProfit: Number(dbRecord.net_profit) || 0,
    productCost: Number(dbRecord.product_cost_sales) || 0,
    marginPercent: Number(dbRecord.margin) || 0,
  }
}

export const loadRawData = cache(async (): Promise<RawRecord[]> => {
  const supabase = getSupabaseServiceClient()
  const allRecords: RawRecord[] = []

  // Lade Daten aus allen Account-Tabellen
  // Supabase hat ein Standardlimit von 1000 Zeilen, daher müssen wir alle Daten laden
  for (const [account, tableName] of Object.entries(accountTableMap) as [AccountId, string][]) {
    let allData: any[] = []
    let from = 0
    const pageSize = 1000
    let hasMore = true

    // Lade alle Daten mit Pagination
    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("date", { ascending: true })
        .range(from, from + pageSize - 1)

      if (error) {
        console.error(`Fehler beim Laden von ${tableName}:`, error.message)
        break
      }

      if (data && data.length > 0) {
        allData.push(...data)
        from += pageSize
        hasMore = data.length === pageSize
      } else {
        hasMore = false
      }
    }

    if (allData.length > 0) {
      const mappedRecords = allData.map((record) => mapDbRecordToRawRecord(record, account))
      allRecords.push(...mappedRecords)
    }
  }

  return allRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
})

export const loadAccountData = cache(async (account: AccountId): Promise<RawRecord[]> => {
  const supabase = getSupabaseServiceClient()
  const tableName = accountTableMap[account]

  if (!tableName) {
    console.error(`Keine Tabelle für Account ${account} gefunden`)
    return []
  }

  let allData: any[] = []
  let from = 0
  const pageSize = 1000
  let hasMore = true

  // Lade alle Daten mit Pagination
  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order("date", { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      console.error(`Fehler beim Laden von ${tableName}:`, error.message)
      break
    }

    if (data && data.length > 0) {
      allData.push(...data)
      from += pageSize
      hasMore = data.length === pageSize
    } else {
      hasMore = false
    }
  }

  if (allData.length === 0) {
    return []
  }

  return allData.map((record) => mapDbRecordToRawRecord(record, account))
})

