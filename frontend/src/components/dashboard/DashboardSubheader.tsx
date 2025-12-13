const DashboardSubheader = () => {
    return (<section className=" w-screen items-center justify-center bg-[#f2f2f2] h-fit md:h-48 flex">
        <div className=" max-w-5xl py-5 px-10 sm:py-5 sm:px-0 w-full flex flex-col bg-transparent gap h-fit justify-start items-center">
            <h1 className=" font-bold text-2xl font-mono text-start w-full">Your Usage...</h1>
            <div className=" grid pt-3 grid-rows-3 grid-cols-1 sm:grid-cols-3 sm:grid-rows-1 items-center justify-center gap-2 w-full ">
                <div className=" bg-white border-black/25 border flex flex-col justify-center items-stretch h-20 col-span-1 row-span-1 rounded-md">
                    <h3 className=" text-md text-gray-400 font-mono px-2">Heading</h3>
                    <p className=" w-full text-center font-bold text-xl h-[60%]">data</p>
                </div>
                <div className=" bg-white border-black/25 border flex flex-col justify-center items-stretch h-20 col-span-1 row-span-1 rounded-md">
                    <h3 className=" text-md text-gray-400 font-mono px-2">Heading</h3>
                    <p className=" w-full text-center font-bold text-xl h-[60%]">data</p>
                </div>
                <div className=" bg-white border-black/25 border flex flex-col justify-center items-stretch h-20 col-span-1 row-span-1 rounded-md">
                    <h3 className=" text-md text-gray-400 font-mono px-2">Heading</h3>
                    <p className=" w-full text-center font-bold text-xl h-[60%]">data</p>
                </div>
            </div>
        </div>
    </section>)
}

export default DashboardSubheader