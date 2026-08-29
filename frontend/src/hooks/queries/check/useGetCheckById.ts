import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CheckService } from "@/services/api/check/checkService"
import type { getCheckByIdPayload } from "@/services/api/check/checkService.types"

export const getCheckByIdQueryKey = "get-check-by-id"

export default function useGetCheckById(payload: getCheckByIdPayload | null) {
  return useQuery({
    queryKey: [getCheckByIdQueryKey, payload],
    queryFn: () => CheckService.getCheckById(payload!),
    enabled: Boolean(payload?.checkID),
    placeholderData: keepPreviousData,
  })
}
