import { createContext, useContext, useEffect } from "react"
import useGetWebsites, { getWebsitesQueryKey } from "@/hooks/queries/website/useGetWebsites"
import { useQueryClient } from "@tanstack/react-query"
import type { getWebsiteForUserOutput } from "@/services/api/website/websiteService.types"

type dashboardContextType = {
  websites: getWebsiteForUserOutput["website"] | undefined
  refetchWebsite : () => Promise<void>
}

const DashboardContext = createContext<dashboardContextType | undefined>(
  undefined
)

export const DashboardContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
    const {data : userWebsiteData, isLoading, isError, error} = useGetWebsites()
    const queryClient = useQueryClient()
    
    const value : dashboardContextType= {
        websites : userWebsiteData?.website,
        refetchWebsite : async () => {
            await queryClient.invalidateQueries({queryKey : [getWebsitesQueryKey]})
        }
    }

    useEffect(() => {
       console.log("user website data")
        console.log(userWebsiteData)
    }, [userWebsiteData])

    useEffect(() => {
         console.log("Error  ::: in dashborad context")
        console.log(isError)
        console.log(error)
    }, [isError, error])

    return (<DashboardContext.Provider value={value}>
        {children}
    </DashboardContext.Provider>)
}

export const useDashboardContext = () => {
    return useContext(DashboardContext)
}
