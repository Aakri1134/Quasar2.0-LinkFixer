import { useState } from "react"
import { useNavigate } from "react-router"
import { Download, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react"
import { useDashboardContext } from "@/context/dashboardContext"
import { useUserContext } from "@/context/userContext"
import useGenerateVerificationFile from "@/hooks/mutations/website/useGenerateVerificationFile"
import useVerifyWebsite from "@/hooks/mutations/website/useVerifyWebsite"
import useDeleteWebsite from "@/hooks/mutations/website/useDeleteWebsite"
import useUpdateWebsiteSettings from "@/hooks/mutations/website/useUpdateWebsiteSettings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import type { ScanFrequencyValue } from "@/services/api/website/websiteService.types"
import { MicroLabel, Panel } from "./ui"

function VerifyDomainCard({
  websiteID,
  domain,
  verified,
}: {
  websiteID: string
  domain: string
  verified: boolean
}) {
  const [hostedUrl, setHostedUrl] = useState("")
  const { mutate: generateFile, isPending: generating } = useGenerateVerificationFile()
  const { mutate: verify, isPending: verifying } = useVerifyWebsite()

  if (verified) {
    return (
      <Panel title="Domain ownership">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          {domain} is verified
        </div>
      </Panel>
    )
  }

  return (
    <Panel
      title="Domain ownership"
      description="Verify you own this domain to unlock the settings below."
    >
      <ol className="space-y-4 text-sm text-gray-600">
        <li className="flex flex-wrap items-center gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0B1F1C] text-[11px] font-medium text-white">
            1
          </span>
          <span className="flex-1">Download your verification file.</span>
          <Button
            variant="outline"
            size="sm"
            disabled={generating}
            onClick={() => generateFile({ websiteID })}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {generating ? "Generating..." : "Download"}
          </Button>
        </li>

        <li className="flex items-start gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0B1F1C] text-[11px] font-medium text-white">
            2
          </span>
          <span className="flex-1">
            Upload it to your site so it is reachable over HTTP, for example{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">
              https://{domain}/makora-verification.txt
            </code>
          </span>
        </li>

        <li className="flex items-start gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0B1F1C] text-[11px] font-medium text-white">
            3
          </span>
          <span className="flex-1 space-y-2">
            <span className="block">Paste the URL you uploaded it to.</span>
            <span className="flex flex-wrap gap-2">
              <Input
                value={hostedUrl}
                onChange={(event) => setHostedUrl(event.target.value)}
                placeholder={`https://${domain}/makora-verification.txt`}
                className="h-9 min-w-64 flex-1 font-mono text-xs"
              />
              <Button
                size="sm"
                disabled={verifying || !hostedUrl.trim()}
                onClick={() => verify({ websiteID, verificationURL: hostedUrl.trim() })}
              >
                {verifying ? "Checking..." : "Verify"}
              </Button>
            </span>
          </span>
        </li>
      </ol>
    </Panel>
  )
}

function DangerZone({ websiteID, domain }: { websiteID: string; domain: string }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const navigate = useNavigate()
  const { mutate: deleteWebsite, isPending } = useDeleteWebsite()

  const onDelete = () => {
    deleteWebsite(
      { websiteID },
      {
        onSuccess: () => {
          setOpen(false)
          navigate("/dashboard")
        },
      },
    )
  }

  return (
    <>
      <Panel title="Danger zone" className="border-red-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Remove this website</p>
            <p className="text-sm text-gray-500">
              Stops tracking it and removes it from your dashboard.
            </p>
          </div>
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => setOpen(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remove
          </Button>
        </div>
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div>
                <h3 className="text-base font-semibold text-gray-900">Remove {domain}?</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Type the domain below to confirm.
                </p>
              </div>
            </div>

            <Input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder={domain}
              className="font-mono text-sm"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 text-white hover:bg-red-500"
                disabled={typed.trim() !== domain || isPending}
                onClick={onDelete}
              >
                {isPending ? "Removing..." : "Remove"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

const FREQUENCIES: { label: string; value: ScanFrequencyValue }[] = [
  { label: "Off", value: "off" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
]

function ScanningSettings({
  websiteID,
  frequency,
  subscribed,
  subscriberCount,
}: {
  websiteID: string
  frequency: ScanFrequencyValue
  subscribed: boolean
  subscriberCount: number
}) {
  const { mutate: updateSettings, isPending } = useUpdateWebsiteSettings()

  return (
    <Panel title="Scanning" description="How often this site gets crawled, and who hears about it.">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Label htmlFor="scan-frequency" className="text-sm text-gray-900">
              Scan frequency
            </Label>
            <p className="text-sm text-gray-500">
              {frequency === "off"
                ? "Automatic scans are off. You can still run one by hand."
                : `This site is crawled ${frequency}.`}
            </p>
          </div>
          <select
            id="scan-frequency"
            value={frequency}
            disabled={isPending}
            onChange={(event) =>
              updateSettings({
                websiteID,
                scan_frequency: event.target.value as ScanFrequencyValue,
              })
            }
            className="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm outline-none disabled:opacity-50"
          >
            {FREQUENCIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <div>
            <Label htmlFor="mail-subscription" className="text-sm text-gray-900">
              Email me the reports
            </Label>
            <p className="text-sm text-gray-500">
              {subscriberCount} subscriber{subscriberCount === 1 ? "" : "s"} on this website
            </p>
          </div>
          <Switch
            id="mail-subscription"
            checked={subscribed}
            disabled={isPending}
            onCheckedChange={(checked) => updateSettings({ websiteID, mail_subscription: checked })}
          />
        </div>
      </div>
    </Panel>
  )
}

export default function Settings() {
  const dashboardContext = useDashboardContext()
  const userContext = useUserContext()
  const website = dashboardContext?.currentWebsite

  if (!website) return null

  const isOwner = Boolean(website.ownerID && website.ownerID === userContext?.id)
  const auth = website.options?.authentication

  return (
    <div className="space-y-5">
      <VerifyDomainCard
        websiteID={website._id}
        domain={website.domain}
        verified={Boolean(website.ownerID)}
      />

      <ScanningSettings
        websiteID={website._id}
        frequency={website.scan_frequency ?? "weekly"}
        subscribed={Boolean(
          userContext?.id && website.mail_subscribers.includes(userContext.id),
        )}
        subscriberCount={website.mail_subscribers.length}
      />

      <Panel
        title="Crawl authentication"
        description="Sent with every request so the crawler can reach pages behind a login."
      >
        {auth && (auth.cookies?.length || auth.headers?.length) ? (
          <div className="space-y-3">
            {auth.headers?.map((header, index) => (
              <div key={`header-${index}`} className="flex gap-2">
                <MicroLabel className="w-16 pt-2">Header</MicroLabel>
                <Input value={header.key ?? ""} readOnly className="font-mono text-xs" />
                <Input value="••••••••" readOnly className="font-mono text-xs" />
              </div>
            ))}
            {auth.cookies?.map((cookie, index) => (
              <div key={`cookie-${index}`} className="flex gap-2">
                <MicroLabel className="w-16 pt-2">Cookie</MicroLabel>
                <Input value={cookie.key ?? ""} readOnly className="font-mono text-xs" />
                <Input value="••••••••" readOnly className="font-mono text-xs" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No authentication configured. The crawler only sees pages a logged-out visitor can reach.
          </p>
        )}
      </Panel>

      {isOwner && <DangerZone websiteID={website._id} domain={website.domain} />}
    </div>
  )
}
