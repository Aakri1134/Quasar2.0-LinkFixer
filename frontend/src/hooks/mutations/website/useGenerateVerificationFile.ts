import { WebsiteService } from "@/services/api/website/websiteService"
import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"

export default function useGenerateVerificationFile() {
  return useMutation({
    mutationFn: WebsiteService.generateWebsiteVerification,
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data.data)], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "makora-verification.txt"
      a.click()
      URL.revokeObjectURL(url)
    },
    onError: (error: AxiosError) => {
      toast.error((error.response?.data as any).message)
    },
  })
}
