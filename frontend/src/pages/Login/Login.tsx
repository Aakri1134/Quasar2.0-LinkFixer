import { useEffect, useRef, useState } from "react"
import { validator } from "../../utils/validator"
import banner from "../../assets/Untitled design-min.png"
import logo from "../../assets/logo.png"
import { logInUser } from "../../api/auth/login"
import { useUserContext } from "../../context/userContext"
import { useNavigate } from "react-router"
import Input from "../../components/card/Input"
// import Typography from "../../components/background/Typography"

function Login() {
  const emailInput = useRef<HTMLInputElement | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)
  const passwordInput = useRef<HTMLInputElement | null>(null)
  const [formErrorState, setFormErrorState] = useState<boolean>(false)
  const [formErrorMessage, setFormErrorMessage] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const userContext = useUserContext()
  const navigate = useNavigate()

  useEffect(() => {
    userContext?.checkLogin()
  }, [])
  useEffect(() => {
    // if (userContext?.email !== undefined && userContext.id !== undefined) {
    //   navigate("/dashboard")
    // }
  }, [userContext?.email, userContext?.id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const emailValue = emailInput.current?.value
    const passwordValue = passwordInput.current?.value

    if (!emailValue || typeof emailValue !== "string") {
      setFormErrorState(true)
      setFormErrorMessage("Email Cannot be empty")
      return
    }
    if (!passwordValue || typeof passwordValue !== "string") {
      setFormErrorState(true)
      setFormErrorMessage("Password Cannot be empty")
      return
    }

    if (!validator(emailValue, "email")) {
      setFormErrorState(true)
      setFormErrorMessage("Invalid Email or Password")
      return
    }

    // if (!validator(passwordValue, "password")) {
    //   // trigger global error popup as either password or mail is wrong
    // }
    console.log(emailValue)
    console.log(passwordValue)
    const res = await logInUser(emailValue, passwordValue)
    console.log("setting user context")
    setLoading(false)
    if (res !== null) userContext?.updateUser(res.user.email, res.user.id)
    else {
      setFormErrorState(true)
      setFormErrorMessage("Invalid Email or Password")
    }
  }

  return (
    <div
      className=" w-full h-screen flex justify-center md:justify-start "
      style={{
        backgroundImage: `url(${banner})`,
      }}
    >
      <div className=" bg-white shadow-[8px_0px_3px_0px_rgba(0,0,0,0.3)] w-full flex flex-col h-screen items-center px-4 py-10 md:min-w-[300px] md:w-[20%] md:h-screen justify-center relative">
        <img
          src={logo}
          alt="logo"
          className=" w-60 left-5 m-0 p-0 absolute top-10"
        />
        <form ref={formRef} className=" w-full" onSubmit={handleSubmit}>
          <Input
            label="Email"
            placeholder="Email"
            name="email"
            type="text"
            onChangeTrigger={() => {
              setFormErrorState(false)
              setFormErrorMessage("")
            }}
            errorMessage="Invalid Email"
            validation={(value: string) => {
              return validator(value, "email")
            }}
            addListeners={true}
            enterKeyPress={() => {
              queueMicrotask(() => {
                passwordInput.current?.focus()
              })
            }}
            ref={emailInput}
          />
          <Input
            ref={passwordInput}
            label="Password"
            onChangeTrigger={() => {
              setFormErrorState(false)
              setFormErrorMessage("")
            }}
            placeholder="Enter Password..."
            name="password"
            type="password"
            errorMessage="Invalid Email or Password"
            validation={(value: string) => {
              return validator(value, "password")
            }}
            addListeners={true}
            enterKeyPress={() => {
              formRef.current?.requestSubmit()
              setLoading(true)
            }}
          />
          {formErrorState ? (
            <h3 className=" w-full px-3 text-red-500 font-semibold font-mono py-0 text-md">
              Invalid Email or Passowrd
            </h3>
          ) : (
            <div className=" h-3" />
          )}
          <button
            type="submit"
            disabled={loading}
            className=" bg-amber-500 h-12 active:translate-1 w-full text-white border-2 border-white translate-1 hover:translate-0 hover:border-black text-lg my-2 font-bold rounded-lg duration-300 transition-all"
          >
            {loading ? "Loading..." : "Login"}
          </button>
        </form>
        <div className=" flex h-3 flex-row w-[85%] items-center gap-2">
          <div className=" w-full bg-[#8f8f8f] h-px" />
          <h1 className=" text-[#8f8f8f]">or</h1>
          <div className=" w-full bg-[#8f8f8f] h-px" />
        </div>
        <button
          onClick={() => {}}
          className=" bg-amber-500 h-12 w-full active:translate-1 text-white border-2 border-white translate-1 hover:translate-0 hover:border-black text-lg my-2 font-bold rounded-lg duration-300 transition-all"
        >
          Google
        </button>
      </div>
      {/* <div className=" w-[419px] h-50 bg-[#3bb56c] hidden md:block">
        <Typography
          texts={["Website Health check made easy", "Join now"]}
          className={[
            "hidden md:block font-extrabold font-mono text-5xl ml-10 mt-10 text-white [text-shadow:5px_5px_1px_rgba(0,0,0,0.8)]",
            "hidden md:block font-extrabold font-mono text-5xl ml-10 mt-10 text-white [text-shadow:5px_5px_1px_rgba(0,0,0,0.8)]",
          ]}
        />
      </div> */}
    </div>
  )
}

export default Login
