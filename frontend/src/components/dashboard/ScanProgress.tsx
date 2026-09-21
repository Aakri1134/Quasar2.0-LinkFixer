import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import useScanStatus from "@/hooks/queries/website/useScanStatus"

// Reads the scan state from GET /website/:id/scan/status, which the hook polls while a crawl is
// running. Nothing renders when there's no scan to show, so this stays out of the way.
export default function ScanProgress({ websiteID }: { websiteID: string }) {
  const { data } = useScanStatus(websiteID)

  if (!data || data.phase === "idle") return null

  const { phase, checked, results } = data
  const running = phase === "queued" || phase === "started" || phase === "crawling"

  // The crawler discovers links as it goes, so there's no total to divide by until it finishes.
  // An indeterminate bar is honest about that; a fake percentage isn't.
  const indeterminate = running

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {running && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
          {phase === "completed" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          {phase === "failed" && <AlertTriangle className="h-4 w-4 text-red-500" />}

          <span className="text-sm font-medium text-gray-900">
            {phase === "queued" && "Waiting for a free crawler"}
            {phase === "started" && "Starting up"}
            {phase === "crawling" && "Crawling"}
            {phase === "completed" && "Scan finished"}
            {phase === "failed" && "Scan failed"}
          </span>
        </div>

        <div className="flex gap-4 font-mono text-xs text-gray-500">
          <span>{checked} checked</span>
          {results > 0 && (
            <span className={results > 0 ? "text-amber-600" : undefined}>{results} broken</span>
          )}
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        {indeterminate ? (
          <div className="h-full w-1/3 animate-[float_2s_ease-in-out_infinite] rounded-full bg-emerald-500" />
        ) : (
          <div
            className={`h-full w-full rounded-full ${
              phase === "failed" ? "bg-red-400" : "bg-emerald-500"
            }`}
          />
        )}
      </div>

      {phase === "failed" && (
        <p className="mt-2 text-xs text-gray-500">
          The crawler gave up on this site. Try running the scan again.
        </p>
      )}
    </div>
  )
}
