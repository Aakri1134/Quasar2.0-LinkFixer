import { createContext, useContext, useEffect, useState } from "react"
import useGetWebsites, {
  getWebsitesQueryKey,
} from "@/hooks/queries/website/useGetWebsites"
import { useQueryClient } from "@tanstack/react-query"
import type {
  getWebsiteForUserOutput,
  Website,
} from "@/services/api/website/websiteService.types"
import useGetWebsiteByID from "@/hooks/queries/website/useGetWebsiteByID"
import { useSearchParams } from "react-router"

type dashboardContextType = {
  websites: getWebsiteForUserOutput["website"] | undefined
  refetchWebsite: () => Promise<void>
  currentWebsite: Website | null
  openWebsiteID: (id: string) => void
}

const DashboardContext = createContext<dashboardContextType | undefined>(
  undefined,
)

export const DashboardContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { data: userWebsiteData, isLoading, isError, error } = useGetWebsites()
  const queryClient = useQueryClient()
  const [currentWebsiteID, setCurrentWebsiteID] = useState<string | null>(null)
  const { data: activeWebsite } = useGetWebsiteByID(currentWebsiteID)

  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    setCurrentWebsiteID(searchParams.get("active") ?? undefined)
  }, [searchParams])

  const value: dashboardContextType = {
    websites: userWebsiteData?.website,
    refetchWebsite: async () => {
      await queryClient.invalidateQueries({ queryKey: [getWebsitesQueryKey] })
    },
    currentWebsite: activeWebsite?.website ?? null,
    openWebsiteID: (id) => {
      setSearchParams({ active: id })
      setCurrentWebsiteID(id)
    },
  }

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

export const useDashboardContext = () => {
  return useContext(DashboardContext)
}
