import * as React from "react"
import { AlertTriangle, ChevronLeft, ChevronRight, RotateCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Shared presentational pieces for the website-detail tabs. Everything here follows Overview.tsx's
// visual language: rounded-xl cards, border-gray-200, emerald accents, font-mono for machine values,
// uppercase tracking-wide micro-labels in text-gray-500.

export function Panel({
  title,
  description,
  actions,
  children,
  bodyClassName,
  className,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  bodyClassName?: string
  className?: string
}) {
  return (
    <section
      className={cn("overflow-hidden rounded-xl border border-gray-200", className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs text-gray-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className={cn(bodyClassName)}>{children}</div>
    </section>
  )
}

export function MicroLabel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "text-[11px] font-medium uppercase tracking-wide text-gray-500",
        className,
      )}
    >
      {children}
    </span>
  )
}

const STATUS_TEXT: Record<number, string> = {
  400: "Bad request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not found",
  405: "Not allowed",
  408: "Timed out",
  410: "Gone",
  429: "Rate limited",
  451: "Unavailable (legal)",
  500: "Server error",
  502: "Bad gateway",
  503: "Unavailable",
  504: "Gateway timeout",
}

export type StatusTone = "ok" | "redirect" | "client" | "server" | "network"

// Classifies an HTTP status / error code into a tone plus a human label.
// Tone is never the only signal — the label always ships with it.
export function classifyStatus(code: string | number | null | undefined): {
  tone: StatusTone
  code: string
  label: string
} {
  const raw = code === null || code === undefined ? "" : String(code).trim()
  const numeric = Number.parseInt(raw, 10)

  if (!raw || Number.isNaN(numeric) || numeric === 0) {
    return {
      tone: "network",
      code: raw && raw !== "0" ? raw : "ERR",
      label: raw && raw !== "0" && Number.isNaN(numeric) ? "Unreachable" : "No response",
    }
  }
  if (numeric >= 500) {
    return { tone: "server", code: raw, label: STATUS_TEXT[numeric] ?? "Server error" }
  }
  if (numeric >= 400) {
    return { tone: "client", code: raw, label: STATUS_TEXT[numeric] ?? "Client error" }
  }
  if (numeric >= 300) {
    return { tone: "redirect", code: raw, label: STATUS_TEXT[numeric] ?? "Redirect" }
  }
  return { tone: "ok", code: raw, label: STATUS_TEXT[numeric] ?? "OK" }
}

const TONE_CLASS: Record<StatusTone, string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  redirect: "border-sky-200 bg-sky-50 text-sky-700",
  client: "border-amber-200 bg-amber-50 text-amber-700",
  server: "border-red-200 bg-red-50 text-red-700",
  network: "border-gray-200 bg-gray-100 text-gray-600",
}

const TONE_DOT: Record<StatusTone, string> = {
  ok: "bg-emerald-500",
  redirect: "bg-sky-500",
  client: "bg-amber-500",
  server: "bg-red-500",
  network: "bg-gray-400",
}

export function StatusPill({
  code,
  showLabel = true,
  className,
}: {
  code: string | number | null | undefined
  showLabel?: boolean
  className?: string
}) {
  const { tone, code: text, label } = classifyStatus(code)
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5",
        TONE_CLASS[tone],
        className,
      )}
      title={`${text} — ${label}`}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[tone])} />
      <span className="font-mono text-[11px] font-medium">{text}</span>
      {showLabel && (
        <span className="truncate text-[11px] font-medium">{label}</span>
      )}
    </span>
  )
}

// A long URL rendered so it can never widen its container.
export function LinkCell({
  url,
  className,
}: {
  url: string
  className?: string
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      title={url}
      className={cn(
        "block max-w-full truncate font-mono text-xs text-gray-700 underline-offset-2 hover:text-emerald-700 hover:underline",
        className,
      )}
    >
      {url}
    </a>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "neutral",
}: {
  icon?: React.ReactNode
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  tone?: "neutral" | "good"
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && (
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            tone === "good"
              ? "bg-emerald-50 text-emerald-600"
              : "bg-gray-100 text-gray-400",
          )}
        >
          {icon}
        </div>
      )}
      <p
        className={cn(
          "text-sm font-medium",
          tone === "good" ? "text-emerald-700" : "text-gray-900",
        )}
      >
        {title}
      </p>
      {description && (
        <p className="max-w-sm text-sm text-gray-500">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = "Could not load this",
  description,
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="max-w-sm text-sm text-gray-500">
        {description ?? "The request failed. It may be a network hiccup — try again."}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  )
}

export function SkeletonBar({ className }: { className?: string }) {
  return (
    <div className={cn("h-3 animate-pulse rounded bg-gray-100", className)} />
  )
}

// Rows of shimmering bars sized like the real table rows, so the layout does not jump on load.
export function SkeletonRows({
  rows = 5,
  columns = 4,
}: {
  rows?: number
  columns?: number
}) {
  const widths = ["w-16", "w-full", "w-24", "w-20", "w-12", "w-14"]
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonBar
              key={colIndex}
              className={cn(
                widths[colIndex % widths.length],
                colIndex === 1 && "flex-1",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function Pager({
  page,
  limit,
  total,
  unit,
  onPageChange,
  disabled,
}: {
  page: number
  limit: number
  total: number
  unit: string
  onPageChange: (page: number) => void
  disabled?: boolean
}) {
  const pages = Math.max(1, Math.ceil(total / Math.max(1, limit)))
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(total, page * limit)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-2.5">
      <p className="font-mono text-[11px] text-gray-500">
        {from}–{to} of {total} {unit}
      </p>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-gray-500">
          Page {page} / {pages}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous page"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next page"
          disabled={disabled || page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// "24 Aug 2026, 14:03" — dense enough for a table cell, unambiguous about the day.
export function formatDateTime(value: string | number | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatRelative(value: string | number | null | undefined) {
  if (!value) return "never"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "never"
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDateTime(value)
}

// Check.duration is wall-clock milliseconds (Manager reads `${domain}_duration` from Redis).
export function formatDurationMs(ms: number | null | undefined) {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return "—"
  if (ms < 1000) return `${Math.round(ms)}ms`
  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

const TASK_LABEL: Record<string, string> = {
  eval_links: "Link check",
  eval_sitemap: "Sitemap crawl",
  eval_seo: "SEO audit",
}

export function taskLabel(task: string | null | undefined) {
  if (!task) return "Scan"
  return TASK_LABEL[task] ?? task.replace(/_/g, " ")
}
