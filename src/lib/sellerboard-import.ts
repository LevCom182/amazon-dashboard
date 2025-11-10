import { parse } from "csv-parse/sync"

import type { AccountId } from "./types"

interface ColumnDefinition {
  key: SellerboardColumnKey
  headers: string[]
  required?: boolean
  parser?: (value: unknown) => number | string | null
  type: "string" | "number" | "date"
}

export type SellerboardColumnKey =
  | "date"
  | "marketplace"
  | "asin"
  | "sku"
  | "name"
  | "sales_organic"
  | "sales_ppc"
  | "sales_sponsored_products"
  | "sales_sponsored_display"
  | "units_organic"
  | "units_ppc"
  | "units_sponsored_products"
  | "units_sponsored_display"
  | "refunds"
  | "promo_value"
  | "sponsored_products"
  | "sponsored_display"
  | "sponsored_brands"
  | "sponsored_brands_video"
  | "google_ads"
  | "facebook_ads"
  | "gift_wrap"
  | "shipping"
  | "refund_commission"
  | "refund_digital_services_fee"
  | "refund_fba_customer_return_per_unit_fee"
  | "refund_goodwill_principal"
  | "refund_principal"
  | "refund_promotion"
  | "refund_refund_commission"
  | "refund_shipping_charge"
  | "refund_shipping_chargeback"
  | "refund_shipping_tax"
  | "refund_shipping_tax_discount"
  | "refund_ship_promotion"
  | "refund_tax_discount"
  | "refunds_costs_damaged"
  | "value_of_returned_items"
  | "product_cost_unsellable_refunds"
  | "commission"
  | "compensated_clawback"
  | "digital_services_fee"
  | "fba_disposal_fee"
  | "fba_per_unit_fulfillment_fee"
  | "fba_storage_fee"
  | "missing_from_inbound"
  | "missing_from_inbound_clawback"
  | "reversal_reimbursement"
  | "estimated_payout"
  | "product_cost_sales"
  | "product_cost_non_amazon"
  | "product_cost_multichannel_costs"
  | "product_cost_missing_from_inbound"
  | "product_cost_cost_of_missing_returns"
  | "vat"
  | "gross_profit"
  | "net_profit"
  | "margin"
  | "real_acos"
  | "sessions"
  | "unit_session_percentage"
  | "ads_spend"
  | "sellable_returns_percent"
  | "roi"

export interface SellerboardDbRow {
  [key: string]: number | string | null
  date: string
  marketplace: string
  asin: string
  sku: string
  name: string
}

export interface ParseResult {
  records: SellerboardDbRow[]
  missingColumns: SellerboardColumnKey[]
  skippedRows: number
}

export interface DuplicateKeyDetails {
  asin: string
  marketplace: string
  date: string
  index: number
}

export class SellerboardDuplicateError extends Error {
  duplicates: DuplicateKeyDetails[]

  constructor(message: string, duplicates: DuplicateKeyDetails[]) {
    super(message)
    this.name = "SellerboardDuplicateError"
    this.duplicates = duplicates
  }
}

export const SELLERBOARD_ACCOUNT_CONFIG: Record<
  AccountId,
  { table: string; url: string }
> = {
  LevCom: {
    table: "levcom_data",
    url: "https://app.sellerboard.com/en/automation/reports?id=7f3ddc49dd844d9f8e2c9898fe4e01a2&format=csv&t=67e80da36bf749ec9fa1a7df72bd1e67",
  },
  Happybrush: {
    table: "happybrush_data",
    url: "https://app.sellerboard.com/de/automation/reports?id=373e93c07f854f3d8b1383ec2c041d2e&format=csv&t=f38912638634492aaa7f30a3f2033d95",
  },
  AluVerkauf: {
    table: "alu_verkauf_data",
    url: "https://app.sellerboard.com/de/automation/reports?id=917cf4d23d184135807958990aeace12&format=csv&t=834e63565a11426cb5f396c30714c3e7",
  },
  DOG1: {
    table: "dog1_data",
    url: "https://app.sellerboard.com/de/automation/reports?id=a973c65cfda54d12a2ceb173bf3177dd&format=csv&t=7c106fb5fbd349a79258cdc6dca5dd24",
  },
}

