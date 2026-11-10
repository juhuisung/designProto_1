import type { RealtimeChannel } from "@supabase/supabase-js"
import { DEVICE_ID, MAX_POINTS, SENSOR_MAX, SENSOR_MIN } from "../product"
import { db, IS_DEMO_MODE } from "./supabase"

export type Reading = {
  value: number
  created_at: string
}

export type Status = "disconnected" | "connecting" | "connected" | "error"

type ConnectOptions = {
  onInit: (rows: Reading[]) => void
  onReading: (row: Reading) => void
  onStatus: (status: Status) => void
}

let channel: RealtimeChannel | null = null
let demoTimer: ReturnType<typeof setInterval> | null = null
let demoPower = false

function stopDemo() {
  if (demoTimer !== null) {
    clearInterval(demoTimer)
    demoTimer = null
  }
}

function createDemoValue(elapsed: number) {
  const slowWave = Math.sin(elapsed / 3600)
  const detailWave = Math.sin(elapsed / 1100) * 0.12
  const level = Math.min(1, Math.max(0, 0.5 + slowWave * 0.36 + detailWave))
  return Math.round(SENSOR_MIN + level * (SENSOR_MAX - SENSOR_MIN))
}

export async function connectSensor({
  onInit,
  onReading,
  onStatus,
}: ConnectOptions): Promise<void> {
  await disconnectSensor()
  onStatus("connecting")

  if (IS_DEMO_MODE) {
    onInit([])
    const startedAt = Date.now()
    onReading({
      value: createDemoValue(0),
      created_at: new Date().toISOString(),
    })
    demoTimer = setInterval(() => {
      onReading({
        value: createDemoValue(Date.now() - startedAt),
        created_at: new Date().toISOString(),
      })
    }, 500)
    onStatus("connected")
    return
  }

  if (!db) {
    onStatus("error")
    return
  }

  const { data, error } = await db
    .from("sensor_readings")
    .select("value, created_at")
    .eq("device_id", DEVICE_ID)
    .order("created_at", { ascending: false })
    .limit(MAX_POINTS)

  if (error) {
    onStatus("error")
    return
  }

  onInit((data as Reading[]).reverse())
  channel = db
    .channel(`sensor-readings-${DEVICE_ID}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "sensor_readings",
        filter: `device_id=eq.${DEVICE_ID}`,
      },
      (payload) => {
        const row = payload.new as Partial<Reading>
        if (typeof row.value === "number" && row.created_at) {
          onReading({ value: row.value, created_at: row.created_at })
        }
      },
    )
    .subscribe((subscriptionStatus) => {
      if (subscriptionStatus === "SUBSCRIBED") onStatus("connected")
      if (
        subscriptionStatus === "CHANNEL_ERROR" ||
        subscriptionStatus === "TIMED_OUT"
      ) {
        onStatus("error")
      }
    })
}

export async function disconnectSensor(): Promise<void> {
  stopDemo()
  if (channel && db) {
    await db.removeChannel(channel)
    channel = null
  }
}

export async function setLedPower(on: boolean): Promise<boolean> {
  if (IS_DEMO_MODE) {
    demoPower = on
    return true
  }

  if (!db) return false
  const { error } = await db
    .from("device_state")
    .update({ led_on: on, updated_at: new Date().toISOString() })
    .eq("device_id", DEVICE_ID)

  return error === null
}

export async function loadPower(): Promise<boolean> {
  if (IS_DEMO_MODE) return demoPower
  if (!db) return false

  const { data, error } = await db
    .from("device_state")
    .select("led_on")
    .eq("device_id", DEVICE_ID)
    .maybeSingle()

  return error === null && data?.led_on === true
}
