import { createContext, useContext, useEffect, useState } from "react"
import { validator } from "../utils/validator"
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
  updateUser: (prop: {
    email: string
    id: string
    username: string
    emailVerified: boolean
  }) => boolean
  checkLogin: () => Promise<void>
}

const UserContext = createContext<userContextType | undefined>(undefined)

export const UserContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [email, setEmail] = useState<string | undefined>()
  const [id, setId] = useState<string | undefined>()
  const [username, setUsername] = useState<string | undefined>()
  const [emailVerified, setEmailVerified] = useState<boolean | undefined>()
  const { data : verificationData, isLoading : loading } = useVerifyAuth()
  const queryClient = useQueryClient()

  const updateUser: userContextType["updateUser"] = ({ email, id, username, emailVerified }) => {
    if (validator(email, "email")) {
      setEmail(email)
      setId(id)
      setUsername(username)
      setEmailVerified(emailVerified)
      return true
    }
    return false
  }

  async function checkLogin() {
    await queryClient.invalidateQueries({
      queryKey: [verifyAuthQueryKey],
    })
  }

  function clearContext(){
    setEmail(undefined)
    setId(undefined)
    setUsername(undefined)
    setEmailVerified(undefined)
  }

  useEffect(() => {
    console.log(verificationData?.authenticated)
    if (!verificationData?.authenticated) {
      clearContext()
    } else {
      console.log(verificationData.user)
      updateUser(verificationData.user)
    }
  }, [verificationData])

  const value: userContextType = { email, id, emailVerified, username, updateUser, checkLogin, loading }
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export const useUserContext = () => {
  return useContext(UserContext)
}
