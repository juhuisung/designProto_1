import { createClient } from "@supabase/supabase-js"
import { useEffect, useMemo, useState } from "react"
import { clueLabels, crimeData, type ClueKey } from "./data"

const format = new Intl.NumberFormat("ko-KR")
const sensorFormat = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 3,
})
const percent = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 })
const compact = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
})

interface Reading {
  id: number | string
  value: number
  created_at: string
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

function parseReading(row: Record<string, unknown>): Reading | null {
  if (
    typeof row.value !== "number" &&
    (typeof row.value !== "string" || !row.value.trim())
  ) {
    return null
  }
  const value = Number(row.value)
  if (
    (typeof row.id !== "number" && typeof row.id !== "string") ||
    typeof row.created_at !== "string" ||
    Number.isNaN(Date.parse(row.created_at)) ||
    !Number.isFinite(value)
  ) {
    return null
  }
  return { id: row.id, value, created_at: row.created_at }
}

function mergeReadings(...groups: Reading[][]): Reading[] {
  const byId = new Map<string, Reading>()
  for (const reading of groups.flat()) {
    byId.set(String(reading.id), reading)
  }
  return [...byId.values()]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-100)
}

const COLORS = [
  "#ff5c35",
  "#ff9f1c",
  "#7d5fff",
  "#13a47a",
  "#3c82f6",
  "#9aa4b2",
]
const clueKeys: ClueKey[] = [
  "flagrant",
  "complaint",
  "accusation",
  "surrender",
  "reportTotal",
  "petition",
  "stopQuestion",
  "body",
  "otherCrimeEvidence",
  "inquiryMedia",
  "crackdown",
  "agencyRequest",
  "other",
]

function AppIcon({ name }: { name: "grid" | "chart" | "info" }) {
  const paths = {
    grid: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
    chart: <path d="M4 19V9m6 10V4m6 15v-7m5 7H2" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5m0-8h.01" />
      </>
    ),
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  )
}

