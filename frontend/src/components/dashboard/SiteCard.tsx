const SiteCard = ({
  link,
  added,
  sendTo,
}: {
  link: string
  added: Date
  sendTo: string
}) => {
  return (
    <div className=" border-2 border-black/20 p-4 justify-between items-center rounded-xl flex flex-row">
      <div className=" flex flex-row gap-4 cursor-pointer">
        <div className=" rounded-full w-10 h-10 bg-black" />
        <div className=" flex flex-col">
          <h2 className=" text-lg text-[#343434] font-semibold">{link}</h2>
          <p className=" text-xs font-mono text-gray-400">
            Last Updated :{" "}
            {added.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            ,{" "}
            {added.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour12: true,
            })}
          </p>
        </div>
      </div>
      <h1 className=" cursor-pointer">+</h1>
    </div>
  )
}
export default SiteCard
