import clsx from 'clsx'

/**
 * Base Skeleton — a shimmering rectangle. Callers control size via className/style.
 */
export function Skeleton({ className = '', style = {} }) {
  return <div className={clsx('skeleton', className)} style={style} aria-hidden="true" />
}

/**
 * A rectangular skeleton block, common for text lines or small placeholders.
 */
export function SkeletonBlock({ height = 16, width = '100%', radius = 6 }) {
  return (
    <Skeleton
      style={{
        height,
        width,
        borderRadius: radius,
      }}
    />
  )
}

/**
 * A chart-shaped placeholder. Mimics candles + axis with inline-styled bars.
 */
export function SkeletonChart({ height = 420 }) {
  const candleWidths = [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8]
  const candleHeights = [40, 65, 30, 55, 80, 45, 70, 35, 60, 50, 75, 42]

  return (
    <div
      className="skeleton-chart"
      style={{
        position: 'relative',
        width: '100%',
        height,
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 16,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {/* Axis shimmer bar along the bottom */}
      <Skeleton
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          height: 10,
          borderRadius: 4,
        }}
      />
      {/* Y-axis shimmer strip */}
      <Skeleton
        style={{
          position: 'absolute',
          top: 16,
          bottom: 40,
          right: 16,
          width: 36,
          borderRadius: 4,
        }}
      />
      {/* Candle silhouettes */}
      <div
        style={{
          position: 'absolute',
          left: 24,
          right: 60,
          top: 24,
          bottom: 40,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        {candleHeights.map((h, i) => (
          <Skeleton
            key={i}
            style={{
              width: candleWidths[i % candleWidths.length],
              height: `${h}%`,
              borderRadius: 2,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default Skeleton
