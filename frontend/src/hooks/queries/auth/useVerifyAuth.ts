import { useUserContext } from "@/context/userContext"
import { AuthService } from "@/services/api/auth/authService"
import { useQuery } from "@tanstack/react-query"

export const verifyAuthQueryKey = "verify-auth-query"

export const useVerifyAuth = () => {
  const userContext = useUserContext()
  return useQuery({
    queryKey: [verifyAuthQueryKey],
    queryFn: async () => {
      const data = await AuthService.verifyAuthUser()
      if (data) userContext?.updateUser(data?.user)
      return data
    },
  })
}
