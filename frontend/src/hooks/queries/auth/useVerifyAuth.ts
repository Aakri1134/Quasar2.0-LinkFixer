import { AuthService } from "@/services/api/auth/authService"
import { useQuery } from "@tanstack/react-query"

export const verifyAuthQueryKey = "verify-auth-query"

export const useVerifyAuth = () => {
  return useQuery({
    queryKey: [verifyAuthQueryKey],
    queryFn: async () =>  await AuthService.verifyAuthUser(),
    staleTime: 5 * 60 * 1000
  })
}

