import { loadRawData } from "@/lib/data-loader"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const records = await loadRawData()
    return NextResponse.json({
      success: true,
      count: records.length,
      sample: records.slice(0, 5),
      accounts: [...new Set(records.map((r) => r.account))],
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

