import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import banner from "../../assets/Untitled design-min.webp"
import logo from "../../assets/logo.png"
import { useUserContext } from "../../context/userContext"
import { Link, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { registerSchema } from "@/utils/schemas/auth"
import { useRegisterUser } from "@/hooks/mutations/auth/useRegisterUser"
import type { RegisterInput } from "@/services/api/auth/authService.types"
// import Typography from "../../components/background/Typography"

export default function Signup() {
  const [formErrorState, setFormErrorState] = useState<boolean>(false)
  const [formErrorMessage, setFormErrorMessage] = useState<string>("")
  const userContext = useUserContext()
  const { mutate: registerUser, isPending: loading } = useRegisterUser()
    const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
    },
  })

  useEffect(() => {
    if (userContext?.email !== undefined && userContext.id !== undefined) {
      navigate("/dashboard")
    }
  }, [userContext?.email, userContext?.id])

  const onSubmit = (values: RegisterInput) => {
    registerUser(values)
  }

  const onInvalid = () => {
    setFormErrorState(false)
    setFormErrorMessage("")
  }

  const emailField = register("email", {
    onChange: () => {
      setFormErrorState(false)
      setFormErrorMessage("")
    },
  })

  const passwordField = register("password", {
    onChange: () => {
      setFormErrorState(false)
      setFormErrorMessage("")
    },
  })

  const usernameField = register("username", {
    onChange: () => {
      setFormErrorMessage("")
      setFormErrorState(false)
    },
  })

  const errorInputClass =
    "border-red-400 focus-visible:ring-red-400/40 focus-visible:border-red-400"

  return (
    <main
      className="w-full min-h-screen flex items-center justify-center md:justify-start bg-cover bg-center bg-no-repeat p-4 md:p-0"
      style={{
        backgroundImage: `url(${banner})`,
      }}
    >
      <Card className="bg-white shadow-xl rounded-2xl w-full max-w-sm flex flex-col items-center relative md:shadow-[8px_0px_3px_0px_rgba(0,0,0,0.3)] md:w-[380px] md:min-w-0 md:max-w-none md:h-screen md:justify-center md:rounded-none md:border-0 md:mx-0">
        <Link to="/" className="cursor-pointer w-48 mt-4 md:m-0 md:max-w-80 md:w-auto md:px-10 md:mb-0 md:absolute md:top-10">
        <img
          src={logo}
          alt="logo"
        />
        </Link>
        <CardHeader className=" w-full px-3 md:px-6 ">
            <h1 className=" text-xl md:text-2xl font-bold text-primary">Sign up</h1>
            <p className=" text-sm md:text-md font-semibold text-black/50">Already have an account? <Link className="text-sb md:text-md font-bold px-1 text-primary" to="/login">Log In</Link></p>
        </CardHeader>
        <CardContent className="w-full px-4 md:px-8">
          <form
            className=" w-full flex flex-col gap-2.5"
            onSubmit={handleSubmit(onSubmit, onInvalid)}
          >
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="username"
                className="text-sm font-medium text-neutral-800"
              >
                Username
              </Label>
              <Input
                id="username"
                placeholder="John Doe"
                type="text"
                className={cn(
                  "h-12 rounded-lg text-sm border-neutral-300 focus-visible:ring-emerald-600/30 focus-visible:border-emerald-600",
                  errors.username && errorInputClass,
                )}
                {...usernameField}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    queueMicrotask(() => {
                      setFocus("email")
                    })
                  }
                }}
              />
              {errors.username ? (
                <p className="text-red-500 text-xs">
                  {errors.username.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-neutral-800"
              >
                Email
              </Label>
              <Input
                id="email"
                placeholder="name@example.com"
                type="text"
                className={cn(
                  "h-12 rounded-lg text-sm border-neutral-300 focus-visible:ring-emerald-600/30 focus-visible:border-emerald-600",
                  errors.email && errorInputClass,
                )}
                {...emailField}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    queueMicrotask(() => {
                      setFocus("password")
                    })
                  }
                }}
              />
              {errors.email ? (
                <p className="text-red-500 text-xs">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-neutral-800"
              >
                Password
              </Label>
              <Input
                id="password"
                placeholder="Enter password"
                type="password"
                className={cn(
                  "h-12 rounded-lg text-sm border-neutral-300 focus-visible:ring-emerald-600/40 focus-visible:border-emerald-600",
                  errors.password && errorInputClass,
                )}
                {...passwordField}
              />
              {errors.password ? (
                <p className="text-red-500 text-xs">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            {formErrorState ? (
              <p className="text-red-500 text-xs font-medium -mt-1">
                {formErrorMessage}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={loading}
              className="mt-1 bg-primary hover:bg-primary-hover hover:-translate-0.5 active:translate-0 h-12 w-full text-white border-2 border-white hover:border-black text-base font-bold rounded-lg duration-300 transition-all"
            >
              {loading ? "Loading..." : "Sign Up"}
            </Button>
          </form>

          <div className="flex items-center gap-1 w-full my-2">
            <Separator className="flex-1 bg-neutral-300" />
            <span className="text-neutral-400 text-xs uppercase tracking-wide shrink-0">
              or
            </span>
            <Separator className="flex-1 bg-neutral-300" />
          </div>

          <Button
            onClick={() => {}}
            className="bg-primary hover:bg-primary-hover hover:-translate-0.5 active:translate-0 h-12 w-full text-white border-2 border-white hover:border-black text-base font-bold rounded-lg duration-300 transition-all"
          >
            Google
          </Button>
        </CardContent>
      </Card>
      {/* <div className=" w-[419px] h-50 bg-[#3bb56c] hidden md:block">
        <Typography
          texts={["Website Health check made easy", "Join now"]}
          className={[
            "hidden md:block font-extrabold font-mono text-5xl ml-10 mt-10 text-white [text-shadow:5px_5px_1px_rgba(0,0,0,0.8)]",
            "hidden md:block font-extrabold font-mono text-5xl ml-10 mt-10 text-white [text-shadow:5px_5px_1px_rgba(0,0,0,0.8)]",
          ]}
        />
      </div> */}
    </main>
  )
}
