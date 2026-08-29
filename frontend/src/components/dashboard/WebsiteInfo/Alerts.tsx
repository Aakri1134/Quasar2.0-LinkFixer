import { useState } from "react"
import { CheckCircle2, Search, ShieldCheck } from "lucide-react"
import { useDashboardContext } from "@/context/dashboardContext"
import useGetAlerts from "@/hooks/queries/alert/useGetAlerts"
import useResolveAlert from "@/hooks/mutations/alert/useResolveAlert"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  EmptyState,
  ErrorState,
  LinkCell,
  Pager,
  Panel,
  SkeletonRows,
  StatusPill,
  formatRelative,
} from "./ui"

const PAGE_SIZE = 25

type SolvedFilter = "all" | "open" | "resolved"

const FILTERS: { label: string; value: SolvedFilter }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Resolved", value: "resolved" },
]

export default function Alerts() {
  const dashboardContext = useDashboardContext()
  const website = dashboardContext?.currentWebsite
  const websiteID = website?._id

  const [filter, setFilter] = useState<SolvedFilter>("open")
  const [errorCode, setErrorCode] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useGetAlerts(
    websiteID
      ? {
          websiteID,
          ...(filter === "all" ? {} : { solved: filter === "resolved" }),
          ...(errorCode.trim() ? { error_code: errorCode.trim() } : {}),
          page,
          limit: PAGE_SIZE,
        }
      : null,
  )

  const { mutate: resolveAlert, isPending } = useResolveAlert()

  const alerts = data?.alerts ?? []
  const total = data?.total ?? 0
  const hasBeenScanned = Boolean(website && website.checks.length > 0)

  // The crawler writes alerts with no `solved` field at all, so absent means open.
  const openCount = alerts.filter((alert) => !alert.solved).length
  const resolvedCount = alerts.length - openCount

  const changeFilter = (next: SolvedFilter) => {
    setFilter(next)
    setPage(1)
  }

  return (
    <Panel
      title="Broken links"
      description={
        total > 0
          ? `${total} alert${total === 1 ? "" : "s"} on this page: ${openCount} open, ${resolvedCount} resolved`
          : undefined
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              value={errorCode}
              onChange={(event) => {
                setErrorCode(event.target.value)
                setPage(1)
              }}
              placeholder="Status code"
              className="h-8 w-32 pl-8 text-sm"
            />
          </div>
          <div className="flex overflow-hidden rounded-md border border-gray-200">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                onClick={() => changeFilter(option.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === option.value
                    ? "bg-[#0B1F1C] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      }
      bodyClassName="p-0"
    >
      {isLoading && (
        <div className="p-4">
          <SkeletonRows rows={6} columns={5} />
        </div>
      )}

      {!isLoading && isError && (
        <ErrorState
          description="The alerts for this website could not be loaded."
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && alerts.length === 0 && (
        // An empty list means two very different things. Telling them apart matters: a clean site
        // otherwise reads as a broken page.
        <EmptyState
          icon={hasBeenScanned ? <ShieldCheck className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          tone={hasBeenScanned ? "good" : "neutral"}
          title={hasBeenScanned ? "No broken links found" : "This website has not been scanned yet"}
          description={
            hasBeenScanned
              ? "The last crawl finished without finding anything broken."
              : "Run a scan from the Overview tab to start checking this site."
          }
        />
      )}

      {!isLoading && !isError && alerts.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-3xl border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500">Link</th>
                  <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500">Seen in</th>
                  <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500">First seen</th>
                  <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500">Last seen</th>
                  <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500">Fixed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alerts.map((alert) => (
                  <tr key={alert._id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <StatusPill code={alert.error_code} />
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <LinkCell url={alert.link} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {alert.check.length} scan{alert.check.length === 1 ? "" : "s"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatRelative(alert.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatRelative(alert.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <label className="flex cursor-pointer items-center gap-2">
                        <Checkbox
                          checked={Boolean(alert.solved)}
                          disabled={isPending}
                          onCheckedChange={(checked) =>
                            resolveAlert({ alertID: alert._id, solved: checked === true })
                          }
                        />
                        {alert.solved && (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Fixed
                          </span>
                        )}
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pager
            page={data?.page ?? page}
            limit={data?.limit ?? PAGE_SIZE}
            total={total}
            unit="alerts"
            onPageChange={setPage}
          />
        </>
      )}
    </Panel>
  )
}
