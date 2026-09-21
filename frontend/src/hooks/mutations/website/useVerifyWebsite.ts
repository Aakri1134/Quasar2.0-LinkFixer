import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AxiosError } from "axios"
import { WebsiteService } from "@/services/api/website/websiteService"

export default function useVerifyWebsite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: WebsiteService.verifyWebsite,
    onSuccess: async (data, variables) => {
      toast.success(data.msg ?? "Website verified")
      await queryClient.invalidateQueries({
        queryKey: ["get-website-by-id", variables.websiteID],
      })
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data.message ?? "Could not verify the website")
    },
  })
}
