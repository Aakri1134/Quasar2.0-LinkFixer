import { WebsiteService } from "@/services/api/website/websiteService";
import { useQuery } from "@tanstack/react-query";

export default function useGetWebsiteByID( websiteID : string | undefined){
    return useQuery({
        queryKey : ["get-website-by-id", websiteID],
        queryFn : async () => {
            if(!websiteID) return null
            const data = await WebsiteService.getWebsiteByID(websiteID)
            return  data
        },
        staleTime : 10 * 60 * 1000
    })
}