import { useState } from 'react'
import { STEP_TYPE_OPTIONS } from '../../schema'
import type { StepType } from '../../types'

export const stepTypeLabel = (type: StepType) => type.replaceAll('_', ' ')

export const TextField = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) => (
  <label className="field">
    <span>{label}</span>
    <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
  </label>
)

export const TextAreaField = ({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) => (
  <label className="field">
    <span>{label}</span>
    <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
)

export const SelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
}) => (
  <label className="field">
    <span>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
)

export const AddStepBar = ({ onAdd }: { onAdd: (type: StepType) => void }) => {
  const [value, setValue] = useState<StepType>('manual_action')

  return (
    <div className="add-step-bar">
      <select value={value} onChange={(event) => setValue(event.target.value as StepType)}>
        {STEP_TYPE_OPTIONS.map((type) => (
          <option key={type} value={type}>
            {stepTypeLabel(type)}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => onAdd(value)}>
        Add step
      </button>
    </div>
  )
}
