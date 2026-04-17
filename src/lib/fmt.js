// Pure-JS numeric formatters for money, prices, points, percents, R:R.
// All functions return '—' for null / undefined / NaN inputs.
// Formatters are cached at module scope to avoid re-instantiating Intl.NumberFormat.

const DASH = '—'

const moneyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const moneyCompactFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const priceFmtCache = new Map()
function priceFmt(decimals) {
  let fmt = priceFmtCache.get(decimals)
  if (!fmt) {
    fmt = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    priceFmtCache.set(decimals, fmt)
  }
  return fmt
}

function isValidNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Format money. Example: 5200 -> "$5,200", compact:true -> "$5.2K".
 * @param {number} value
 * @param {{compact?: boolean}} [opts]
 * @returns {string}
 */
export function fmtMoney(value, { compact = false } = {}) {
  if (!isValidNumber(value)) return DASH
  return compact ? moneyCompactFmt.format(value) : moneyFmt.format(value)
}

/**
 * Format a chart price. Example: 5200.25 -> "5,200.25".
 * @param {number} value
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function fmtPrice(value, decimals = 2) {
  if (!isValidNumber(value)) return DASH
  return priceFmt(decimals).format(value)
}

/**
 * Format points with explicit sign. Example: 5.25 -> "+5.25", -3 -> "-3.00".
 * @param {number} value
 * @returns {string}
 */
export function fmtPoints(value) {
  if (!isValidNumber(value)) return DASH
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${priceFmt(2).format(Math.abs(value))}`
}

/**
 * Format a percent with explicit sign. Example: 1.25 -> "+1.25%".
 * @param {number} value
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function fmtPct(value, decimals = 2) {
  if (!isValidNumber(value)) return DASH
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${priceFmt(decimals).format(Math.abs(value))}%`
}

/**
 * Format a risk:reward ratio. Invalid if risk<=0 or either side NaN.
 * Example: fmtRR(1, 2.35) -> "1:2.35".
 * @param {number} risk
 * @param {number} reward
 * @returns {string}
 */
export function fmtRR(risk, reward) {
  if (!isValidNumber(risk) || !isValidNumber(reward)) return DASH
  if (risk <= 0) return DASH
  const ratio = reward / risk
  if (!isValidNumber(ratio)) return DASH
  return `1:${priceFmt(2).format(ratio)}`
}

/**
 * Format a signed number. Example: 3 -> "+3.00", -2 -> "-2.00", 0 -> "0.00".
 * @param {number} value
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function fmtSigned(value, decimals = 2) {
  if (!isValidNumber(value)) return DASH
  if (value === 0) return priceFmt(decimals).format(0)
  const sign = value > 0 ? '+' : '-'
  return `${sign}${priceFmt(decimals).format(Math.abs(value))}`
}
