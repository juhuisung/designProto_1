import { useMemo, useState } from "react"
import { clueLabels, crimeData, type ClueKey } from "./data"

const format = new Intl.NumberFormat("ko-KR")
const percent = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 })
const compact = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
})

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

        <footer>
          <span>출처: 통계청 국가통계포털(KOSIS), 범죄의 수사단서 2025</span>
          <span>숫자의 ‘-’는 0건으로 처리했습니다.</span>
        </footer>
      </main>
    </div>
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
