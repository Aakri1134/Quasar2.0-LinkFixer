const AddNewModal = () => {
  return (
    <div className=" w-100 h-100 p-4 bg-white rounded-xl flex flex-col">
      <div className=" flex flex-col w-full">
        <h1 className=" font-bold text-2xl font-mono ml-1">Add New Website</h1>
        <div className=" h-1 bg-red-500 rounded-full"></div>
      </div>
      <form className=" px-2 flex flex-col w-full">
        <label className=" text-lg font-semibold pt-4">
          Enter a link from your website
        </label>
        <input
          name="link"
          className=" outline rounded-lg m-2 h-10 text-sm outline-black/30 px-2 transition-all focus:outline-2 focus:outline-black duration-50"
          placeholder="https://example.com"
        />
        <label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    className="peer hidden"
  />

  <span
    className="
      h-5 w-5
      border border-gray-400
      rounded
      flex items-center justify-center
      peer-checked:bg-blue-600
      peer-checked:border-blue-600
      transition-all
      duration-200
    "
  >
    <svg
      className="hidden peer-checked:block w-4 h-4 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      viewBox="0 0 24 24"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  </span>

  <span className="text-sm">Accept terms</span>
</label>

        <h3>Enter Sitemap link</h3>
        <h3>Upload Sitemap</h3>
        <h3>Select Authentication Method</h3>
        <h3>Enter Cookie</h3>
        <h3>Enter JWT</h3>
        <h3>More to be added soon</h3>
      </form>
    </div>
  )
}
export default AddNewModal
