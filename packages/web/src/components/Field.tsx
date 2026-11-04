import type { ReactNode } from 'react'
import './Field.css'

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="ui-field">
    <span className="ui-field__label">{label}</span>
    {children}
  </label>
)

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}

export const Select = ({ value, options, onChange }: SelectProps) => (
  <select className="ui-control ui-control--select" value={value} onChange={(event) => onChange(event.target.value)}>
    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>
)

interface NumberInputProps {
  value: string
  min: number
  max: number
  onChange: (value: string) => void
}

export const NumberInput = ({ value, min, max, onChange }: NumberInputProps) => (
  <input className="ui-control ui-control--number" type="number" min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} />
)
