import { useRef, useState } from "react"
import { useDashboardContext } from "../../context/dashboardContext"
import SiteCard from "./SiteCard"
import AddNewModal from "./AddNewModal"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog"

const SiteList = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const dashboardContext = useDashboardContext()
  const [addNewModalVisible, setAddNewModalVisible] = useState(false)

  return (
    <section
      className="w-screen items-center justify-center flex flex-1"
      style={{
        backgroundImage:
          "radial-gradient(circle, #e0e7ff 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <Dialog open={addNewModalVisible} onOpenChange={setAddNewModalVisible}>
        <div className="max-w-6xl py-5 px-4 w-full flex flex-col bg-white h-full justify-start items-center">
          <div className="w-[90%] flex flex-col h-18 sm:w-full sm:h-fit sm:flex-row justify-between">
            <Input
              ref={inputRef}
              placeholder="Search"
              className="border rounded-md focus:outline-[#757575] min-w-72 w-full border-[#c7c7c7] text-sm sm:w-[30%] focus:sm:w-[50%] h-8 px-5 transition-all duration-200"
            />
            <div className="flex items-stretch justify-end w-full sm:w-fit gap-3">
              <Button
                variant="outline"
                className="px-4 rounded-md font-semibold text-md text-black"
              >
                Starred
              </Button>
              <DialogTrigger className="bg-green-500 hover:bg-green-400 px-4 duration-100 rounded-md font-semibold text-white text-md">
                Add Website +
              </DialogTrigger>
            </div>
          </div>

          <div className="w-[90%] sm:w-full flex flex-col">
            <h3 className="pt-5 pb-2 text-md font-mono font-bold text-gray-300">
              Added Websites
            </h3>
            <div className="w-full flex flex-col px-1">
              {dashboardContext?.websites?.map((web) => (
                <SiteCard
                  websiteID={web.id}
                  link={web.domain}
                  added={new Date(web.updatedAt)}
                  sendTo="123"
                  key={web.domain || Math.random()}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogContent className="max-w-2xl w-[680px] p-0 gap-0 overflow-hidden rounded-xl">
          <AddNewModal />
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default SiteList
