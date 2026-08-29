import { useMutation } from "@tanstack/react-query"
import { useUserContext } from "@/context/userContext"
import { toast } from "sonner"
import { AuthService } from "@/services/api/auth/authService"
import type { AxiosError } from "axios"

export const useRegisterUser = () => {
  const userContext = useUserContext()

  return useMutation({
    mutationFn: AuthService.registerUser,
    onSuccess: (data) => {
      // trigger alert about verification mail sent
      if (data) {
        userContext?.checkLogin()
        toast(data.msg)
      }
    },
    onError: (error: AxiosError) => {
      // trigger alert about error in registering
      toast.error((error.response?.data as any).message)
    },
  })
}
