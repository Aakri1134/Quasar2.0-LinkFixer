import { useEffect, useMemo, useState } from "react"
import { Globe, Search, SearchX, X } from "lucide-react"
import { useSearchParams } from "react-router"
import { useDashboardContext } from "../../context/dashboardContext"
import { clearPendingURL, readPendingURL } from "@/utils/pendingWebsite"
import useGetWebsites from "@/hooks/queries/website/useGetWebsites"
import SiteCard from "./SiteCard"
import AddNewModal from "./AddNewModal"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog"

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
      {children}
    </div>
  )
}

const SiteList = () => {
  const dashboardContext = useDashboardContext()
  const [addNewModalVisible, setAddNewModalVisible] = useState(false)
  const [search, setSearch] = useState("")
  const [searchParams, setSearchParams] = useSearchParams()

  // The landing page hero sends visitors here as /dashboard?url=... after signup. Open the add
  // form prefilled with it, then drop the param so a refresh does not reopen the dialog.
  const [prefillURL] = useState(() => searchParams.get("url") || readPendingURL())

  useEffect(() => {
    if (!prefillURL) return
    setAddNewModalVisible(true)
    clearPendingURL()
    if (searchParams.has("url")) {
      const next = new URLSearchParams(searchParams)
      next.delete("url")
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillURL])

  // Same query key as the dashboard context, so this is a cache read rather than a second request —
  // it exists only to give the list a real loading and error state.
  const { isLoading, isError, refetch, isFetching } = useGetWebsites()

  const websites = dashboardContext?.websites ?? []

  // The list is per-account and small; filtering client-side avoids a round trip per keystroke.
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return websites
    return websites.filter((web) => web.domain?.toLowerCase().includes(needle))
  }, [websites, search])

  const hasWebsites = websites.length > 0
  const searching = search.trim().length > 0

  return (
    <section
      className="flex w-full flex-1 items-center justify-center"
      style={{
        backgroundImage:
          "radial-gradient(circle, #e0e7ff 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <Dialog open={addNewModalVisible} onOpenChange={setAddNewModalVisible}>
        <div className="flex h-full w-full max-w-6xl flex-col items-center justify-start bg-white px-4 py-5">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-[45%]">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search websites"
                aria-label="Search websites by domain"
                className="h-9 w-full rounded-md border border-gray-200 pr-9 pl-9 text-sm transition-colors focus:border-emerald-500"
              />
              {searching && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <DialogTrigger className="h-9 shrink-0 cursor-pointer rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors duration-100 hover:bg-emerald-500">
              Add Website +
            </DialogTrigger>
          </div>

          <div className="flex w-full flex-col">
            <div className="flex items-center justify-between pt-5 pb-2">
              <h3 className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Added websites
              </h3>
              {hasWebsites && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-600">
                  {searching
                    ? `${filtered.length} of ${websites.length}`
                    : websites.length}
                </span>
              )}
            </div>

            <div className="flex w-full flex-col gap-2.5 px-1">
              {isLoading &&
                [0, 1, 2].map((row) => (
                  <div
                    key={row}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 p-4"
                  >
                    <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-100" />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
                      <div className="h-3 w-1/4 animate-pulse rounded bg-gray-50" />
                    </div>
                  </div>
                ))}

              {!isLoading && isError && (
                <Panel>
                  <p className="text-sm font-medium text-gray-900">
                    We could not load your websites
                  </p>
                  <p className="max-w-sm text-sm text-gray-500">
                    The request failed. This is usually a dropped connection or
                    an expired session.
                  </p>
                  <Button
                    variant="outline"
                    disabled={isFetching}
                    onClick={() => refetch()}
                    className="cursor-pointer"
                  >
                    {isFetching ? "Retrying..." : "Try again"}
                  </Button>
                </Panel>
              )}

              {!isLoading && !isError && !hasWebsites && (
                <Panel>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1F1C] text-emerald-400">
                    <Globe className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-medium text-gray-900">
                    No websites yet
                  </p>
                  <p className="max-w-sm text-sm text-gray-500">
                    Add your first site and we will look for its sitemap, then
                    start a first scan for broken links.
                  </p>
                  <DialogTrigger className="mt-1 h-9 cursor-pointer rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors duration-100 hover:bg-emerald-500">
                    Add Website +
                  </DialogTrigger>
                </Panel>
              )}

              {!isLoading && !isError && hasWebsites && filtered.length === 0 && (
                <Panel>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                    <SearchX className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-medium text-gray-900">
                    No websites match{" "}
                    <span className="font-mono break-all">
                      {search.trim()}
                    </span>
                  </p>
                  <p className="max-w-sm text-sm text-gray-500">
                    Search matches on the domain only.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setSearch("")}
                    className="cursor-pointer"
                  >
                    Clear search
                  </Button>
                </Panel>
              )}

              {!isLoading &&
                !isError &&
                filtered.map((web) => (
                  <SiteCard
                    key={web.id}
                    websiteID={web.id}
                    link={web.domain}
                    added={new Date(web.updatedAt)}
                  />
                ))}
            </div>
          </div>
        </div>

        <DialogContent className="w-full gap-0 overflow-hidden rounded-xl p-0 sm:max-w-2xl">
          <AddNewModal initialURL={prefillURL} onSuccess={() => setAddNewModalVisible(false)} />
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default SiteList
