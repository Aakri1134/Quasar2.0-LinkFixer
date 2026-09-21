import { useUserContext } from "@/context/userContext"
import { useEffect, type ReactNode } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import LoadingScreen from "../background/LoadingScreen"

export default function AuthCheckWrapper({ children }: { children: ReactNode }) {
  const userContext = useUserContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (userContext && (!userContext.loading && !userContext.id)) {
      navigate("/")
      toast("Unauthorized access")
    }
  }, [userContext, userContext?.loading, userContext?.id])

  if (!userContext || userContext.loading) {
    return <LoadingScreen message="Verifying User..."/>
  }

  if (!userContext.id) {
    return null
  }

  return <>{children}</>
}