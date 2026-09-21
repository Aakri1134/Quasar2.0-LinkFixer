import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AxiosError } from "axios"
import { AlertService } from "@/services/api/alert/alertService"
import { getAlertsQueryKey } from "@/hooks/queries/alert/useGetAlerts"

export default function useResolveAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: AlertService.updateAlert,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [getAlertsQueryKey] })
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data.message ?? "Could not update the alert")
    },
  })
}
