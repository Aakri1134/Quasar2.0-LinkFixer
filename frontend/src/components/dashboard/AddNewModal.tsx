import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { addWebsiteSchema, type AddWebsiteFormValues } from "@/utils/schemas/website"
import useAddWebsite from "@/hooks/mutations/website/useAddWebsite"

export default function AddNewModal() {
  const { mutate, isPending } = useAddWebsite()
  const form = useForm<AddWebsiteFormValues>({
    resolver: zodResolver(addWebsiteSchema),
    defaultValues: {
      baseURL: "",
      mail_subscription: false,
      agreeToTerms: false,
    },
  })

  const onSubmit = (payload: AddWebsiteFormValues) => {
    mutate(payload)
  }

  return (
    <div className="w-full h-fit p-5 bg-white rounded-xl flex flex-col gap-1">
      <div className="flex flex-col w-full mb-1">
        <h2 className="font-bold text-2xl font-mono ml-1">Add New Website</h2>
        <div className="h-0.5 bg-red-500 rounded-full" />
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="pt-2">
        <FieldGroup>
          {/* Base URL */}
          <Controller
            name="baseURL"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name} className="text-sm font-semibold text-gray-700">
                  Website URL
                </FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="https://example.com"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

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
                <FieldLabel htmlFor={field.name} className="font-normal text-sm cursor-pointer">
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
                  <FieldLabel htmlFor={field.name} className="font-normal text-sm cursor-pointer">
                    Accept Terms and Conditions
                  </FieldLabel>
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button
            type="submit"
            disabled={isPending}
            className="mt-1 w-full cursor-pointer disabled:cursor-not-allowed"
          >
            {isPending ? "Adding..." : "Add Website"}
          </Button>
        </FieldGroup>
      </form>
    </div>
  )
}