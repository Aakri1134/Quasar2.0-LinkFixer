import { forwardRef, useState } from "react"

type InputProps = {
  type: string
  name: string
  placeholder: string
  label?: string
  errorMessage?: string
  validation?: (value: string) => boolean
  addListeners?: boolean
  enterKeyPress?: () => void
  onChangeTrigger?: () => void
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type,
      name,
      label,
      errorMessage,
      placeholder,
      validation,
      addListeners,
      enterKeyPress,
      onChangeTrigger
    },
    ref
  ) => {
    const [errorState, setErrorState] = useState<boolean>(false)

    const keydownHandler = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!addListeners) return
      if (e.key === "Enter") {
        e.preventDefault()
        e.currentTarget.blur()
        if (validation !== undefined) {
          const value = e.currentTarget.value
          if (!value || value.length == 0) {
            return
          }
          const res = validation(value)
          setErrorState(!res)
          if (enterKeyPress !== undefined && res) enterKeyPress()
        }
      }
    }
    const focusoutHandler = (e: React.FocusEvent<HTMLInputElement>) => {
      if (!addListeners) return
      const value = e.currentTarget.value
      if (!value || value.length == 0) {
        return
      }
      if (validation !== undefined) {
        const res = validation(value)
        setErrorState(!res)
        if (enterKeyPress !== undefined && res) enterKeyPress()
      }
    }
    return (
      <label className=" w-full h-5 font-semibold text-md font-sans mb-1">
        <span>{label}</span>
        <input
          name={name}
          type={type}
          ref={ref}
          placeholder={placeholder || "Enter"}
          onChange={() => {
            if(onChangeTrigger) onChangeTrigger()
            if (errorState) {
              setErrorState(false)
            }
          }}
          onKeyDown={keydownHandler}
          onBlur={focusoutHandler}
          className="border-2 w-full h-12 rounded-sm text-md pl-2 font-semibold"
          style={{
            borderColor: !errorState
              ? `rgba(200,200,200,1)`
              : `rgba(255, 0, 0, 1)`,
          }}
        />
        {errorState ? (
          <h3 className=" w-full px-3 text-red-500 font-semibold font-mono py-0 text-md">
            {errorMessage}
          </h3>
        ) : (
          <div className=" h-3" />
        )}
      </label>
    )
  }
)
Input.displayName = "Input"

export default Input
