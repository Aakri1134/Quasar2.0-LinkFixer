import { useMutation } from "@tanstack/react-query"
import { useUserContext } from "@/context/userContext"
import { toast } from "sonner"
import { AuthService } from "@/services/api/auth/authService"
import type { AxiosError } from "axios"

export const useVerifyMail = () => {
  const userContext = useUserContext()

  return useMutation({
    mutationFn: AuthService.verifyMail,
    onSuccess: (data) => {
      // trigger alert about verification mail sent
      if (data) {
        userContext?.updateUser(data.user)
        toast(data.msg)
      }
    },
    onError: (error: AxiosError) => {
      // trigger alert about error in registering
      console.log(error)
      toast.error((error.response?.data as any).message)
    },
  })
}
