
export type CursorPosition = {
  x: number
  y: number
  id?: number
}

export type HandleSubmit = {
  (e: React.FormEvent<HTMLFormElement>): void
}

export interface AnalyzePayload {
  url: string
}

export interface FeatureItem {
  title: string
  description: string
  icon?: React.ReactNode
}

export interface FeaturesSectionProps {
  heading?: string
  subheading?: string
  items: FeatureItem[]
}