export default function App() {
  const categoryRows = useMemo(
    () =>
      crimeData
        .filter((row) => row.crime === "소계" && row.group !== "계")
        .sort((a, b) => b.total - a.total),
    [],
  )
  const [selectedGroup, setSelectedGroup] = useState<string>("전체 범죄")
  const [metric, setMetric] = useState<ClueKey>("total")

  const totalRow = crimeData[0]
  const activeRow =
    selectedGroup === "전체 범죄"
      ? totalRow
      : (categoryRows.find((row) => row.group === selectedGroup) ?? totalRow)
  const maxCategory = Math.max(...categoryRows.map((row) => row[metric]))
  const clueBreakdown = clueKeys
    .map((key) => ({ key, label: clueLabels[key], value: activeRow[key] }))
    .sort((a, b) => b.value - a.value)
  const topClues = clueBreakdown.slice(0, 5)
  const otherClues = clueBreakdown
    .slice(5)
    .reduce((sum, item) => sum + item.value, 0)
  const donutItems = [
    ...topClues,
    { key: "other" as const, label: "그 외 단서", value: otherClues },
  ]
  const donutTotal = donutItems.reduce((sum, item) => sum + item.value, 0)
  let progress = 0
  const gradient = donutItems
    .map((item, index) => {
      const start = progress
      progress += (item.value / donutTotal) * 100
      return `${COLORS[index]} ${start}% ${progress}%`
    })
    .join(", ")
  const detailRows =
    selectedGroup === "전체 범죄"
      ? categoryRows.slice(0, 8)
      : crimeData
          .filter((row) => row.group === selectedGroup && row.crime !== "소계")
          .sort((a, b) => b.total - a.total)
          .slice(0, 8)

  return (
    <div className="min-h-screen bg-[#f3f5f7] text-[#17202a]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="logo-mark">
              <span />
              <span />
              <span />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400">
                KOSIS DATA VIEW
              </p>
              <p className="text-[15px] font-extrabold">대한민국 범죄 통계</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            국가통계포털 원자료 · 2025
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-7 lg:px-10 lg:py-10">
        <section className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#ff5c35]">
              <span className="rounded-full bg-[#ffede8] px-3 py-1.5">
                범죄의 수사단서
              </span>
              <span className="text-slate-400">단위: 건</span>
            </div>
            <h1 className="text-3xl font-black tracking-[-0.045em] sm:text-[42px]">
              범죄는 어떻게 발견될까?
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
              범죄 유형별 수사 착수 단서를 비교하고, 신고와 고소 등 주요 경로를
              살펴보세요.
            </p>
          </div>
          <label className="filter-select">
            <span>분석 대상</span>
            <select
              value={selectedGroup}
              onChange={(event) => setSelectedGroup(event.target.value)}
            >
              <option>전체 범죄</option>
              {categoryRows.map((row) => (
                <option key={row.group}>{row.group}</option>
              ))}
            </select>
          </label>
        </section>

        <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="전체 범죄 건수"
            value={activeRow.total}
            note="2025년 수사단서 집계"
            accent
          />
          <StatCard
            label="가장 많은 수사단서"
            value={clueBreakdown[0].value}
            note={`${clueBreakdown[0].label} · ${percent.format((clueBreakdown[0].value / activeRow.total) * 100)}%`}
          />
          <StatCard
            label="피해자 직접 신고"
            value={activeRow.reportVictim}
            note={`전체의 ${percent.format((activeRow.reportVictim / activeRow.total) * 100)}%`}
          />
          <StatCard
            label="현행범 검거"
            value={activeRow.flagrant}
            note={`전체의 ${percent.format((activeRow.flagrant / activeRow.total) * 100)}%`}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">범죄 유형 비교</p>
                <h2>범죄군별 수사단서 규모</h2>
              </div>
              <select
                className="mini-select"
                value={metric}
                onChange={(event) => setMetric(event.target.value as ClueKey)}
              >
                {Object.entries(clueLabels)
                  .filter(
                    ([key]) => !["reportVictim", "reportOther"].includes(key),
                  )
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
            <div className="bar-list">
              {categoryRows.map((row, index) => (
                <button
                  className={`bar-row ${
                    selectedGroup === row.group ? "active" : ""
                  }`}
                  key={row.group}
                  onClick={() => setSelectedGroup(row.group)}
                >
                  <span className="rank">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="bar-label">{row.group}</span>
                  <span className="bar-track">
                    <span
                      className="bar-fill"
                      style={{
                        width: `${Math.max((row[metric] / maxCategory) * 100, 0.5)}%`,
                      }}
                    />
                  </span>
                  <strong>{compact.format(row[metric])}</strong>
                </button>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">{selectedGroup}</p>
                <h2>수사단서 구성</h2>
              </div>
              <span className="soft-badge">상위 5개</span>
            </div>
            <div className="donut-wrap">
              <div
                className="donut"
                style={{ background: `conic-gradient(${gradient})` }}
              >
                <div className="donut-hole">
                  <span>수사단서</span>
                  <strong>{compact.format(activeRow.total)}</strong>
                  <small>건</small>
                </div>
              </div>
              <div className="legend">
                {donutItems.map((item, index) => (
                  <div className="legend-row" key={`${item.key}-${item.label}`}>
                    <span
                      className="legend-dot"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span>{item.label}</span>
                    <strong>
                      {percent.format((item.value / donutTotal) * 100)}%
                    </strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="insight">
              <AppIcon name="info" />
              <p>
                <strong>{clueBreakdown[0].label}</strong>가 가장 큰 비중을
                차지하며, 총{" "}
                <strong>{format.format(clueBreakdown[0].value)}건</strong>
                입니다.
              </p>
            </div>
          </article>
        </section>

        <section className="panel mt-5 overflow-hidden">
          <div className="panel-head">
            <div>
              <p className="eyebrow">상세 데이터</p>
              <h2>
                {selectedGroup === "전체 범죄"
                  ? "주요 범죄군 순위"
                  : `${selectedGroup} 세부 죄종`}
              </h2>
            </div>
            {selectedGroup !== "전체 범죄" && (
              <button
                className="text-button"
                onClick={() => setSelectedGroup("전체 범죄")}
              >
                전체 보기
              </button>
            )}
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>순위</th>
                  <th>범죄 유형</th>
                  <th>전체</th>
                  <th>신고</th>
                  <th>고소</th>
                  <th>현행범</th>
                  <th>단속</th>
                  <th>신고 비율</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map((row, index) => (
                  <tr key={`${row.group}-${row.crime}`}>
                    <td>
                      <span className="table-rank">{index + 1}</span>
                    </td>
                    <td>
                      <strong>
                        {row.crime === "소계" ? row.group : row.crime}
                      </strong>
                    </td>
                    <td>{format.format(row.total)}</td>
                    <td>{format.format(row.reportTotal)}</td>
                    <td>{format.format(row.complaint)}</td>
                    <td>{format.format(row.flagrant)}</td>
                    <td>{format.format(row.crackdown)}</td>
                    <td>
                      <div className="ratio">
                        <span>
                          <i
                            style={{
                              width: `${(row.reportTotal / row.total) * 100}%`,
                            }}
                          />
                        </span>
                        {percent.format((row.reportTotal / row.total) * 100)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <SerialDashboard />

        <footer>
          <span>출처: 통계청 국가통계포털(KOSIS), 범죄의 수사단서 2025</span>
          <span>숫자의 ‘-’는 0건으로 처리했습니다.</span>
        </footer>
      </main>
    </div>
  )
}

function SerialDashboard() {
  const [readings, setReadings] = useState<Reading[]>([])
  const [connectionStatus, setConnectionStatus] = useState("연결 준비 중")
  const [dataError, setDataError] = useState("")
  const currentReading = readings.at(-1)
  const values = readings.map((reading) => reading.value)
  const chartWidth = 800
  const chartHeight = 240
  const chartPadding = 32
  const minimum = values.length ? Math.min(...values) : 0
  const maximum = values.length ? Math.max(...values) : 0
  const chartPoints = values
    .map((value, index) => {
      const x =
        values.length === 1
          ? chartWidth / 2
          : chartPadding +
            (index / (values.length - 1)) * (chartWidth - chartPadding * 2)
      const y =
        maximum === minimum
          ? chartHeight / 2
          : chartHeight -
            chartPadding -
            ((value - minimum) / (maximum - minimum)) *
              (chartHeight - chartPadding * 2)
      return `${x},${y}`
    })
    .join(" ")

  useEffect(() => {
    const client = supabase
    if (!client) {
      setConnectionStatus("설정 오류")
      setDataError(
        ".env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정해 주세요.",
      )
      return
    }

    let active = true
    const latestReadingsQuery = client
      .from("readings")
      .select("id, value, created_at")
      .order("created_at", { ascending: false })
      .limit(100)
    const removeChannel = client.removeChannel.bind(client)
    const channel = client
      .channel("readings-dashboard")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "readings" },
        (payload) => {
          const reading = parseReading(payload.new)
          if (!reading) {
            setDataError(
              "새 readings 행에 id, value, created_at 값이 필요합니다.",
            )
            return
          }
          setReadings((current) => mergeReadings(current, [reading]))
        },
      )
      .subscribe((status, error) => {
        if (!active) return
        if (status === "SUBSCRIBED") {
          setConnectionStatus("Realtime 연결됨")
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionStatus("Realtime 연결 실패")
          setDataError(error?.message ?? "Realtime 구독에 실패했습니다.")
        } else if (status === "CLOSED") {
          setConnectionStatus("Realtime 연결 종료")
        }
      })

    async function loadLatestReadings() {
      const { data, error } = await latestReadingsQuery

      if (!active) return
      if (error) {
        setDataError(`최근 데이터를 불러오지 못했습니다: ${error.message}`)
        return
      }

      const parsedRows = (data ?? []).map((row) => parseReading(row))
      const rows = parsedRows
        .filter((row): row is Reading => row !== null)
        .reverse()
      setReadings((current) => mergeReadings(rows, current))
      setDataError(
        rows.length === parsedRows.length
          ? ""
          : "일부 readings 행에 유효한 id, value 또는 created_at 값이 없습니다.",
      )
    }

    void loadLatestReadings()
    return () => {
      active = false
      void removeChannel(channel)
    }
  }, [])

  return (
    <section className="panel serial-panel mt-5">
      <div className="panel-head serial-panel-head">
        <div>
          <p className="eyebrow">실시간 데이터</p>
          <h2>센서 readings</h2>
        </div>
        <span className="soft-badge">{connectionStatus}</span>
      </div>

      <div className="serial-content">
        <div className="serial-current">
          <span>현재값</span>
          <strong>
            {currentReading === undefined
              ? "—"
              : sensorFormat.format(currentReading.value)}
          </strong>
          <small>
            {currentReading
              ? new Date(currentReading.created_at).toLocaleString("ko-KR")
              : "저장된 값 없음"}
          </small>
        </div>

        <div className="serial-chart-panel">
          <div className="serial-chart-heading">
            <div>
              <strong>최근 readings</strong>
              <span>최신 100개 · Supabase Realtime</span>
            </div>
            <span className="serial-count">{readings.length} / 100</span>
          </div>
          {values.length ? (
            <div className="serial-chart">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                role="img"
                aria-label={`최근 ${values.length}개 readings 선 그래프`}
                preserveAspectRatio="none"
              >
                {[0, 0.5, 1].map((fraction) => {
                  const y =
                    chartPadding + fraction * (chartHeight - chartPadding * 2)
                  return (
                    <line
                      key={fraction}
                      x1={chartPadding}
                      x2={chartWidth - chartPadding}
                      y1={y}
                      y2={y}
                      className="serial-grid-line"
                    />
                  )
                })}
                <polyline
                  points={chartPoints}
                  className="serial-chart-line"
                  vectorEffect="non-scaling-stroke"
                />
                {values.length === 1 && (
                  <circle
                    cx={chartWidth / 2}
                    cy={chartHeight / 2}
                    r="5"
                    className="serial-chart-point"
                  />
                )}
              </svg>
              <div className="serial-chart-range">
                <span>최소 {sensorFormat.format(minimum)}</span>
                <span>최대 {sensorFormat.format(maximum)}</span>
              </div>
            </div>
          ) : (
            <div className="serial-empty-chart">
              {dataError || "Supabase에서 readings 데이터를 불러오는 중입니다."}
            </div>
          )}
        </div>
      </div>

      <p className="serial-message" role="status" aria-live="polite">
        <span
          className={
            connectionStatus === "Realtime 연결됨" ? "is-connected" : ""
          }
        />
        {dataError || connectionStatus}
      </p>
    </section>
  )
}

function StatCard({
  label,
  value,
  note,
  accent = false,
}: {
  label: string
  value: number
  note: string
  accent?: boolean
}) {
  return (
    <article className={`stat-card ${accent ? "accent" : ""}`}>
      <div className="flex items-center justify-between">
        <p>{label}</p>
        <AppIcon name={accent ? "grid" : "chart"} />
      </div>
      <strong>
        {format.format(value)}
        <small>건</small>
      </strong>
      <span>{note}</span>
    </article>
  )
}
