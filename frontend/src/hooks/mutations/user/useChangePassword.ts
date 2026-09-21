import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import type { AxiosError } from "axios"
import { UserService } from "@/services/api/user/userService"

export default function useChangePassword() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: UserService.changePassword,
    onSuccess: () => {
      // the server bumps tokenVersion, which kills this session - so send them to login
      // instead of leaving them with a cookie that fails on the next request
      toast.success("Password changed. Please log in again.")
      queryClient.clear()
      navigate("/login")
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data.message ?? "Could not change your password")
    },
  })
}
