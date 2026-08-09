import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react"
import logo from "../../assets/logo.png"
import { Button } from "@/components/ui/button"
import { useVerifyMail } from "@/hooks/mutations/auth/useVerifyMail"

const REDIRECT_SECONDS = 5
const REDIRECT_PATH = "/login"

export function VerifyMail() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const { mutate: verifyEmail, isPending, isSuccess, isError, error } =
    useVerifyMail()

  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS)
  const hasFired = useRef(false)

  // Kick off verification once, as soon as we have a token
  useEffect(() => {
    if (!token || hasFired.current) return
    hasFired.current = true
    queueMicrotask(() => verifyEmail(token))
  }, [token, verifyEmail])

  // Once verified, count down and redirect
  useEffect(() => {
    if (!isSuccess) return

    if (secondsLeft <= 0) {
      navigate(REDIRECT_PATH)
      return
    }

    const timeout = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timeout)
  }, [isSuccess, secondsLeft, navigate])

  useEffect(() => {
    console.log("Inside UseEffect ::::")
    console.log(isError)
    console.log(error)
    console.log(isPending)
    console.log(showError)
    console.log(isSuccess)
  }, [error, isError, isPending, isSuccess])
  

  const missingToken = !token
  const showError = missingToken || isError
  const progressPct = ((REDIRECT_SECONDS - secondsLeft) / REDIRECT_SECONDS) * 100

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4">
      {/* Ambient floating blobs, on-brand and soft */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="animate-float-delayed absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-secondary/15 blur-3xl" />
        <div className="animate-float-slow absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-accent/30 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-2xl shadow-primary/5 px-8 py-10 flex flex-col items-center text-center gap-6">
        <img src={logo} alt="logo" className="h-8 w-auto" />

        {isPending || (!showError && !isSuccess) ? (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
              <Loader2 className="h-9 w-9 text-primary animate-spin" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-xl font-semibold text-neutral-800">
                Verifying your email
              </h1>
              <p className="text-sm text-neutral-500">
                Hang tight, this only takes a moment.
              </p>
            </div>
          </>
        ) : null}

        {isSuccess ? (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
              <ShieldCheck className="h-9 w-9 text-primary" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-xl font-semibold text-neutral-800">
                You're verified
              </h1>
              <p className="text-sm text-neutral-500">
                Your email is confirmed and your account is secure.
                Redirecting to login in {secondsLeft}s&hellip;
              </p>
            </div>

            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <Button
              onClick={() => navigate(REDIRECT_PATH)}
              className="w-full h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Continue to login
            </Button>
          </>
        ) : null}

        {showError ? (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 ring-8 ring-destructive/5">
              <ShieldAlert className="h-9 w-9 text-destructive" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-xl font-semibold text-neutral-800">
                Verification failed
              </h1>
              <p className="text-sm text-neutral-500">
                {missingToken
                  ? "This verification link is missing its token."
                  : (error?.response?.data as any).message ?? "This link is invalid or has expired."}
              </p>
            </div>
            <Button
              onClick={() => navigate("/signup")}
              className="w-full h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Back to sign up
            </Button>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default VerifyMail