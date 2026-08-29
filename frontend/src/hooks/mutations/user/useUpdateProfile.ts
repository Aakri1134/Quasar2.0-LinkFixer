import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AxiosError } from "axios"
import { UserService } from "@/services/api/user/userService"
import { getMeQueryKey } from "@/hooks/queries/user/useGetMe"

export default function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: UserService.updateMe,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: [getMeQueryKey] })
      toast.success(data.msg ?? "Profile updated")
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data.message ?? "Could not update your profile")
    },
  })
}
