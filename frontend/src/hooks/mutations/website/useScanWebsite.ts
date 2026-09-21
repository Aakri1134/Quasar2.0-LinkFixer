import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AxiosError } from "axios"
import { WebsiteService } from "@/services/api/website/websiteService"
import { getScanStatusQueryKey } from "@/hooks/queries/website/useScanStatus"

export default function useScanWebsite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: WebsiteService.scanWebsite,
    onSuccess: async (data, variables) => {
      toast.success(data.msg ?? "Scan queued")
      await queryClient.invalidateQueries({
        queryKey: [getScanStatusQueryKey, variables.websiteID],
      })
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data.message ?? "Could not start the scan")
    },
  })
}
