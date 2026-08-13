import type { AddWebsiteFormValues } from "@/utils/schemas/website";

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
  "enableAuthentication"
>

export type deleteWebsitePayload = {
    websiteID : string
}

export type generateVerificationFilePayload = {
    websiteID : string
}