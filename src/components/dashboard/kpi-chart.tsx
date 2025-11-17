"use client"

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts"

import { formatCurrency, formatNumber, formatPercent } from "@/lib/format"
import type { DailyKpiPoint, DailyMetricKey } from "@/lib/types"

export interface MetricOption {
  key: DailyMetricKey
  label: string
  color: string
  formatter: (value: number) => string
  axis: "left" | "right"
}

export const KPI_METRIC_OPTIONS: MetricOption[] = [
  {
    key: "revenue",
    label: "Umsatz",
    color: "#2563eb",
    formatter: (value) => formatCurrency(value),
    axis: "left",
  },
  {
    key: "units",
    label: "Units",
    color: "#16a34a",
    formatter: (value) => formatNumber(value),
    axis: "left",
  },
  {
    key: "ppcSpend",
    label: "PPC Spend",
    color: "#7c3aed",
    formatter: (value) => formatCurrency(value),
    axis: "left",
  },
  {
    key: "tacos",
    label: "TACOS",
    color: "#0891b2",
    formatter: (value) => formatPercent(value),
    axis: "right",
  },
  {
    key: "margin",
    label: "Marge",
    color: "#dc2626",
    formatter: (value) => formatPercent(value),
    axis: "right",
  },
]

interface KpiChartProps {
  data: DailyKpiPoint[]
  metricKeys: DailyMetricKey[]
  granularity?: "daily" | "weekly"
}

export function KpiChart({ data, metricKeys, granularity = "daily" }: KpiChartProps) {
  const selected = metricKeys.length > 0 ? metricKeys : [KPI_METRIC_OPTIONS[0].key]
  const metrics = KPI_METRIC_OPTIONS.filter((option) => selected.includes(option.key))

  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 text-sm text-muted-foreground">
        Keine Daten im ausgewählten Zeitraum.
      </div>
    )
  }

  const leftMetrics = metrics.filter((metric) => metric.axis === "left")
  const rightMetrics = metrics.filter((metric) => metric.axis === "right")

  const leftFormatter = leftMetrics[0]?.formatter ?? ((value: number) => formatNumber(value))
  const rightFormatter = rightMetrics[0]?.formatter ?? ((value: number) => formatPercent(value))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, bottom: 10, left: 16, right: 16 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" horizontal={true} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => formatDateTick(value, granularity)}
            tickLine={false}
            axisLine={false}
            minTickGap={20}
          />
          {leftMetrics.length > 0 ? (
            <YAxis
              yAxisId="left"
              tickFormatter={(value) => leftFormatter(Number(value))}
              tickLine={false}
              axisLine={false}
              width={90}
            />
          ) : null}
          {rightMetrics.length > 0 ? (
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(value) => rightFormatter(Number(value))}
              tickLine={false}
              axisLine={false}
              width={90}
            />
          ) : null}
          <Tooltip content={<CustomTooltip metrics={metrics} granularity={granularity} />} />
          <Legend iconType="plainline" />
          {metrics.map((metric) => (
            <Line
              key={metric.key}
              yAxisId={metric.axis}
              type="monotone"
              dataKey={metric.key}
              stroke={metric.color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface CustomTooltipProps extends TooltipProps<number, string> {
  metrics: MetricOption[]
  payload?: Array<{ dataKey?: string; value?: number; stroke?: string }>
  label?: string
}

interface CustomTooltipPropsWithGranularity extends CustomTooltipProps {
  granularity?: "daily" | "weekly"
}

function CustomTooltip({ active, payload, label, metrics, granularity = "daily" }: CustomTooltipPropsWithGranularity) {
  if (!active || !payload || payload.length === 0) return null
  const mapped = payload
    .map((entry) => {
      const metric = metrics.find((item) => item.key === entry.dataKey)
      if (!metric) return null
      return {
        label: metric.label,
        color: metric.color,
        value: metric.formatter(Number(entry.value ?? 0)),
      }
    })
    .filter(Boolean) as Array<{ label: string; color: string; value: string }>

  const dateLabel = formatDateLabel(label, granularity)
  const weekdayLabel = formatWeekdayLabel(label, granularity)

  return (
    <div className="rounded-md border bg-background px-3 py-2 shadow-md">
      <div className="text-xs text-muted-foreground">{dateLabel}</div>
      {weekdayLabel && <div className="text-xs text-muted-foreground">{weekdayLabel}</div>}
      <div className="mt-1 space-y-1">
        {mapped.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm text-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="flex-1 text-muted-foreground">{item.label}</span>
            <span className="font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatDateTick(value: string, granularity: "daily" | "weekly" = "daily") {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  
  if (granularity === "weekly") {
    // Zeige Woche als "KW XX" oder "Mo DD.MM"
    const weekNumber = getWeekNumber(date)
    return `KW ${weekNumber}`
  }
  
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
}

function formatDateLabel(value?: string, granularity: "daily" | "weekly" = "daily") {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  
  if (granularity === "weekly") {
    // Zeige Woche als "KW XX (Mo DD.MM - So DD.MM)"
    const weekNumber = getWeekNumber(date)
    const monday = date
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6) // Sonntag ist 6 Tage nach Montag
    
    const mondayStr = monday.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
    const sundayStr = sunday.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
    
    return `KW ${weekNumber} (${mondayStr} - ${sundayStr})`
  }
  
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatWeekdayLabel(value?: string, granularity: "daily" | "weekly" = "daily") {
  if (!value || granularity === "weekly") return null // Kein Wochentag für wöchentliche Ansicht
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  
  const weekday = date.toLocaleDateString("de-DE", { weekday: "long" })
  return weekday.charAt(0).toUpperCase() + weekday.slice(1) // Erster Buchstabe groß
}

// Funktion zur Berechnung der Kalenderwoche (ISO 8601)
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

