import { useState } from "react"
import { ChevronDown, ChevronRight, History as HistoryIcon, Sparkles } from "lucide-react"
import { useDashboardContext } from "@/context/dashboardContext"
import useGetChecks from "@/hooks/queries/check/useGetChecks"
import useGetCheckById from "@/hooks/queries/check/useGetCheckById"
import {
  EmptyState,
  ErrorState,
  LinkCell,
  MicroLabel,
  Pager,
  Panel,
  SkeletonRows,
  StatusPill,
  formatDateTime,
  formatDurationMs,
  taskLabel,
} from "./ui"

const PAGE_SIZE = 10
const LINK_PAGE_SIZE = 25

// Core Web Vitals come back in milliseconds except CLS, which is a unitless score.
function formatMetric(label: string, value: number | undefined) {
  if (value === undefined || value === null) return null
  const display = label === "CLS" ? value.toFixed(3) : `${Math.round(value)}ms`
  return (
    <div key={label} className="flex flex-col">
      <MicroLabel>{label}</MicroLabel>
      <span className="font-mono text-sm text-gray-900">{display}</span>
    </div>
  )
}

function CheckDetail({ checkID }: { checkID: string }) {
  const [linkPage, setLinkPage] = useState(1)
  const { data, isLoading, isError, refetch } = useGetCheckById({
    checkID,
    linkPage,
    linkLimit: LINK_PAGE_SIZE,
  })

  if (isLoading) return <div className="p-4"><SkeletonRows rows={4} columns={3} /></div>
  if (isError) return <ErrorState description="Could not load this scan." onRetry={() => refetch()} />
  if (!data) return null

  const { check, checkedLinks, totalLinks } = data

  return (
    <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-4">
      {check.aiReport && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-emerald-800">
            <Sparkles className="h-3.5 w-3.5" />
            <MicroLabel className="text-emerald-800">AI summary</MicroLabel>
          </div>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{check.aiReport}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left">
              <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Link</th>
              <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Type</th>
              <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Page vitals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {checkedLinks.map((link, index) => (
              <tr key={`${link.url ?? "link"}-${index}`}>
                <td className="px-3 py-2.5"><StatusPill code={link.status} /></td>
                <td className="max-w-sm px-3 py-2.5">
                  {link.url ? <LinkCell url={link.url} /> : <span className="text-xs text-gray-400">—</span>}
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-500">{link.type ?? "—"}</td>
                <td className="px-3 py-2.5">
                  {link.analytics ? (
                    <div className="flex gap-4">
                      {formatMetric("LCP", link.analytics.lcp)}
                      {formatMetric("CLS", link.analytics.cls)}
                      {formatMetric("TTFB", link.analytics.ttfb)}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pager
          page={linkPage}
          limit={LINK_PAGE_SIZE}
          total={totalLinks}
          unit="links"
          onPageChange={setLinkPage}
        />
      </div>
    </div>
  )
}

export default function History() {
  const dashboardContext = useDashboardContext()
  const websiteID = dashboardContext?.currentWebsite?._id

  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useGetChecks(
    websiteID ? { websiteID, page, limit: PAGE_SIZE } : null,
  )

  const checks = data?.checks ?? []

  return (
    <Panel title="Scan history" bodyClassName="p-0">
      {isLoading && <div className="p-4"><SkeletonRows rows={4} columns={4} /></div>}

      {!isLoading && isError && (
        <ErrorState description="The scan history could not be loaded." onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && checks.length === 0 && (
        <EmptyState
          icon={<HistoryIcon className="h-5 w-5" />}
          title="No scans yet"
          description="Once you run a scan from the Overview tab it will show up here."
        />
      )}

      {!isLoading && !isError && checks.length > 0 && (
        <>
          <div className="divide-y divide-gray-100">
            {checks.map((check) => {
              const isOpen = expanded === check._id
              return (
                <div key={check._id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : check._id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                    )}

                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {taskLabel(check.task)}
                      </span>
                      <span className="text-xs text-gray-500">{formatDateTime(check.createdAt)}</span>
                    </span>

                    <span className="hidden shrink-0 gap-6 sm:flex">
                      <span className="flex flex-col items-end">
                        <MicroLabel>Links</MicroLabel>
                        <span className="font-mono text-sm text-gray-900">{check.linkCount}</span>
                      </span>
                      <span className="flex flex-col items-end">
                        <MicroLabel>Duration</MicroLabel>
                        <span className="font-mono text-sm text-gray-900">
                          {check.duration ? formatDurationMs(check.duration * 1000) : "—"}
                        </span>
                      </span>
                    </span>
                  </button>

                  {isOpen && <CheckDetail checkID={check._id} />}
                </div>
              )
            })}
          </div>

          <Pager
            page={data?.page ?? page}
            limit={data?.limit ?? PAGE_SIZE}
            total={data?.total ?? checks.length}
            unit="scans"
            onPageChange={setPage}
          />
        </>
      )}
    </Panel>
  )
}
