import { loadRawData } from "@/lib/data-loader"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const account = searchParams.get("account") || "all"
    
    const records = await loadRawData()
    
    let filteredRecords = records
    if (account !== "all") {
      filteredRecords = records.filter((r) => r.account === account)
    }
    
    return NextResponse.json({
      success: true,
      account,
      totalRecords: records.length,
      filteredRecords: filteredRecords.length,
      sample: filteredRecords.slice(0, 5),
      accounts: [...new Set(records.map((r) => r.account))],
      dateRange: {
        min: filteredRecords.length > 0 ? filteredRecords[0].date : null,
        max: filteredRecords.length > 0 ? filteredRecords[filteredRecords.length - 1].date : null,
      },
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

