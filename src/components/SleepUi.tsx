import type { AppState } from '../context/sleepTracking'

export function SegmentedControl({
  options,
  selected,
  onChange,
  disabled,
}: {
  options: string[]
  selected: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex w-full rounded-xl bg-slate-100 p-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          disabled={disabled}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-300 ${
            selected === opt ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          } ${disabled ? 'opacity-40' : ''}`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export function SegmentedControlTimer({
  options,
  selected,
  onChange,
  appState,
}: {
  options: string[]
  selected: string
  onChange: (value: string) => void
  appState: AppState
}) {
  return (
    <SegmentedControl
      options={options}
      selected={selected}
      onChange={onChange}
      disabled={appState !== 'idle'}
    />
  )
}

export function ProgressBar({
  label,
  value,
  max,
  colorClass,
}: {
  label: string
  value: number
  max: number
  colorClass: string
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-500">{label}</span>
        <span className="font-semibold text-slate-800">{value}m</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-1000 ease-out`}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  )
}

