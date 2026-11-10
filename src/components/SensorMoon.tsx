import type { CSSProperties } from "react"
import { moonImageUrl } from "../assets/moonImage"
import { SENSOR_MAX, SENSOR_MIN } from "../product"

type SensorMoonProps = {
  value: number | undefined
  power: boolean
}

const numberFormat = new Intl.NumberFormat("ko-KR")

export function SensorMoon({ value, power }: SensorMoonProps) {
  const level =
    value === undefined
      ? 0
      : Math.min(
          1,
          Math.max(0, (value - SENSOR_MIN) / (SENSOR_MAX - SENSOR_MIN)),
        )
  const percent = Math.round(level * 100)
  const moonStyle = { "--level": level } as CSSProperties

  return (
    <section className="moon-section" aria-label="달 상태">
      <div
        className="moon"
        data-power={power ? "on" : "off"}
        style={moonStyle}
        role="img"
        aria-label={power ? `달 밝기 ${percent}%` : "달 꺼짐"}
      >
        <img src={moonImageUrl} alt="" />
      </div>
      <p className="t-value sensor-value">
        {value === undefined ? "—" : numberFormat.format(value)}
      </p>
    </section>
  )
}
