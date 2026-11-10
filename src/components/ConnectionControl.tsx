import type { Status } from "../lib/device"

const STATUS_CONTENT: Record<Status, { label: string; className: string }> = {
  disconnected: { label: "연결 안 됨", className: "is-disconnected" },
  connecting: { label: "연결 중…", className: "is-connecting" },
  connected: { label: "연결됨", className: "is-connected" },
  error: { label: "연결 실패, 다시 시도", className: "is-error" },
}

type ConnectionControlProps = {
  status: Status
  onToggle: () => Promise<void>
}

export function ConnectionControl({
  status,
  onToggle,
}: ConnectionControlProps) {
  const content = STATUS_CONTENT[status]
  const connected = status === "connected"
  const connecting = status === "connecting"

  return (
    <div className="control-row">
      <div className="control-copy">
        <span className="t-label">센서</span>
        <span
          className={`t-label connection-status ${content.className}`}
          role="status"
        >
          <i aria-hidden="true" />
          {content.label}
        </span>
      </div>
      <button
        className={`t-label action-button ${connected ? "is-secondary" : ""}`}
        type="button"
        disabled={connecting}
        onClick={() => void onToggle()}
      >
        {connected ? "연결 끊기" : "센서 연결"}
      </button>
    </div>
  )
}
