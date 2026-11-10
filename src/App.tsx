import { useCallback, useEffect, useState } from "react"
import { ConnectionControl } from "./components/ConnectionControl"
import { PowerToggle } from "./components/PowerToggle"
import { ProductHeader } from "./components/ProductHeader"
import { SensorChart } from "./components/SensorChart"
import { SensorMoon } from "./components/SensorMoon"
import {
  connectSensor,
  disconnectSensor,
  loadPower,
  type Reading,
  type Status,
} from "./lib/device"
import { MAX_POINTS } from "./product"

export default function App() {
  const [status, setStatus] = useState<Status>("disconnected")
  const [power, setPower] = useState(false)
  const [readings, setReadings] = useState<Reading[]>([])

  const handleReading = useCallback((reading: Reading) => {
    setReadings((current) => [...current, reading].slice(-MAX_POINTS))
  }, [])

  const handleConnect = useCallback(async () => {
    if (status === "connected") {
      await disconnectSensor()
      setStatus("disconnected")
      return
    }

    await connectSensor({
      onInit: (initialReadings) =>
        setReadings(initialReadings.slice(-MAX_POINTS)),
      onReading: handleReading,
      onStatus: setStatus,
    })
  }, [handleReading, status])

  useEffect(() => {
    let active = true

    void loadPower().then((initialPower) => {
      if (active) setPower(initialPower)
    })

    return () => {
      active = false
      void disconnectSensor()
    }
  }, [])

  const currentValue = readings.at(-1)?.value

  return (
    <main className="app-shell">
      <ProductHeader />
      <SensorMoon value={currentValue} power={power} />
      <div className="dashboard-grid">
        <section className="controls" aria-label="조명 제어">
          <ConnectionControl status={status} onToggle={handleConnect} />
          <PowerToggle power={power} setPower={setPower} />
        </section>
        <SensorChart readings={readings} />
      </div>
    </main>
  )
}
