import { useMutation } from "@tanstack/react-query"
import { useUserContext } from "@/context/userContext"
import { toast } from "sonner"
import { AuthService } from "@/services/api/auth/authService"
import type { AxiosError } from "axios"

export const useLoginUser = () => {
  const userContext = useUserContext()

  return useMutation({
    mutationFn: AuthService.logInUser,
    onSuccess: (data) => {
      // trigger alert about verification mail sent
      if (data) {
        userContext?.updateUser(data.user)
        toast(data.msg)
      }
    },
    onError: (error : AxiosError) => {
      // trigger alert about error in registering
      toast.error((error.response?.data as any).errors[0].message)
    },
  })
}
