import type { ReactNode } from 'react'
import './Button.css'

export enum ButtonVariant {
  Primary = 'primary',
  Secondary = 'secondary',
  Ghost = 'ghost',
}

interface ButtonProps {
  variant?: ButtonVariant
  onClick: () => void
  children: ReactNode
}

export const Button = ({ variant = ButtonVariant.Secondary, onClick, children }: ButtonProps) => (
  <button type="button" className="ui-button" data-variant={variant} onClick={onClick}>{children}</button>
)

interface SegmentedOption<Value extends string> {
  value: Value
  label: string
}

interface SegmentedControlProps<Value extends string> {
  label: string
  value: Value
  options: SegmentedOption<Value>[]
  onChange: (value: Value) => void
}

export function SegmentedControl<Value extends string>({ label, value, options, onChange }: SegmentedControlProps<Value>) {
  return (
    <div className="ui-segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="ui-segmented__option"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
