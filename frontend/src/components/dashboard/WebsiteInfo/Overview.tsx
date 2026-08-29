import { useState } from "react"
import { useDashboardContext } from "@/context/dashboardContext"
import useScanWebsite from "@/hooks/mutations/website/useScanWebsite"
import useScanStatus from "@/hooks/queries/website/useScanStatus"
import ScanProgress from "@/components/dashboard/ScanProgress"
import { Button } from "@/components/ui/button"
import type { ManagerTask } from "@/services/api/website/websiteService.types"
import {
  Copy,
  Check,
  Users,
  Rss,
  ShieldCheck,
  ShieldAlert,
  ListChecks,
  Play,
} from "lucide-react"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}


function CopyField({
  value,
  label,
  className,
}: {
  value: string
  label: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <button
      onClick={onCopy}
      aria-label={`Copy ${label}`}
      className={`inline-flex items-center rounded-md p-1 transition-colors ${
        className ?? "text-gray-400 hover:bg-gray-100"
      }`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  )
}

function Row({
  label,
  value,
  mono,
  copyValue,
}: {
  label: string
  value: string
  mono?: boolean
  copyValue?: string
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="flex items-center gap-1">
        <span className={`text-sm text-gray-900 ${mono ? "font-mono" : ""}`}>
          {value}
        </span>
        {copyValue && <CopyField value={copyValue} label={label} />}
      </div>
    </div>
  )
}

export default function Overview() {
  const { currentWebsite: website } = useDashboardContext()
  const [task, setTask] = useState<ManagerTask>("eval_links")
  const { mutate: scanWebsite, isPending } = useScanWebsite()
  const { data: scanStatus } = useScanStatus(website?._id)

  const scanLive =
    scanStatus?.phase === "queued" ||
    scanStatus?.phase === "started" ||
    scanStatus?.phase === "crawling"

  const priorities = [
    {
      label: "Low",
      value: website.estimatedTime.priority_low,
      tone: "bg-emerald-200",
    },
    {
      label: "Mid",
      value: website.estimatedTime.priority_mid,
      tone: "bg-emerald-400",
    },
    {
      label: "High",
      value: website.estimatedTime.priority_high,
      tone: "bg-emerald-700",
    },
  ]
  const latestAgreement =
    website.agree_to_terms[website.agree_to_terms.length - 1]

  return (
    <div className="space-y-5">
      {/* Identity strip */}
      <div className="rounded-xl bg-[#0B1F1C] px-6 py-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-emerald-400">
              Tracked website
            </p>
            <div className="mt-1.5 flex items-center gap-1">
              <h1 className="font-mono text-2xl font-semibold tracking-tight">
                {website.domain}
              </h1>
              <CopyField
                value={website.domain}
                label="domain"
                className="text-white/60 hover:bg-white/10"
              />
            </div>
            <div className="mt-2 flex items-center gap-1 font-mono text-xs text-white/50">
              <span>{website._id}</span>
              <CopyField
                value={website._id}
                label="website ID"
                className="text-white/40 hover:bg-white/10"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={task}
              onChange={(event) => setTask(event.target.value as ManagerTask)}
              disabled={scanLive}
              className="rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white outline-none disabled:opacity-50"
            >
              <option value="eval_links">Check links</option>
              <option value="eval_sitemap">Refresh sitemap</option>
              <option value="eval_seo">Full SEO scan</option>
            </select>
            <Button
              size="sm"
              disabled={scanLive || isPending}
              onClick={() => scanWebsite({ websiteID: website._id, task })}
              className="bg-emerald-500 text-white hover:bg-emerald-400"
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              {scanLive ? "Scanning..." : isPending ? "Starting..." : "Run scan"}
            </Button>
          </div>
        </div>
        <div className="mt-5 flex gap-6 font-mono text-xs text-white/50">
          <span>Added {formatDate(website.createdAt)}</span>
          <span>Updated {formatDate(website.updatedAt)}</span>
        </div>
      </div>

      <ScanProgress websiteID={website._id} />

      {/* Stat grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Rss className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Sitemap links
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {website.sitemap_links.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Subscribers
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {website.userID.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <ListChecks className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Checks so far
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {website.checks.length}
          </p>
        </div>
      </div>

      {/* Details panel */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500">
          Site details
        </div>
        <div className="divide-y divide-gray-100">
          <Row
            label="Domain"
            value={website.domain}
            mono
            copyValue={website.domain}
          />
          <Row
            label="Website ID"
            value={website._id}
            mono
            copyValue={website._id}
          />
          <Row label="Created" value={formatDate(website.createdAt)} />
          <Row label="Last updated" value={formatDate(website.updatedAt)} />
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-500">Terms agreement</span>
            {latestAgreement?.agreement ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                Accepted {formatDate(latestAgreement.updatedAt)}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
                <ShieldAlert className="h-4 w-4" />
                Not accepted
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sitemap preview */}
      {website.sitemap_links.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Sitemap links
            </span>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 font-mono text-[11px] text-gray-600">
              {website.sitemap_links.length}
            </span>
          </div>
          <div className="max-h-48 divide-y divide-gray-50 overflow-y-auto">
            {website.sitemap_links.map((link) => (
              <div
                key={link}
                className="truncate px-4 py-2 font-mono text-xs text-gray-600"
              >
                {link}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
