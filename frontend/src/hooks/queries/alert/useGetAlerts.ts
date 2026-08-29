import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { AlertService } from "@/services/api/alert/alertService"
import type { getAlertsPayload } from "@/services/api/alert/alertService.types"

export const getAlertsQueryKey = "get-alerts"

export default function useGetAlerts(payload: getAlertsPayload | null) {
  return useQuery({
    queryKey: [getAlertsQueryKey, payload],
    queryFn: () => AlertService.getAlerts(payload!),
    enabled: Boolean(payload?.websiteID),
    // keeps the old rows on screen while the next page loads, so the table doesn't flash empty
    placeholderData: keepPreviousData,
  })
}
