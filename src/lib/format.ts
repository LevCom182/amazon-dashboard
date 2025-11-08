export function formatCurrency(value: number, locale = "de-DE", currency = "EUR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number, locale = "de-DE") {
  return new Intl.NumberFormat(locale).format(value)
}

export function formatPercent(value: number, locale = "de-DE", fractionDigits = 1) {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value)
}




