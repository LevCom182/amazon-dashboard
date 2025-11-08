import type { ReactNode } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface KpiCardProps {
  title: string
  value: ReactNode
  description?: ReactNode
}

export function KpiCard({ title, value, description }: KpiCardProps) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <CardDescription className="text-3xl font-semibold text-foreground">{value}</CardDescription>
      </CardHeader>
      {description ? <CardContent className="text-xs text-muted-foreground">{description}</CardContent> : null}
    </Card>
  )
}




