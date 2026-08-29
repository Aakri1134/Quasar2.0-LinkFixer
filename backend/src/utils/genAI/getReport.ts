import { GoogleGenAI } from "@google/genai"
import { env } from "../../config/env.js"

const INSTRUCTIONS =
  "Please analyze the following data and assume you are a web scraper who is reporting a data on each broken link of the website. also rate results from 1 to 10. Give me only the Analysis of broken links,  Data:"

// Generates an AI report from broken-link data and returns it as plain text.
// Returns the text rather than the SDK response because the only consumer is Check.aiReport,
// which is a String. Throws on an empty completion so the reporter queue can retry the job.
export async function getReport(data: unknown): Promise<string> {
  if (!env.AI_API_KEY) {
    throw new Error("AI_API_KEY is not configured")
  }

  const ai = new GoogleGenAI({ apiKey: env.AI_API_KEY })
  const prompt = `${INSTRUCTIONS}\n${JSON.stringify(data, null, 2)}`

  const response = await ai.models.generateContent({
    model: env.AI_MODEL,
    contents: prompt,
  })

  const report = response.text?.trim()

  if (!report) {
    // No text comes back when the prompt or the completion was filtered, or the model returned
    // only non-text parts. finishReason is the one clue the SDK gives us about which it was.
    const finishReason = response.candidates?.[0]?.finishReason ?? "unknown"
    throw new Error(`${env.AI_MODEL} returned no report text (finishReason: ${finishReason})`)
  }

  return report
}