const COLUMN_DEFINITIONS: ColumnDefinition[] = [
  { key: "date", headers: ["Date"], required: true, type: "date" },
  { key: "marketplace", headers: ["Marketplace"], required: true, type: "string" },
  { key: "asin", headers: ["ASIN"], required: true, type: "string" },
  { key: "sku", headers: ["SKU"], type: "string" },
  { key: "name", headers: ["Name"], type: "string" },
  { key: "sales_organic", headers: ["SalesOrganic"], type: "number" },
  { key: "sales_ppc", headers: ["SalesPPC"], type: "number" },
  { key: "sales_sponsored_products", headers: ["SalesSponsoredProducts"], type: "number" },
  { key: "sales_sponsored_display", headers: ["SalesSponsoredDisplay"], type: "number" },
  { key: "units_organic", headers: ["UnitsOrganic"], type: "number" },
  { key: "units_ppc", headers: ["UnitsPPC"], type: "number" },
  { key: "units_sponsored_products", headers: ["UnitsSponsoredProducts"], type: "number" },
  { key: "units_sponsored_display", headers: ["UnitsSponsoredDisplay"], type: "number" },
  { key: "refunds", headers: ["Refunds"], type: "number" },
  { key: "promo_value", headers: ["PromoValue"], type: "number" },
  { key: "sponsored_products", headers: ["SponsoredProducts"], type: "number" },
  {
    key: "sponsored_display",
    headers: ["SponsoredDisplay"],
    type: "number",
  },
  {
    key: "sponsored_brands",
    headers: ["SponsoredВrands", "SponsoredBrands"],
    type: "number",
  },
  {
    key: "sponsored_brands_video",
    headers: ["SponsoredBrandsVideo"],
    type: "number",
  },
  { key: "google_ads", headers: ["Google ads"], type: "number" },
  { key: "facebook_ads", headers: ["Facebook ads"], type: "number" },
  { key: "gift_wrap", headers: ["GiftWrap"], type: "number" },
  { key: "shipping", headers: ["Shipping"], type: "number" },
  {
    key: "refund_commission",
    headers: ["Refund Commission", "RefundCost"],
    type: "number",
  },
  {
    key: "refund_digital_services_fee",
    headers: ["Refund DigitalServicesFee"],
    type: "number",
  },
  {
    key: "refund_fba_customer_return_per_unit_fee",
    headers: ["Refund FBACustomerReturnPerUnitFee"],
    type: "number",
  },
  {
    key: "refund_goodwill_principal",
    headers: ["Refund GoodwillPrincipal"],
    type: "number",
  },
  {
    key: "refund_principal",
    headers: ["Refund Principal"],
    type: "number",
  },
  {
    key: "refund_promotion",
    headers: ["Refund Promotion"],
    type: "number",
  },
  {
    key: "refund_refund_commission",
    headers: ["Refund RefundCommission"],
    type: "number",
  },
  {
    key: "refund_shipping_charge",
    headers: ["Refund ShippingCharge"],
    type: "number",
  },
  {
    key: "refund_shipping_chargeback",
    headers: ["Refund ShippingChargeback"],
    type: "number",
  },
  {
    key: "refund_shipping_tax",
    headers: ["Refund ShippingTax"],
    type: "number",
  },
  {
    key: "refund_shipping_tax_discount",
    headers: ["Refund ShippingTaxDiscount"],
    type: "number",
  },
  {
    key: "refund_ship_promotion",
    headers: ["Refund ShipPromotion"],
    type: "number",
  },
  {
    key: "refund_tax_discount",
    headers: ["Refund TaxDiscount"],
    type: "number",
  },
  {
    key: "refunds_costs_damaged",
    headers: ["RefundsCostsDamaged"],
    type: "number",
  },
  {
    key: "value_of_returned_items",
    headers: ["Value of returned items"],
    type: "number",
  },
  {
    key: "product_cost_unsellable_refunds",
    headers: ["ProductCost Unsellable Refunds"],
    type: "number",
  },
  {
    key: "commission",
    headers: ["Commission", "AmazonFees"],
    type: "number",
  },
  {
    key: "compensated_clawback",
    headers: ["COMPENSATED_CLAWBACK"],
    type: "number",
  },
  {
    key: "digital_services_fee",
    headers: ["DigitalServicesFee"],
    type: "number",
  },
  { key: "fba_disposal_fee", headers: ["FBADisposalFee"], type: "number" },
  {
    key: "fba_per_unit_fulfillment_fee",
    headers: ["FBAPerUnitFulfillmentFee"],
    type: "number",
  },
  { key: "fba_storage_fee", headers: ["FBAStorageFee"], type: "number" },
  {
    key: "missing_from_inbound",
    headers: ["MISSING_FROM_INBOUND"],
    type: "number",
  },
  {
    key: "missing_from_inbound_clawback",
    headers: ["MISSING_FROM_INBOUND_CLAWBACK"],
    type: "number",
  },
  {
    key: "reversal_reimbursement",
    headers: ["REVERSAL_REIMBURSEMENT"],
    type: "number",
  },
  {
    key: "estimated_payout",
    headers: ["EstimatedPayout"],
    type: "number",
  },
  {
    key: "product_cost_sales",
    headers: ["ProductCost Sales", "Cost of Goods"],
    type: "number",
  },
  {
    key: "product_cost_non_amazon",
    headers: ["ProductCost Non-Amazon"],
    type: "number",
  },
  {
    key: "product_cost_multichannel_costs",
    headers: ["ProductCost MultichannelCosts"],
    type: "number",
  },
  {
    key: "product_cost_missing_from_inbound",
    headers: ["ProductCost MissingFromInbound"],
    type: "number",
  },
  {
    key: "product_cost_cost_of_missing_returns",
    headers: ["ProductCost CostOfMissingReturns"],
    type: "number",
  },
  { key: "vat", headers: ["VAT"], type: "number" },
  { key: "gross_profit", headers: ["GrossProfit"], type: "number" },
  { key: "net_profit", headers: ["NetProfit"], type: "number" },
  { key: "margin", headers: ["Margin"], type: "number" },
  { key: "real_acos", headers: ["Real ACOS"], type: "number" },
  { key: "sessions", headers: ["Sessions"], type: "number" },
  {
    key: "unit_session_percentage",
    headers: ["Unit Session Percentage"],
    type: "number",
  },
  { key: "ads_spend", headers: ["Ads spend"], type: "number" },
  {
    key: "sellable_returns_percent",
    headers: ["Sellable Returns %"],
    type: "number",
  },
  { key: "roi", headers: ["ROI"], type: "number" },
]

