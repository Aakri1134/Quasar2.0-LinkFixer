import { Trash } from "lucide-react"
import { Button } from "../ui/button"
import useGenerateVerificationFile from "@/hooks/mutations/website/useGenerateVerificationFile"

const SiteCard = ({
  link,
  added,
  sendTo,
  websiteID
}: {
  link: string
  added: Date
  sendTo: string
  websiteID: string
}) => {
  const {mutate : deleteWebsite} = useGenerateVerificationFile();
  return (
    <div className=" border-2 border-black/20 p-4 justify-between items-center rounded-xl flex flex-row">
      <div className=" flex flex-row gap-4 cursor-pointer">
        <div className=" rounded-full w-10 h-10 bg-black" />
        <div className=" flex flex-col">
          <p className=" text-lg text-[#343434] font-semibold">{link}</p>
          <p className=" text-xs font-mono text-gray-400">
            Last Updated :{" "}
            {added.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            ,
            {added.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour12: true,
            })}
          </p>
        </div>
      </div>
      <Button variant={"destructive"} onClick={() => {
        deleteWebsite({websiteID})
      }}>
        <Trash className=" cursor-pointer" />
      </Button>
    </div>
  )
}
export default SiteCard
