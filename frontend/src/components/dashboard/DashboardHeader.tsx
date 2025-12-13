import { Link } from "react-router"
import logo from "../../assets/logo.png"

const DashboardHeader = () => {
  return (
    <header
      className={`top-0 left-0 right-0 z-9999 bg-[#1b1b1b] transition-all duration-300`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="transition-all active:scale-95">
            <img
              src={logo}
              alt="logo_makora"
              style={{
                width: 130,
              }}
            />
          </Link>
          <div className=" flex flex-row justify-center items-center gap-2">
            <div className=" w-10 h-10 bg-black rounded-full" />
            <div className=" w-11 h-11 bg-black rounded-full" />
          </div>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
