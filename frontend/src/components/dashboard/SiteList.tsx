import { useRef, useState } from "react"
import { useDashboardContext } from "../../context/dashboardContext"
import SiteCard from "./SiteCard"
import ModalPortal from "../Modal/ModalPortal"
import AddNewModal from "./AddNewModal"

const SiteList = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const dashboardContext = useDashboardContext()
  const [addNewModalVisible, setAddNewModalVisible] = useState<boolean>(true)

  function toggleAddNewModalVisible() {
    setAddNewModalVisible((x) => !x)
  }

  return (
    <section
      className=" w-screen items-center justify-center h-48 flex flex-1"
      style={{
        backgroundImage:
          "radial-gradient(circle, #e0e7ff 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      {addNewModalVisible && (
        <ModalPortal
        style={{
            backgroundColor : "rgba(10,10,10,0.4)",
            zIndex : 9999,
            display : "flex",
            justifyContent : "center",
            alignItems : "center"
        }}
        hideModal={toggleAddNewModalVisible}>
          <AddNewModal />
        </ModalPortal>
      )}
      <div className=" max-w-5xl py-5 px-4 w-full flex flex-col bg-white h-full justify-start items-center">
        <div className=" w-[90%] flex flex-col h-18 sm:w-full sm:h-fit sm:flex-row justify-between">
          <input
            ref={inputRef}
            placeholder="Search"
            className=" border rounded-md focus:outline-[#757575] min-w-72 w-full border-[#c7c7c7] text-sm sm:w-[30%] focus:sm:w-[50%] h-8 px-5 transition-all duration-200"
          />
          <div className=" flex items-stretch justify-end w-full sm:w-fit gap-3">
            <button className=" bg-[#f2f2f2] border-2 border-[#f2f2f2] hover:bg-white px-4 duration-100 rounded-md font-semibold text-md">
              Starred
            </button>
            <button
              onClick={toggleAddNewModalVisible}
              className=" bg-green-500 hover:bg-green-400 border-2 border-transparent hover:border-white px-4 duration-100 rounded-md font-semibold text-white text-md"
            >
              Add Website +
            </button>
          </div>
        </div>
        <div className=" w-[90%] sm:w-full flex flex-col ">
          <h1 className=" pt-5 pb-2 text-md font-mono font-bold text-gray-300">
            Added Websites
          </h1>
          <div className=" w-full flex flex-col px-1">
            {dashboardContext?.websites.map((web) => {
              return (
                <SiteCard
                  link={web.domain}
                  added={new Date(web.updatedAt)}
                  sendTo="123"
                  key={web.domain || Math.random()}
                />
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
export default SiteList
