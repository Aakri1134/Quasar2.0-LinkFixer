import { useQuery } from "@tanstack/react-query"
import { WebsiteService } from "@/services/api/website/websiteService"

export const getScanStatusQueryKey = "get-scan-status"

// Websockets aren't built yet, so this polls the REST endpoint instead. It only polls while a
// scan is actually running - once it's idle or finished there's nothing to watch, so the interval
// turns off rather than hammering the API forever.
export default function useScanStatus(websiteID: string | null | undefined) {
  return useQuery({
    queryKey: [getScanStatusQueryKey, websiteID],
    queryFn: () => WebsiteService.getScanStatus(websiteID!),
    enabled: Boolean(websiteID),
    refetchInterval: (query) => {
      const phase = query.state.data?.phase
      const live = phase === "queued" || phase === "started" || phase === "crawling"
      return live ? 3000 : false
    },
  })
}
