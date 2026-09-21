import { useQuery } from "@tanstack/react-query"
import { UserService } from "@/services/api/user/userService"

export const getMeQueryKey = "get-me"

export default function useGetMe() {
  return useQuery({
    queryKey: [getMeQueryKey],
    queryFn: UserService.getMe,
    staleTime: 5 * 60 * 1000,
  })
}
