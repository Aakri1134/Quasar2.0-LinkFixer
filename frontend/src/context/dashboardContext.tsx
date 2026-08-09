import { createContext, useContext, useEffect, useState } from "react"
import { useUserContext } from "./userContext"
import getWebsites from "../services/api/user/getWebsites"

type dashboardContextType = {
  websites: any[]
//   currentWebsiteData: {
//     id: string
//     domain: string
//     checkedLinks: any[]
//     brokenLinks: any[]
//     updatedAt: Date
//     createdAt: Date
//   }
  fetchWebsites : () => Promise<void>
}

const DashboardContext = createContext<dashboardContextType | undefined>(
  undefined
)

export const DashboardContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {

    const userContext = useUserContext()

    async function fetchWebsites(){
        console.log("Fetching websites")
        const res = await getWebsites()
        if(!res){
            setWebsites([])
        }else{
            setWebsites(res)
            console.log("Set website")
            console.log(res)
        }
    }

    useEffect(() => {
        fetchWebsites()
    }, [userContext?.email, userContext?.id])

    const [websites, setWebsites] = useState<any[]>([])
    
    const value : dashboardContextType= {
        websites,
        fetchWebsites
    }
    return (<DashboardContext.Provider value={value}>
        {children}
    </DashboardContext.Provider>)
}

export const useDashboardContext = () => {
    return useContext(DashboardContext)
}
