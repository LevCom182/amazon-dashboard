export type AccountId = "LevCom" | "Happybrush" | "AluVerkauf" | "DOG1"

export interface RawRecord {
  date: string
  account: AccountId
  marketplace: string
  asin: string
  sku: string
  name: string
  salesOrganic: number
  salesPpc: number
  salesSponsoredProducts: number
  salesSponsoredDisplay: number
  unitsOrganic: number
  unitsPpc: number
  unitsSponsoredProducts: number
  unitsSponsoredDisplay: number
  refunds: number
  valueReturned: number
  sponsoredProductsCost: number
  sponsoredDisplayCost: number
  sponsoredBrandsCost: number
  sponsoredBrandsVideoCost: number
  adsSpend: number
  netProfit: number
  productCost: number
  marginPercent: number
}

export interface KpiSet {
  revenue: number
  units: number
  refunds: number
  refundValue: number
  ppcSpend: number
  tacos: number
  netProfit: number
  margin: number
}

export interface AccountGroup {
  account: AccountId
  kpis: KpiSet
  countries: CountryGroup[]
}

export interface CountryGroup {
  marketplace: string
  kpis: KpiSet
  products: ProductGroup[]
}

export interface ProductGroup {
  asin: string
  sku: string
  name: string
  kpis: KpiSet
  records: RawRecord[]
}

export interface DailyKpiPoint {
  date: string
  revenue: number
  units: number
  refunds: number
  refundValue: number
  ppcSpend: number
  tacos: number
  margin: number
  netProfit: number
}

export type DailyMetricKey = Exclude<keyof DailyKpiPoint, "date">