export async function fetchSellerboardCsv(account: AccountId, signal?: AbortSignal): Promise<string> {
  const config = SELLERBOARD_ACCOUNT_CONFIG[account]
  if (!config) {
    throw new Error(`Keine Sellerboard-Konfiguration für Account "${account}" gefunden`)
  }
  const url = config.url
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(
      `Download für Account "${account}" fehlgeschlagen (Status ${response.status} ${response.statusText})`
    )
  }
  return await response.text()
}

export function parseSellerboardCsv(csvContent: string): ParseResult {
  const parsed = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Array<Record<string, unknown>>

  if (parsed.length === 0) {
    return { records: [], missingColumns: [], skippedRows: 0 }
  }

  const headers = Object.keys(parsed[0] ?? {})
  const headerMap = new Map<SellerboardColumnKey, string | null>()
  const missing = new Set<SellerboardColumnKey>()

  for (const column of COLUMN_DEFINITIONS) {
    const foundHeader = column.headers.find((candidate) => headers.includes(candidate)) ?? null
    headerMap.set(column.key, foundHeader)
    // Nur required-Spalten als fehlend melden
    if (!foundHeader && column.required) {
      missing.add(column.key)
    }
  }

  const records: SellerboardDbRow[] = []
  let skippedRows = 0

  parsed.forEach((row, index) => {
    const mapped: SellerboardDbRow = {
      date: "",
      marketplace: "",
      asin: "",
      sku: "",
      name: "",
    }

    let hasCriticalMissing = false

    for (const column of COLUMN_DEFINITIONS) {
      const header = headerMap.get(column.key)
      const rawValue = header ? row[header] : undefined
      const value = convertValue(rawValue, column)

      if (column.key === "date") {
        if (!value || typeof value !== "string") {
          hasCriticalMissing = true
        } else {
          mapped.date = value
        }
        continue
      }

      if (column.key === "marketplace") {
        const marketplace = value ? String(value) : ""
        if (!marketplace) {
          hasCriticalMissing = true
        } else {
          mapped.marketplace = marketplace
        }
        continue
      }

      if (column.key === "asin") {
        const asin = value ? String(value) : ""
        if (!asin) {
          hasCriticalMissing = true
        } else {
          mapped.asin = asin
        }
        continue
      }

      if (column.type === "string") {
        mapped[column.key] = value ? String(value) : ""
      } else if (column.type === "number") {
        const numericValue = typeof value === "number" ? value : 0
        ;(mapped as Record<string, number | string | null>)[column.key] = numericValue
      }
    }

    if (hasCriticalMissing) {
      skippedRows += 1
      return
    }

    records.push(mapped)
  })

  return {
    records,
    missingColumns: Array.from(missing),
    skippedRows,
  }
}

