import { useState, type Dispatch, type SetStateAction } from "react"
import { setLedPower } from "../lib/device"

type PowerToggleProps = {
  power: boolean
  setPower: Dispatch<SetStateAction<boolean>>
}

export function PowerToggle({ power, setPower }: PowerToggleProps) {
  const [error, setError] = useState("")

  async function handleToggle() {
    const previous = power
    const next = !power
    setError("")
    setPower(next)

    const succeeded = await setLedPower(next)
    if (!succeeded) {
      setPower(previous)
      setError("전원 변경 실패, 다시 시도")
    }
  }

  return (
    <div>
      <div className="control-row">
        <div className="control-copy">
          <span className="t-label">LED 전원</span>
          <span className="t-caption control-state">
            {power ? "켜짐" : "꺼짐"}
          </span>
        </div>
        <button
          className="power-switch"
          type="button"
          role="switch"
          aria-checked={power}
          aria-label="LED 전원"
          onClick={() => void handleToggle()}
        >
          <span aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p className="t-caption power-error" role="status">
          {error}
        </p>
      )}
    </div>
  )
}
