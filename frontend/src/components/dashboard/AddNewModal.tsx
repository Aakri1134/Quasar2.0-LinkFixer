"use client"

import { useState } from "react"
import { Controller, useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown, Plus, X, Cookie, KeyRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldSet,
  FieldLegend,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  addWebsiteSchema,
  sitemapUrlFieldSchema,
  type AddWebsiteFormValues,
} from "@/utils/schemas/website"
import type { addWebsitePayload } from "@/services/api/website/websiteService.types"
import useAddWebsite from "@/hooks/mutations/website/useAddWebsite"
import { isDuplicateUrl } from "@/utils/urlCompare"
const EMPTY_TOKEN = { key: "", value: "" }

const AddNewModal = () => {
  const [advancedExpanded, setAdvancedExpanded] = useState(false)
  const [sitemapInput, setSitemapInput] = useState("")
  const [tokenDraft, setTokenDraft] = useState(EMPTY_TOKEN)

  const { mutate, isPending } = useAddWebsite()

  const form = useForm<AddWebsiteFormValues>({
    resolver: zodResolver(addWebsiteSchema),
    defaultValues: {
      baseURL: "",
      sitemapURLs: [],
      enableAuthentication: false,
      authentication_mode: undefined,
      auth_session_tokens: [],
      mail_subscription: false,
      agreeToTerms: false,
    },
  })

  const { fields: tokenFields, append: appendToken, remove: removeToken } =
    useFieldArray({
      control: form.control,
      name: "auth_session_tokens",
    })

  const addSitemapUrl = (
    field: { value: string[]; onChange: (v: string[]) => void }
  ) => {
    const parsed = sitemapUrlFieldSchema.safeParse(sitemapInput.trim())
    if (!parsed.success) {
      form.setError("sitemapURLs", { message: "Enter a valid sitemap URL before adding it" })
      return
    }
    if (isDuplicateUrl(parsed.data, field.value)) {
      form.setError("sitemapURLs", { message: "This sitemap URL has already been added" })
      return
    }
    form.clearErrors("sitemapURLs")
    field.onChange([...field.value, parsed.data])
    setSitemapInput("")
  }

  const addToken = () => {
    if (!tokenDraft.key.trim() || !tokenDraft.value.trim()) return
    appendToken(tokenDraft)
    setTokenDraft(EMPTY_TOKEN)
  }

  const onSubmit = (values: AddWebsiteFormValues) => {
    const { enableAuthentication, agreeToTerms, ...rest } = values
    const payload: addWebsitePayload = {
      ...rest,
      authentication_mode: enableAuthentication ? rest.authentication_mode : undefined,
      auth_session_tokens: enableAuthentication ? rest.auth_session_tokens : undefined,
    }
    mutate(payload)
  }

  const authMode = form.watch("authentication_mode")
  const enableAuth = form.watch("enableAuthentication")

  return (
    <div className="w-full h-fit p-5 bg-white rounded-xl flex flex-col gap-1">
      {/* Header */}
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

          {/* Advanced */}
          <Collapsible open={advancedExpanded} onOpenChange={setAdvancedExpanded}>
            <FieldSet className="border border-gray-100 rounded-lg px-3 py-2">
              <div className="w-full flex justify-between items-center">
                <FieldLegend
                  className="text-sm font-semibold text-gray-700 m-0 cursor-pointer select-none"
                  onClick={() => setAdvancedExpanded((x) => !x)}
                >
                  Advanced Features
                </FieldLegend>
                <CollapsibleTrigger className="cursor-pointer w-6 flex justify-center text-gray-400">
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${advancedExpanded ? "rotate-180" : ""}`}
                  />
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                <FieldGroup className="pt-3 gap-4">
                  {/* Sitemap URLs */}
                  <Controller
                    name="sitemapURLs"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="sitemap-input" className="text-sm font-semibold text-gray-700">
                          Sitemap URLs
                        </FieldLabel>
                        <div className="flex gap-2">
                          <Input
                            id="sitemap-input"
                            placeholder="https://example.com/sitemap.xml"
                            value={sitemapInput}
                            onChange={(e) => setSitemapInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                addSitemapUrl(field)
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="shrink-0 cursor-pointer"
                            onClick={() => addSitemapUrl(field)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        {field.value.length > 0 && (
                          <ul className="flex flex-col gap-1 mt-1">
                            {field.value.map((url, index) => (
                              <li
                                key={`${url}-${index}`}
                                className="flex items-center justify-between text-sm bg-gray-50 border border-gray-100 rounded-md px-2.5 py-1.5"
                              >
                                <span className="truncate text-gray-600">{url}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    field.onChange(field.value.filter((_, i) => i !== index))
                                  }
                                  className="cursor-pointer text-gray-400 hover:text-gray-600 ml-2 shrink-0"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  {/* Auth toggle */}
                  <Controller
                    name="enableAuthentication"
                    control={form.control}
                    render={({ field }) => (
                      <Field orientation="horizontal">
                        <Checkbox
                          id={field.name}
                          className="cursor-pointer"
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            if (!checked) {
                              form.setValue("authentication_mode", undefined)
                              form.setValue("auth_session_tokens", [])
                              form.clearErrors(["authentication_mode", "auth_session_tokens"])
                            }
                          }}
                        />
                        <FieldLabel htmlFor={field.name} className="font-normal text-sm cursor-pointer">
                          Enable authentication
                        </FieldLabel>
                      </Field>
                    )}
                  />

                  {/* Auth config */}
                  {enableAuth && (
                    <div className="rounded-lg border border-gray-100 overflow-hidden">
                      <Controller
                        name="authentication_mode"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Tabs
                            value={field.value ?? ""}
                            onValueChange={(v) => {
                              field.onChange(v)
                              form.setValue("auth_session_tokens", [])
                              setTokenDraft(EMPTY_TOKEN)
                            }}
                          >
                            <TabsList className="w-full rounded-none border-b border-gray-100 bg-gray-50 h-9">
                              <TabsTrigger
                                value="cookie"
                                className="flex-1 gap-1.5 text-xs font-medium cursor-pointer"
                              >
                                <Cookie className="w-3.5 h-3.5" />
                                Cookie
                              </TabsTrigger>
                              <TabsTrigger
                                value="jwt"
                                className="flex-1 gap-1.5 text-xs font-medium cursor-pointer"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                JWT
                              </TabsTrigger>
                            </TabsList>

                            {fieldState.invalid && (
                              <div className="px-3 pt-2">
                                <FieldError errors={[fieldState.error]} />
                              </div>
                            )}

                            {(["cookie", "jwt"] as const).map((mode) => (
                              <TabsContent key={mode} value={mode} className="p-3 m-0">
                                <div className="flex flex-col gap-3">
                                  {/* Existing tokens */}
                                  {tokenFields.length > 0 && (
                                    <ul className="flex flex-col gap-1">
                                      {tokenFields.map((f, index) => (
                                        <li
                                          key={f.id}
                                          className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-100 rounded-md px-2.5 py-1.5"
                                        >
                                          <span className="font-mono font-semibold text-gray-500 shrink-0">
                                            {form.getValues(`auth_session_tokens.${index}.key`)}
                                          </span>
                                          <span className="text-gray-300">·</span>
                                          <span className="truncate text-gray-400 font-mono">
                                            {"•".repeat(8)}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => removeToken(index)}
                                            className="ml-auto cursor-pointer text-gray-300 hover:text-gray-500 shrink-0"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  )}

                                  {/* Add new token row */}
                                  <div className="flex flex-col gap-2">
                                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                                      <Input
                                        placeholder={mode === "jwt" ? "Header name" : "Cookie name"}
                                        value={tokenDraft.key}
                                        onChange={(e) =>
                                          setTokenDraft((d) => ({ ...d, key: e.target.value }))
                                        }
                                        className="text-sm h-8"
                                      />
                                      <Input
                                        placeholder={mode === "jwt" ? "eyJhbGciOi..." : "value..."}
                                        type="password"
                                        value={tokenDraft.value}
                                        onChange={(e) =>
                                          setTokenDraft((d) => ({ ...d, value: e.target.value }))
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault()
                                            addToken()
                                          }
                                        }}
                                        className="text-sm h-8"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 cursor-pointer"
                                        onClick={addToken}
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                      {mode === "jwt"
                                        ? "Add one entry per JWT header (e.g. Authorization)"
                                        : "Add one entry per cookie key-value pair"}
                                    </p>
                                  </div>
                                </div>
                              </TabsContent>
                            ))}
                          </Tabs>
                        )}
                      />
                    </div>
                  )}

                  <p className="text-xs text-gray-400">More options coming soon</p>
                </FieldGroup>
              </CollapsibleContent>
            </FieldSet>
          </Collapsible>

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

export default AddNewModal