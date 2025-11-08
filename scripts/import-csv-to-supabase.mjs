import { parse } from "csv-parse/sync"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase Credentials aus Umgebungsvariablen oder direkt setzen
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://ntvgrfkptgnzadbifgfh.supabase.co"
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dmdyZmtwdGduemFkYmlmZ2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODk4MTEsImV4cCI6MjA3ODE2NTgxMX0.ScIC1VGnH_4JHjs5NGkXrbtuqL4LS6Rs6A0_g-LxBqU"

if (!supabaseUrl || !supabaseKey) {
  console.error("Fehler: SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const INPUT_DIR = path.join(__dirname, "..", "input")

const accountTableMap = {
  levcom: "levcom_data",
  happybrush: "happybrush_data",
  alu_verkauf: "alu_verkauf_data",
  dog1: "dog1_data",
}

// Funktion zum Konvertieren verschiedener Datumsformate zu YYYY-MM-DD
function convertDate(dateStr) {
  if (!dateStr) return null
  
  // Format: DD/MM/YYYY oder MM/DD/YYYY (z.B. "07/10/2025" oder "13/10/2025")
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/")
    if (parts.length === 3) {
      const [first, second, year] = parts
      if (first && second && year) {
        const firstNum = parseInt(first, 10)
        const secondNum = parseInt(second, 10)
        
        // Wenn der erste Teil > 12 ist, dann ist es DD/MM/YYYY
        if (firstNum > 12) {
          // DD/MM/YYYY
          return `${year}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`
        } else {
          // MM/DD/YYYY
          return `${year}-${first.padStart(2, "0")}-${second.padStart(2, "0")}`
        }
      }
    }
  }
  
  // Format: DD.MM.YYYY (z.B. "07.10.2025")
  if (dateStr.includes(".")) {
    const parts = dateStr.split(".")
    if (parts.length === 3) {
      const [day, month, year] = parts
      if (day && month && year) {
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      }
    }
  }
  
  return null
}

// Funktion zum Parsen von Zahlen
// Die CSV verwendet Punkt als Dezimaltrennzeichen (z.B. "345.45")
// Keine Tausendertrennzeichen in den Daten
function parseNumber(value) {
  if (!value || value === "") return 0
  // Entferne Anführungszeichen falls vorhanden
  const cleaned = String(value).replace(/"/g, "").trim()
  // Direktes Parsen, da Punkt als Dezimaltrennzeichen verwendet wird
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

// Funktion zum Parsen von Integers
function parseInt(value) {
  if (!value || value === "") return 0
  const cleaned = String(value).replace(/[^0-9.-]/g, "")
  const parsed = Number.parseInt(cleaned, 10)
  return isNaN(parsed) ? 0 : parsed
}

async function importCsvFile(fileName, tableName) {
  const filePath = path.join(INPUT_DIR, fileName)
  console.log(`\n📄 Lese Datei: ${fileName}`)

  const csv = readFileSync(filePath, "utf8")
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  })

  console.log(`   Gefunden: ${records.length} Datensätze`)

  // Daten transformieren - verwende safeGet für fehlende Spalten
  const safeGet = (obj, key, defaultValue = 0) => {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key]
    }
    return defaultValue
  }

  // Funktion zum Konvertieren von Datumsangaben
  // Standardmäßig DD/MM/YYYY (deutsches Format)
  const convertDateWithFormat = (dateStr) => {
    if (!dateStr) return null
    
    // Format: DD/MM/YYYY oder MM/DD/YYYY
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/")
      if (parts.length === 3) {
        const [first, second, year] = parts
        if (first && second && year) {
          const firstNum = parseInt(first, 10)
          const secondNum = parseInt(second, 10)
          
          // Wenn der erste Teil > 12 ist, dann ist es eindeutig DD/MM/YYYY
          if (firstNum > 12) {
            // DD/MM/YYYY: first = Tag, second = Monat
            return `${year}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`
          }
          // Wenn der zweite Teil > 12 ist, dann ist es eindeutig MM/DD/YYYY
          else if (secondNum > 12) {
            // MM/DD/YYYY: first = Monat, second = Tag
            return `${year}-${first.padStart(2, "0")}-${second.padStart(2, "0")}`
          }
          // Wenn beide <= 12 sind, verwende DD/MM/YYYY (deutsches Format)
          else {
            // DD/MM/YYYY: first = Tag, second = Monat
            return `${year}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`
          }
        }
      }
    }
    
    // Format: DD.MM.YYYY (deutsches Format)
    if (dateStr.includes(".")) {
      const parts = dateStr.split(".")
      if (parts.length === 3) {
        const [day, month, year] = parts
        if (day && month && year) {
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
        }
      }
    }
    
    return null
  }

  const transformed = records.map((record) => ({
    date: convertDateWithFormat(record.Date),
    marketplace: record.Marketplace || "",
    asin: record.ASIN || "",
    sku: record.SKU || "",
    name: record.Name || "",
    sales_organic: parseNumber(safeGet(record, "SalesOrganic")),
    sales_ppc: parseNumber(safeGet(record, "SalesPPC")),
    sales_sponsored_products: parseNumber(safeGet(record, "SalesSponsoredProducts")),
    sales_sponsored_display: parseNumber(safeGet(record, "SalesSponsoredDisplay")),
    units_organic: parseInt(safeGet(record, "UnitsOrganic")),
    units_ppc: parseInt(safeGet(record, "UnitsPPC")),
    units_sponsored_products: parseInt(safeGet(record, "UnitsSponsoredProducts")),
    units_sponsored_display: parseInt(safeGet(record, "UnitsSponsoredDisplay")),
    refunds: parseInt(safeGet(record, "Refunds")),
    promo_value: parseNumber(safeGet(record, "PromoValue")),
    sponsored_products: parseNumber(safeGet(record, "SponsoredProducts")),
    sponsored_display: parseNumber(safeGet(record, "SponsoredDisplay")),
    sponsored_brands: parseNumber(safeGet(record, "SponsoredВrands") || safeGet(record, "SponsoredBrands")),
    sponsored_brands_video: parseNumber(safeGet(record, "SponsoredBrandsVideo")),
    google_ads: parseNumber(safeGet(record, "Google ads")),
    facebook_ads: parseNumber(safeGet(record, "Facebook ads")),
    gift_wrap: parseNumber(safeGet(record, "GiftWrap")),
    shipping: parseNumber(safeGet(record, "Shipping")),
    refund_commission: parseNumber(safeGet(record, "Refund Commission") || safeGet(record, "RefundCost")),
    refund_digital_services_fee: parseNumber(safeGet(record, "Refund DigitalServicesFee")),
    refund_fba_customer_return_per_unit_fee: parseNumber(safeGet(record, "Refund FBACustomerReturnPerUnitFee")),
    refund_goodwill_principal: parseNumber(safeGet(record, "Refund GoodwillPrincipal")),
    refund_principal: parseNumber(safeGet(record, "Refund Principal")),
    refund_promotion: parseNumber(safeGet(record, "Refund Promotion")),
    refund_refund_commission: parseNumber(safeGet(record, "Refund RefundCommission")),
    refund_shipping_charge: parseNumber(safeGet(record, "Refund ShippingCharge")),
    refund_shipping_chargeback: parseNumber(safeGet(record, "Refund ShippingChargeback")),
    refund_shipping_tax: parseNumber(safeGet(record, "Refund ShippingTax")),
    refund_shipping_tax_discount: parseNumber(safeGet(record, "Refund ShippingTaxDiscount")),
    refund_ship_promotion: parseNumber(safeGet(record, "Refund ShipPromotion")),
    refund_tax_discount: parseNumber(safeGet(record, "Refund TaxDiscount")),
    refunds_costs_damaged: parseNumber(safeGet(record, "RefundsCostsDamaged")),
    value_of_returned_items: parseNumber(safeGet(record, "Value of returned items")),
    product_cost_unsellable_refunds: parseNumber(safeGet(record, "ProductCost Unsellable Refunds")),
    commission: parseNumber(safeGet(record, "Commission") || safeGet(record, "AmazonFees")),
    compensated_clawback: parseNumber(safeGet(record, "COMPENSATED_CLAWBACK")),
    digital_services_fee: parseNumber(safeGet(record, "DigitalServicesFee")),
    fba_disposal_fee: parseNumber(safeGet(record, "FBADisposalFee")),
    fba_per_unit_fulfillment_fee: parseNumber(safeGet(record, "FBAPerUnitFulfillmentFee")),
    fba_storage_fee: parseNumber(safeGet(record, "FBAStorageFee")),
    missing_from_inbound: parseNumber(safeGet(record, "MISSING_FROM_INBOUND")),
    missing_from_inbound_clawback: parseNumber(safeGet(record, "MISSING_FROM_INBOUND_CLAWBACK")),
    reversal_reimbursement: parseNumber(safeGet(record, "REVERSAL_REIMBURSEMENT")),
    estimated_payout: parseNumber(safeGet(record, "EstimatedPayout")),
    product_cost_sales: parseNumber(safeGet(record, "ProductCost Sales") || safeGet(record, "Cost of Goods")),
    product_cost_non_amazon: parseNumber(safeGet(record, "ProductCost Non-Amazon")),
    product_cost_multichannel_costs: parseNumber(safeGet(record, "ProductCost MultichannelCosts")),
    product_cost_missing_from_inbound: parseNumber(safeGet(record, "ProductCost MissingFromInbound")),
    product_cost_cost_of_missing_returns: parseNumber(safeGet(record, "ProductCost CostOfMissingReturns")),
    vat: parseNumber(safeGet(record, "VAT")),
    gross_profit: parseNumber(safeGet(record, "GrossProfit")),
    net_profit: parseNumber(safeGet(record, "NetProfit")),
    margin: parseNumber(safeGet(record, "Margin")),
    real_acos: parseNumber(safeGet(record, "Real ACOS")),
    sessions: parseInt(safeGet(record, "Sessions")),
    unit_session_percentage: parseNumber(safeGet(record, "Unit Session Percentage")),
    ads_spend: parseNumber(safeGet(record, "Ads spend")),
    sellable_returns_percent: parseNumber(safeGet(record, "Sellable Returns %")),
    roi: parseNumber(safeGet(record, "ROI")),
  })).filter((row) => row.date !== null) // Filtere ungültige Datumsangaben

  console.log(`   Valide Datensätze: ${transformed.length}`)

  // Daten in Batches einfügen (Supabase hat ein Limit von 1000 Zeilen pro Insert)
  const batchSize = 500
  let inserted = 0
  let errors = 0

  for (let i = 0; i < transformed.length; i += batchSize) {
    const batch = transformed.slice(i, i + batchSize)
    const { data, error } = await supabase.from(tableName).upsert(batch, {
      onConflict: "date,marketplace,asin,sku",
      ignoreDuplicates: false,
    })

    if (error) {
      console.error(`   ❌ Fehler beim Einfügen von Batch ${i / batchSize + 1}:`, error.message)
      errors += batch.length
    } else {
      inserted += batch.length
      console.log(`   ✅ Batch ${i / batchSize + 1} eingefügt (${inserted}/${transformed.length})`)
    }
  }

  return { inserted, errors, total: transformed.length }
}

async function main() {
  console.log("🚀 Starte CSV-Import nach Supabase...\n")

  const files = readdirSync(INPUT_DIR).filter((f) => f.endsWith(".csv"))
  console.log(`Gefundene CSV-Dateien: ${files.length}`)

  for (const fileName of files) {
    const accountName = fileName.replace(".csv", "").toLowerCase()
    const tableName = accountTableMap[accountName]

    if (!tableName) {
      console.warn(`⚠️  Keine Tabelle für Account "${accountName}" gefunden, überspringe...`)
      continue
    }

    try {
      const result = await importCsvFile(fileName, tableName)
      console.log(
        `\n✅ ${fileName}: ${result.inserted} eingefügt, ${result.errors} Fehler von ${result.total} Datensätzen`
      )
    } catch (error) {
      console.error(`\n❌ Fehler beim Import von ${fileName}:`, error.message)
    }
  }

  console.log("\n✨ Import abgeschlossen!")
}

main().catch(console.error)

