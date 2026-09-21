import { useState, useEffect } from "react"
import { Link } from "react-router"
import { Menu, X } from "lucide-react"
import logo from "../../assets/logo.png"
import { useUserContext } from "../../context/userContext"

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const userContext = useUserContext()

  useEffect(() => {
    userContext?.checkLogin()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks = [
    { name: "Features", path: "/features" },
    { name: "Pricing", path: "/pricing" },
    { name: "Documentation", path: "/docs" },
    { name: "About", path: "/about" },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-9999 transition-all duration-300 ${
        isScrolled ? "bg-white/90 backdrop-blur-md shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/"
            className="transition-all active:scale-95"
          >
            <img
              src={logo}
              alt="logo_makora"
              style={{
                width: 130,
              }}
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-gray-700 hover:text-green-600 font-medium transition-all relative group hover:-translate-y-0.5"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-linear-to-r from-green-500 to-yellow-400 group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            {userContext?.email !== undefined &&
            userContext?.id !== undefined ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-5 py-2 bg-linear-to-r from-green-500 to-yellow-400 text-white font-medium rounded-full hover:shadow-[4px_4px_0px_0px_rgba(34,197,94,0.4)] hover:-translate-x-1 hover:-translate-y-1 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-200"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-green-600 font-medium transition-all hover:scale-105 active:scale-95"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-5 py-2 bg-linear-to-r from-green-500 to-yellow-400 text-white font-medium rounded-full hover:shadow-[4px_4px_0px_0px_rgba(34,197,94,0.4)] hover:-translate-x-1 hover:-translate-y-1 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-200"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-all hover:scale-110 active:scale-95"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg overflow-hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="flex flex-col px-4 py-4 gap-1">
          {navLinks.map((link, index) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 text-gray-700 hover:bg-green-50 hover:text-green-600 rounded-lg font-medium transition-all hover:translate-x-1 active:scale-95 ${
                isMobileMenuOpen
                  ? "animate-in slide-in-from-left duration-300"
                  : ""
              }`}
              style={{
                animationDelay: isMobileMenuOpen ? `${index * 50}ms` : "0ms",
              }}
            >
              {link.name}
            </Link>
          ))}
          <div
            className={`flex flex-col gap-2 mt-4 px-4 ${
              isMobileMenuOpen
                ? "animate-in slide-in-from-left duration-300"
                : ""
            }`}
            style={{
              animationDelay: isMobileMenuOpen
                ? `${navLinks.length * 50}ms`
                : "0ms",
            }}
          >
            {userContext?.email !== undefined &&
            userContext?.id !== undefined ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-3 text-center bg-linear-to-r from-green-500 to-yellow-400 text-white font-medium rounded-full hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  Continue to Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-3 text-center text-gray-700 hover:text-green-600 font-medium transition-all hover:scale-105 active:scale-95"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-3 text-center bg-linear-to-r from-green-500 to-yellow-400 text-white font-medium rounded-full hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

export default Header
