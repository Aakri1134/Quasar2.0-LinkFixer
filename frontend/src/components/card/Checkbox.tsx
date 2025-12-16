import { forwardRef } from "react"

type CheckboxProps = {
  name: string
  label?: string
  checked: boolean
  onChange: (checked: boolean) => void
  value?: string
  disabled?: boolean
  className?: string
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      name,
      label,
      checked,
      onChange,
      value = "on",
      disabled = false,
      className = "",
    },
    ref
  ) => {
    return (
      <label
        className={`flex items-center gap-2 select-none ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
      >
        <input
          ref={ref}
          type="checkbox"
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer hidden"
        />

       <span
  className={`
    h-5 w-5
    rounded border
    flex items-center justify-center
    transition-all duration-200
    peer-checked:bg-blue-600
    peer-checked:border-blue-600
    ${className}
  `}
>
  {checked && (
    <svg
      className="w-4 h-4 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      viewBox="0 0 24 24"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  )}
</span>


        {label && <span className="text-sm">{label}</span>}
      </label>
    )
  }
)

Checkbox.displayName = "Checkbox"

export default Checkbox
