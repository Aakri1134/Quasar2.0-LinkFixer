import type { ReactNode } from "react"

export function PrimaryButton({
  loading,
  className,
  loadingLabel = "Loading...",
  label
}: {
  loading: boolean
  label: ReactNode
  loadingLabel?: ReactNode
  className?: string
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={` bg-amber-500 h-12 active:translate-1 w-full text-white border-2 border-white translate-1 hover:translate-0 hover:border-black text-lg my-2 font-bold rounded-lg duration-300 transition-all ${className}`}
    >
      {loading ? loadingLabel : label}
    </button>
  )
}
