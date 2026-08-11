import type { AddWebsiteFormValues, addWebsiteSchema } from "@/utils/schemas/website";
import type z from "zod";

export type getWebsiteForUserOutput =  {
    website: {
        domain: string;
        updatedAt: Date;
        id: string;
    }[];
    user: string;
    success: boolean;
}

export type addWebsitePayload = Omit<
  AddWebsiteFormValues,
  "enableAuthentication" | "agreeToTerms"
>