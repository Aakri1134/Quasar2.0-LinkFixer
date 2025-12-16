import { useState } from "react"
import Checkbox from "../card/Checkbox"

const AddNewModal = () => {
  const [subscribedMails, setSubscribedMails] = useState<boolean>(false)
  const [agreeToTerms, setAgreeToTerms] = useState<boolean>(false)
  const [advancedExpanded, setAdvancedExpanded] = useState<boolean>(false)

  return (
    <div className=" w-100 h-fit p-4 bg-white rounded-xl flex flex-col">
      <div className=" flex flex-col w-full">
        <h1 className=" font-bold text-2xl font-mono ml-1">Add New Website</h1>
        <div className=" h-1 bg-red-500 rounded-full"></div>
      </div>
      <form className=" px-2 flex flex-col gap-3 w-full">
        <label className=" w-full flex flex-col pt-4 items-stretch">
          <h1 className=" text-lg font-semibold">
            Enter a link from your website
          </h1>

          <input
            name="link"
            className=" outline rounded-lg mx-1 h-10 text-sm outline-black/30 px-2 transition-all focus:outline-2 focus:outline-black duration-50"
            placeholder="https://example.com"
          />
        </label>
        <div>
          <div className=" w-full flex justify-between">
            <h1 className=" text-lg font-semibold">Advanced Features</h1>
            <div onClick={() => {setAdvancedExpanded(x => !x)}} className=" font-mono cursor-pointer w-6">V</div>
          </div>
          {advancedExpanded && <div>
            
        <h3>Enter Sitemap link</h3>
        <h3>Upload Sitemap</h3>
        <h3>Select Authentication Method</h3>
        <h3>Enter Cookie</h3>
        <h3>Enter JWT</h3>
        <h3>More to be added soon</h3>
            </div>}
        </div>
        <Checkbox
          name="check1"
          label="Subscribe to mail reports"
          checked={subscribedMails}
          onChange={() => {
            setSubscribedMails((x) => !x)
          }}
        />
        <Checkbox
          name="check1"
          label="Accept Terms and Conditions"
          checked={agreeToTerms}
          className=" py-2"
          onChange={() => {
            setAgreeToTerms((x) => !x)
          }}
        />
      </form>
    </div>
  )
}
export default AddNewModal
