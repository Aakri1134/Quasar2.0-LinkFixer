const DashboardSubheader = ({ data }: { data: { heading: string; data: string | number }[] }) => {
    return (
        <section className="w-screen items-center justify-center bg-[#f2f2f2] h-fit md:h-48 flex">
            <div className="max-w-6xl py-5 px-10 sm:py-5 sm:px-0 w-full flex flex-col bg-transparent gap h-fit justify-start items-center">
                <h1 className="font-bold text-2xl font-mono text-start w-full">Your Usage...</h1>
                <div className="flex pt-3 flex-row gap-2 w-full overflow-x-auto pb-2">
                    {data.map((item, index) => (
                        <div
                            key={index}
                            className="bg-white border-black/25 border flex flex-col justify-center items-stretch h-20 rounded-md shrink-0 min-w-40 flex-1"
                        >
                            <h3 className="text-md text-gray-400 font-mono px-2">{item.heading}</h3>
                            <p className="w-full text-center font-bold text-xl h-[60%]">{item.data}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default DashboardSubheader;