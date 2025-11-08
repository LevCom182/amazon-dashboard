import { NextResponse } from "next/server"

import {
  SELLERBOARD_ACCOUNT_CONFIG,
  checkForDuplicates,
  fetchSellerboardCsv,
  filterRecordsByDateRange,
  getInclusiveDateRange,
  parseSellerboardCsv,
  SellerboardDuplicateError,
  type SellerboardDbRow,
} from "@/lib/sellerboard-import"
import { getSupabaseServiceClient } from "@/lib/supabaseServer"
import type { AccountId } from "@/lib/types"

export const runtime = "nodejs"

const ACCOUNTS: AccountId[] = ["LevCom", "Happybrush", "AluVerkauf", "DOG1"]
const BATCH_SIZE = 500

interface AccountLog {
  account: AccountId
  table?: string
  steps: string[]
}

export async function GET() {
  const startedAt = new Date().toISOString()
  console.log(`[Cron] Sellerboard Import gestartet um ${startedAt}`)

  const supabase = getSupabaseServiceClient()
  const sevenDayRange = getInclusiveDateRange(7)
  const thirtyDayRange = getInclusiveDateRange(30)

  const summary: AccountLog[] = []

  for (const account of ACCOUNTS) {
    const accountLog: AccountLog = {
      account,
      table: SELLERBOARD_ACCOUNT_CONFIG[account]?.table,
      steps: [],
    }

    try {
      const config = SELLERBOARD_ACCOUNT_CONFIG[account]
      if (!config) {
        throw new Error(`Keine Sellerboard-Konfiguration für Account "${account}" gefunden`)
      }

      const url = config.url
      accountLog.steps.push(`Download-URL geprüft: ${url}`)

      await assertUrlReachable(url, accountLog)

      console.log(`[Cron][${account}] Lade CSV-Daten ...`)
      const csv = await fetchSellerboardCsv(account)

      console.log(`[Cron][${account}] CSV erhalten, beginne Parsing`)
      const parseResult = parseSellerboardCsv(csv)

      accountLog.steps.push(
        `CSV geparst: ${parseResult.records.length} Zeilen, ${parseResult.skippedRows} übersprungen`
      )

      if (parseResult.missingColumns.length > 0) {
        accountLog.steps.push(
          `Fehlende Spalten im CSV: ${parseResult.missingColumns.join(", ")}`
        )
        console.warn(
          `[Cron][${account}] Fehlende Spalten im CSV: ${parseResult.missingColumns.join(", ")}`
        )
      }

      const filteredRecords = filterRecordsByDateRange(
        parseResult.records,
        thirtyDayRange.start,
        thirtyDayRange.end
      )
      accountLog.steps.push(`Datensätze nach 30-Tage-Fenster: ${filteredRecords.length}`)

      console.log(
        `[Cron][${account}] Entferne Datensätze in Supabase für Zeitraum ${sevenDayRange.start} bis ${sevenDayRange.end}`
      )
      const { error: deleteError, count: deletedCount } = await (supabase as any)
        .from(config.table)
        .delete({ count: "exact" })
        .gte("date", sevenDayRange.start)
        .lte("date", sevenDayRange.end)

      if (deleteError) {
        throw new Error(
          `Fehler beim Löschen der letzten 7 Tage in ${config.table}: ${deleteError.message}`
        )
      }

      accountLog.steps.push(`Gelöschte Zeilen (letzte 7 Tage): ${deletedCount ?? 0}`)

      // Nach dem Löschen werden nur die letzten 7 Tage neu importiert
      // Die Tage 8-30 bleiben unverändert in der DB
      const recentRangeRecords = filterRecordsByDateRange(
        filteredRecords,
        sevenDayRange.start,
        sevenDayRange.end
      )

      // Duplikat-Prüfung nur auf die zu importierenden Daten (letzte 7 Tage)
      checkForDuplicates(recentRangeRecords)

      const insertedRecent = await insertRecordsInBatches(
        supabase,
        config.table,
        recentRangeRecords
      )
      accountLog.steps.push(
        `Neu geschriebene Zeilen (letzte 7 Tage): ${insertedRecent.inserted}`
      )

      console.log(
        `[Cron][${account}] Erfolg: ${recentRangeRecords.length} Zeilen für letzte 7 Tage importiert`
      )

      summary.push(accountLog)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unbekannter Fehler beim Import"
      accountLog.steps.push(`❌ Fehler: ${message}`)

      if (error instanceof SellerboardDuplicateError) {
        const duplicateDetails = error.duplicates
          .slice(0, 5)
          .map(
            (duplicate) =>
              `ASIN=${duplicate.asin}, Marketplace=${duplicate.marketplace}, Datum=${duplicate.date}, Index=${duplicate.index}`
          )
          .join(" | ")
        accountLog.steps.push(`Duplikate: ${duplicateDetails}`)
      }

      console.error(`[Cron][${account}] Import fehlgeschlagen`, error)
      summary.push(accountLog)
      return NextResponse.json(
        {
          ok: false,
          startedAt,
          failedAccount: account,
          summary,
        },
        { status: 500 }
      )
    }
  }

  const finishedAt = new Date().toISOString()
  console.log(`[Cron] Sellerboard Import abgeschlossen um ${finishedAt}`)

  return NextResponse.json({
    ok: true,
    startedAt,
    finishedAt,
    sevenDayRange,
    thirtyDayRange,
    summary,
  })
}

async function assertUrlReachable(url: string, accountLog: AccountLog) {
  try {
    const headResponse = await fetch(url, { method: "HEAD" })
    if (!headResponse.ok) {
      accountLog.steps.push(`HEAD-Anfrage fehlgeschlagen (${headResponse.status}), versuche GET`)
    } else {
      accountLog.steps.push("HEAD-Anfrage erfolgreich")
      return
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    accountLog.steps.push(`HEAD-Anfrage nicht möglich: ${message}`)
  }

  const response = await fetch(url, { method: "GET", redirect: "follow" })
  if (!response.ok) {
    throw new Error(`Download-Check fehlgeschlagen: Status ${response.status}`)
  }
  accountLog.steps.push("GET-Prüfung erfolgreich")
}

async function insertRecordsInBatches(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  table: string,
  records: SellerboardDbRow[]
) {
  let inserted = 0
  let batches = 0

  for (let start = 0; start < records.length; start += BATCH_SIZE) {
    const batch = records.slice(start, start + BATCH_SIZE)
    batches += 1

    if (batch.length === 0) continue

    const { error } = await (supabase as any)
      .from(table)
      .upsert(batch, { ignoreDuplicates: false })

    if (error) {
      throw new Error(
        `Fehler beim Upsert in Tabelle ${table} (Batch ${batches}): ${error.message}`
      )
    }

    inserted += batch.length
  }

  return { inserted, batches }
}


