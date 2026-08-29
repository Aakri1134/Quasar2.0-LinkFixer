import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "react-router"
import { ArrowLeft, BadgeCheck, LogOut, ShieldAlert } from "lucide-react"
import DashboardHeader from "@/components/dashboard/DashboardHeader"
import useGetMe from "@/hooks/queries/user/useGetMe"
import useUpdateProfile from "@/hooks/mutations/user/useUpdateProfile"
import useChangePassword from "@/hooks/mutations/user/useChangePassword"
import { useLogoutUser } from "@/hooks/mutations/auth/useLogoutUser"
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordFormValues,
  type UpdateProfileFormValues,
} from "@/utils/schemas/user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Panel, SkeletonBar } from "@/components/dashboard/WebsiteInfo/ui"

function ProfileForm({ username }: { username: string }) {
  const { mutate: updateProfile, isPending } = useUpdateProfile()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { username },
  })

  // The form mounts before useGetMe resolves, so seed it once the real value arrives.
  useEffect(() => {
    reset({ username })
  }, [username, reset])

  return (
    <form onSubmit={handleSubmit((values) => updateProfile(values))} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input id="username" {...register("username")} aria-invalid={Boolean(errors.username)} />
        {errors.username && (
          <p className="text-xs text-red-600">{errors.username.message}</p>
        )}
      </div>
      <Button type="submit" size="sm" disabled={isPending || !isDirty}>
        {isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  )
}

function PasswordForm() {
  const { mutate: changePassword, isPending } = useChangePassword()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  return (
    <form
      onSubmit={handleSubmit(({ currentPassword, newPassword }) =>
        changePassword({ currentPassword, newPassword }),
      )}
      className="space-y-3"
    >
      <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Changing your password signs you out everywhere. You will need to log in again.</span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" type="password" {...register("currentPassword")} />
        {errors.currentPassword && (
          <p className="text-xs text-red-600">{errors.currentPassword.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" type="password" {...register("newPassword")} />
        {errors.newPassword && <p className="text-xs text-red-600">{errors.newPassword.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
        {errors.confirmPassword && (
          <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Changing..." : "Change password"}
      </Button>
    </form>
  )
}

export default function Account() {
  const { data, isLoading } = useGetMe()
  const { mutate: logout, isPending: loggingOut } = useLogoutUser()
  const user = data?.user

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-50">
      <DashboardHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Link
          to="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="space-y-5">
          <Panel title="Profile">
            {isLoading || !user ? (
              <div className="space-y-2">
                <SkeletonBar className="w-1/3" />
                <SkeletonBar className="w-1/2" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-gray-900">{user.email}</span>
                  {user.emailVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Not verified
                    </span>
                  )}
                </div>

                <ProfileForm username={user.username} />
              </div>
            )}
          </Panel>

          <Panel title="Password">
            <PasswordForm />
          </Panel>

          <Panel title="Session">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">Sign out of this device.</p>
              <Button variant="outline" disabled={loggingOut} onClick={() => logout()}>
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                {loggingOut ? "Logging out..." : "Log out"}
              </Button>
            </div>
          </Panel>
        </div>
      </main>
    </div>
  )
}
