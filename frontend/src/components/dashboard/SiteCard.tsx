import { ChevronRight, Globe } from "lucide-react"
import { useDashboardContext } from "@/context/dashboardContext"

function formatUpdated(added: Date) {
  if (Number.isNaN(added.getTime())) return "—"
  return `${added.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} · ${added.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

const SiteCard = ({
  link,
  added,
  websiteID,
}: {
  link: string
  added: Date
  websiteID: string
}) => {
  const dashboardContext = useDashboardContext()

  return (
    <button
      type="button"
      onClick={() => dashboardContext?.openWebsiteID(websiteID)}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/30"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0B1F1C] text-emerald-400">
        <Globe className="h-5 w-5" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        {/* truncate so a long domain can't blow out the row */}
        <span className="min-w-0 truncate font-mono text-base font-semibold text-[#343434]">
          {link}
        </span>
        <span className="mt-0.5 truncate text-xs font-medium uppercase tracking-wide text-gray-500">
          Updated {formatUpdated(added)}
        </span>
      </span>

      <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
    </button>
  )
}

export default SiteCard
