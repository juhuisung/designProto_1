import { useEffect, useRef, useState } from "react"
import type { Reading } from "../lib/device"
import { SENSOR_MAX } from "../product"

type SensorChartProps = {
  readings: Reading[]
}

const HEIGHT = 200
const PADDING = { left: 40, right: 8, top: 8, bottom: 20 }

export function SensorChart({ readings }: SensorChartProps) {
  const containerRef = useRef<HTMLElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateWidth = () => setWidth(container.clientWidth)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const plotWidth = Math.max(0, width - PADDING.left - PADDING.right)
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
  const points = readings
    .map((reading, index) => {
      const x =
        readings.length <= 1
          ? PADDING.left + plotWidth
          : PADDING.left + (index / (readings.length - 1)) * plotWidth
      const normalized = Math.min(1, Math.max(0, reading.value / SENSOR_MAX))
      const y = PADDING.top + (1 - normalized) * plotHeight
      return `${x},${y}`
    })
    .join(" ")
  const currentValue = readings.at(-1)?.value
  const chartLabel =
    currentValue === undefined
      ? "센서값 추이, 현재 값 없음"
      : `센서값 추이, 현재 ${currentValue}`

  return (
    <section
      className="sensor-chart"
      aria-label="실시간 센서값"
      ref={containerRef}
    >
      {readings.length === 0 ? (
        <p className="t-body chart-empty">
          센서를 연결하면 값이 여기에 그려집니다.
        </p>
      ) : (
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={chartLabel}
        >
          {[0, 0.5, 1].map((ratio) => {
            const y = PADDING.top + (1 - ratio) * plotHeight
            const value = Math.round(SENSOR_MAX * ratio)
            return (
              <g key={ratio}>
                <line
                  className="chart-grid-line"
                  x1={PADDING.left}
                  x2={width - PADDING.right}
                  y1={y}
                  y2={y}
                />
                <text
                  className="chart-label"
                  x={PADDING.left - PADDING.right}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {value}
                </text>
              </g>
            )
          })}
          <polyline className="chart-line" points={points} />
          <text
            className="chart-label"
            x={PADDING.left}
            y={HEIGHT}
            dominantBaseline="text-after-edge"
          >
            −60s
          </text>
          <text
            className="chart-label"
            x={width - PADDING.right}
            y={HEIGHT}
            textAnchor="end"
            dominantBaseline="text-after-edge"
          >
            지금
          </text>
        </svg>
      )}
    </section>
  )
}
