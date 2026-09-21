import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { ChevronDown, LogOut, User } from "lucide-react"
import logo from "../../assets/logo.png"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useLogoutUser } from "@/hooks/mutations/auth/useLogoutUser"

type LogoProps = { open: boolean }

const UserLogo = ({ open }: LogoProps) => (
  <div className="flex cursor-pointer flex-row items-center justify-center gap-2 outline-none">
    <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-3 bg-black">
      <User color="#fff" width={32} height={32} />
    </div>
    <ChevronDown
      color="#fff"
      className={`${open ? "rotate-180" : "rotate-0"} transition-all duration-150`}
    />
  </div>
)

const UserMenu = () => {
  const [open, setOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const navigate = useNavigate()
  const { mutate: logout, isPending } = useLogoutUser()

  const onLogout = () => {
    logout(undefined, {
      onSettled: () => {
        // Logout is idempotent server-side, so the user lands on /login either way rather than
        // being stranded on a dashboard whose session may already be gone.
        setConfirmLogout(false)
        navigate("/login")
      },
    })
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger>
          <UserLogo open={open} />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-56 rounded-xl border border-gray-200 bg-white p-2 text-gray-900 shadow-lg"
        >
          {/* Rendered as the anchor itself so the whole row is clickable and middle-click still works */}
          <DropdownMenuItem
            className="cursor-pointer rounded-lg px-3 py-2.5 text-base focus:bg-gray-100 focus:text-gray-900"
            render={<Link to="/account" />}
          >
            <User className="h-4 w-4" />
            My Account
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            className="cursor-pointer rounded-lg px-3 py-2.5 text-base text-red-600 focus:bg-red-50 focus:text-red-700"
            onClick={() => setConfirmLogout(true)}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log out?</DialogTitle>
            <DialogDescription>
              You will need to sign in again to reach your dashboard. Scans
              already running keep going on the server.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              disabled={isPending}
              onClick={() => setConfirmLogout(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="cursor-pointer"
              disabled={isPending}
              onClick={onLogout}
            >
              {isPending ? "Logging out..." : "Log out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

const DashboardHeader = () => {
  return (
    <header className="top-0 right-0 left-0 z-10 bg-[#1b1b1b] transition-all duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="transition-all active:scale-95">
            <img src={logo} alt="logo_makora" style={{ width: 130 }} />
          </Link>

          <div className="flex items-center gap-4">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
