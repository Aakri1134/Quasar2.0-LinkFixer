import { useUserContext } from "@/context/userContext";
import { WebsiteService } from "@/services/api/website/websiteService";
import { useQuery } from "@tanstack/react-query";

export const getWebsitesQueryKey = "get-websites-for-user"

export default function useGetWebsites(){
    const userContext = useUserContext()
    return useQuery({
        queryKey : [getWebsitesQueryKey, userContext?.id, userContext?.email],
        queryFn : WebsiteService.getWebsiteForUser,
    })
}