import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import type { AxiosError } from "axios"
import { AuthService } from "@/services/api/auth/authService"

export const useLogoutUser = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: AuthService.logOutUser,
    onSuccess: () => {
      // clear the cache so the next user doesn't see the old one's websites
      queryClient.clear()
      navigate("/login")
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data.message ?? "Could not log out")
    },
  })
}
