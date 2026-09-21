import { useDashboardContext } from "@/context/dashboardContext";
import { WebsiteService } from "@/services/api/website/websiteService";
import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { toast } from "sonner";

export default function useAddWebsite(){
    const dashboardContext = useDashboardContext()
    return useMutation({
        mutationFn : WebsiteService.addWebsiteForUser,
        onSuccess : async () => {
            await dashboardContext?.refetchWebsite()
        },
        onError: (error : AxiosError<{message : string}>) => {
            toast.error(error.response?.data.message ?? "Something went wrong")
        }
    })
}