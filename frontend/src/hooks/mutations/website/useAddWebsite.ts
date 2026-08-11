import { useDashboardContext } from "@/context/dashboardContext";
import { WebsiteService } from "@/services/api/website/websiteService";
import { useMutation } from "@tanstack/react-query";

export default function useAddWebsite(){
    const dashboardContext = useDashboardContext()
    return useMutation({
        mutationFn : WebsiteService.addWebsiteForUser,
        onSuccess : async () => {
            await dashboardContext?.refetchWebsite()
        },
        onError: (error) => {
            console.log("Error ocurred in the add website mutation")
            console.log(error)
        }
    })
}