function convertValue(
  value: unknown,
  column: ColumnDefinition
): number | string | null {
  if (column.type === "string") {
    return value === undefined || value === null ? "" : String(value).trim()
  }

  if (column.type === "number") {
    return parseNumber(value)
  }

  if (column.type === "date") {
    return convertDate(value)
  }

  return null
}

const BERLIN_TIMEZONE = "Europe/Berlin"

export function getBerlinNow(): Date {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BERLIN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  const parts = formatter.formatToParts(now)
  const year = parseInt(parts.find((p) => p.type === "year")?.value ?? "0", 10)
  const month = parseInt(parts.find((p) => p.type === "month")?.value ?? "1", 10) - 1
  const day = parseInt(parts.find((p) => p.type === "day")?.value ?? "1", 10)
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10)
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10)
  const second = parseInt(parts.find((p) => p.type === "second")?.value ?? "0", 10)

  return new Date(year, month, day, hour, minute, second)
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getBerlinToday(): string {
  const date = getBerlinNow()
  date.setHours(0, 0, 0, 0)
  return formatDateKey(date)
}

export function getBerlinDateNDaysAgo(days: number): string {
  const date = getBerlinNow()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return formatDateKey(date)
}

export function getInclusiveDateRange(days: number): { start: string; end: string } {
  if (days < 1) {
    throw new Error("Days must be at least 1")
  }
  // end = gestern (heute ausgeschlossen)
  const end = getBerlinDateNDaysAgo(1)
  // start = vor N Tagen (N Tage ab gestern)
  const start = getBerlinDateNDaysAgo(days)
  return { start, end }
}

export function filterRecordsByDateRange(
  records: SellerboardDbRow[],
  start: string,
  end: string
): SellerboardDbRow[] {
  const startTime = Date.parse(`${start}T00:00:00Z`)
  const endTime = Date.parse(`${end}T23:59:59Z`)

  return records.filter((record) => {
    const current = Date.parse(`${record.date}T00:00:00Z`)
    return !Number.isNaN(current) && current >= startTime && current <= endTime
  })
}

export function checkForDuplicates(records: SellerboardDbRow[]): void {
  const duplicateCheck = new Map<string, DuplicateKeyDetails>()
  const duplicates: DuplicateKeyDetails[] = []

  records.forEach((record, index) => {
    const duplicateKey = `${record.date}|${record.marketplace}|${record.asin}`
    if (!duplicateCheck.has(duplicateKey)) {
      duplicateCheck.set(duplicateKey, {
        asin: record.asin,
        marketplace: record.marketplace,
        date: record.date,
        index,
      })
    } else {
      duplicates.push({
        asin: record.asin,
        marketplace: record.marketplace,
        date: record.date,
        index,
      })
    }
  })

  if (duplicates.length > 0) {
    throw new SellerboardDuplicateError(
      "Duplikate gefunden (ASIN + Marketplace + Datum müssen eindeutig sein)",
      duplicates
    )
  }
}

function parseNumber(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0
  const cleaned = String(value).replace(/"/g, "").trim()
  const parsed = Number.parseFloat(cleaned)
  return Number.isNaN(parsed) ? 0 : parsed
}

function convertDate(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const raw = String(value).trim()
  if (!raw) return null

  if (raw.includes("/")) {
    const parts = raw.split("/")
    if (parts.length === 3) {
      const [first, second, year] = parts
      const firstNum = Number.parseInt(first, 10)
      const secondNum = Number.parseInt(second, 10)

      if (firstNum > 12) {
        return `${year}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`
      }
      if (secondNum > 12) {
        return `${year}-${first.padStart(2, "0")}-${second.padStart(2, "0")}`
      }
      return `${year}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`
    }
  }

  if (raw.includes(".")) {
    const parts = raw.split(".")
    if (parts.length === 3) {
      const [day, month, year] = parts
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  return null
}


