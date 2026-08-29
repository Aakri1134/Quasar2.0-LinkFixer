import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Radar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import {
  addWebsiteSchema,
  type AddWebsiteFormValues,
} from "@/utils/schemas/website"
import useAddWebsite from "@/hooks/mutations/website/useAddWebsite"

export default function AddNewModal({
  onSuccess,
  initialURL = "",
}: {
  onSuccess?: () => void
  // Prefilled from the ?url= the landing page hero carries through signup.
  initialURL?: string
}) {
  const { mutate, isPending } = useAddWebsite()
  const form = useForm<AddWebsiteFormValues>({
    resolver: zodResolver(addWebsiteSchema),
    defaultValues: {
      baseURL: initialURL,
      mail_subscription: false,
      agreeToTerms: false,
    },
  })

  const onSubmit = (payload: AddWebsiteFormValues) => {
    mutate(payload, {
      onSuccess: () => {
        // The dialog stays open on failure so the entered URL is not lost; useAddWebsite already
        // surfaces the error toast.
        toast.success("Website added — looking for its sitemap")
        form.reset()
        onSuccess?.()
      },
    })
  }

  return (
    <div className="flex h-fit w-full flex-col gap-1 rounded-xl bg-white p-5">
      <div className="mb-1 flex w-full flex-col">
        <h2 className="ml-1 font-mono text-2xl font-bold">Add New Website</h2>
        <div className="h-0.5 rounded-full bg-red-500" />
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="pt-2">
        <FieldGroup>
          {/* Base URL */}
          <Controller
            name="baseURL"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel
                  htmlFor={field.name}
                  className="text-sm font-semibold text-gray-700"
                >
                  Website URL
                </FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="https://example.com"
                  className="font-mono"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* What happens on submit — adding a site immediately queues an eval_sitemap run. */}
          <div className="flex gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <Radar className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                What happens next
              </p>
              <p className="mt-1 text-sm text-gray-600">
                We will look for your sitemap and start a first scan
                automatically. Larger sites can take several minutes — progress
                shows up on the site page as it runs.
              </p>
            </div>
          </div>

          {/* Mail subscription */}
          <Controller
            name="mail_subscription"
            control={form.control}
            render={({ field }) => (
              <Field orientation="horizontal">
                <Checkbox
                  id={field.name}
                  className="cursor-pointer"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <FieldLabel
                  htmlFor={field.name}
                  className="cursor-pointer text-sm font-normal"
                >
                  Subscribe to mail reports
                </FieldLabel>
              </Field>
            )}
          />

          {/* Terms */}
          <Controller
            name="agreeToTerms"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={field.name}
                    className="cursor-pointer"
                    checked={field.value}
                    aria-invalid={fieldState.invalid}
                    onCheckedChange={field.onChange}
                  />
                  <FieldLabel
                    htmlFor={field.name}
                    className="cursor-pointer text-sm font-normal"
                  >
                    Accept Terms and Conditions
                  </FieldLabel>
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Button
            type="submit"
            disabled={isPending}
            className="mt-1 w-full cursor-pointer disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding and looking for a sitemap...
              </>
            ) : (
              "Add Website"
            )}
          </Button>
        </FieldGroup>
      </form>
    </div>
  )
}
