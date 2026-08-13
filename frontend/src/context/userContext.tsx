import { createContext, useContext, useEffect } from "react"
import {
  useVerifyAuth,
  verifyAuthQueryKey,
} from "@/hooks/queries/auth/useVerifyAuth"
import { useQueryClient } from "@tanstack/react-query"

type userContextType = {
  email?: string
  id?: string
  username?: string
  emailVerified?: boolean
  loading: boolean
  checkLogin: () => Promise<void>
}

const UserContext = createContext<userContextType | undefined>(undefined)

export const UserContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { data, isLoading : loading } = useVerifyAuth()
  const queryClient = useQueryClient()

  async function checkLogin() {
    await queryClient.invalidateQueries({
      queryKey: [verifyAuthQueryKey],
    })
  }

  useEffect(() => {
    if (!data?.authenticated) {
      checkLogin()
    } else {
      checkLogin()
    }
  }, [data])

  const value: userContextType = { ...data?.user, checkLogin, loading }
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export const useUserContext = () => {
  return useContext(UserContext)
}
