import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
} from "recharts"

import { formatCurrency, formatNumber } from "@/lib/format"
import type { DailyKpiPoint, DailyMetricKey } from "@/lib/types"

interface SparklineProps {
  data: DailyKpiPoint[]
  metric: DailyMetricKey
  color?: string
  formatter?: (value: number) => string
}

export function Sparkline({ data, metric, color = "#2563eb", formatter }: SparklineProps) {
  const format =
    formatter ??
    (metric === "revenue" || metric === "netProfit" || metric === "refundValue" || metric === "ppcSpend"
      ? formatCurrency
      : formatNumber)

  return (
    <div className="h-24 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" hide />
          <Tooltip content={<CustomTooltip formatter={format} />} cursor={{ stroke: color, strokeOpacity: 0.15 }} />
          <Line
            type="monotone"
            dataKey={metric}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface CustomTooltipProps extends TooltipProps<number, string> {
  formatter: (value: number) => string
  payload?: Array<{ value?: number }>
}

function CustomTooltip({ active, payload, formatter }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-lg">
      <div className="font-medium text-foreground">{formatter(Number(payload[0]?.value ?? 0))}</div>
    </div>
  )
}

