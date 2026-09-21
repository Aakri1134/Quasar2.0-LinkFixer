import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CheckService } from "@/services/api/check/checkService"
import type { getChecksPayload } from "@/services/api/check/checkService.types"

export const getChecksQueryKey = "get-checks"

export default function useGetChecks(payload: getChecksPayload | null) {
  return useQuery({
    queryKey: [getChecksQueryKey, payload],
    queryFn: () => CheckService.getChecks(payload!),
    enabled: Boolean(payload?.websiteID),
    placeholderData: keepPreviousData,
  })
}
