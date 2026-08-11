import { Link } from "react-router"
import logo from "../../assets/logo.png"
import { ChevronDown, User } from "lucide-react"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type LogoProps = { open: boolean }

const UserLogo = ({ open }: LogoProps) => (
  <div className="flex flex-row justify-center items-center gap-2 cursor-pointer outline-none">
    <div className="w-10 h-10 bg-black rounded-full border-3 flex items-center justify-center cursor-pointer">
      <User color="#fff" width={32} height={32} />
    </div>
    <ChevronDown
      color="#fff"
      className={`${open ? "rotate-180" : "rotate-0"} transition-all duration-150`}
    />
  </div>
)

const ACCOUNT_OPTIONS = [{ label: "My Account", href: "/account" }]

const RIGHT_PANEL = [
  {
    logo: UserLogo,
    options: ACCOUNT_OPTIONS,
  },
]

const RightPanelItem = ({
  logo: Logo,
  options,
}: (typeof RIGHT_PANEL)[number]) => {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger>
        <Logo open={open} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 bg-white border border-gray-200 text-gray-900 shadow-lg rounded-xl p-2"
      >
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.href}
            className="cursor-pointer text-base py-2.5 px-3 rounded-lg focus:bg-gray-100 focus:text-gray-900"
          >
            <Link to={opt.href}>{opt.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const DashboardHeader = () => {
  return (
    <header className="top-0 left-0 right-0 z-10 bg-[#1b1b1b] transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="transition-all active:scale-95">
            <img src={logo} alt="logo_makora" style={{ width: 130 }} />
          </Link>

          <div className="flex items-center gap-4">
            {RIGHT_PANEL.map((item, i) => (
              <RightPanelItem key={i} {...item} />
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
