import BubbleCleaner from "@/components/background/BubbleCleaner"
import GradientButton from "@/components/button/GradientButton"
import { FileText, Shield, Sparkles, Zap } from "lucide-react"
import type { AnalyzePayload, HandleSubmit } from "../Home.types"
import { useState } from "react"

export function HomeSection() {
  const [url, setUrl] = useState("")

  const handleSubmit: HandleSubmit = (e) => {
    e.preventDefault()
    const payload: AnalyzePayload = { url }
    console.log("Analyzing URL:", payload.url)
  }

  return (
    <section
      className="bg-linear-to-br from-pink-50 via-purple-50 to-blue-50"
      style={{
        backgroundImage:
          "radial-gradient(circle, #e0e7ff 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <BubbleCleaner>
        <div className="relative flex flex-col items-center justify-center min-h-screen px-4 py-20">
          <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-green-800">
              AI-Powered Website Analysis
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-center mb-1 text-gray-900 leading-21">
            Website Health
            <br/>
          
          <span className="text-5xl md:text-7xl font-bold text-center mb-6 [text-shadow:-5px_-5px_0px_rgba(0,0,0,0.8)] hover:[text-shadow:0px_0px_0px_rgba(0,0,0,0)] bg-linear-to-r from-green-500 via-yellow-300 to-green-500 bg-clip-text text-transparent duration-100">
            Checkup
          </span>
          </h1>
          <p className="text-center text-lg md:text-xl max-w-3xl mb-12 text-gray-600">
            Instantly detect broken links and analyze page reachability. Get
            comprehensive insights into your website's sitemap structure.
          </p>

          <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-12">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter your website URL (e.g., https://example.com)"
                className="flex-1 px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-green-400 focus:outline-none bg-white/80 backdrop-blur-sm shadow-lg transition-all"
              />
              <GradientButton
                message="Get Started"
                isForm={true}
                hover={true}
                className="duration-50"
                icon={<Sparkles className="w-5 h-5" />}
              />
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-2 px-5 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-md">
              <Zap className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-700">
                Instant Results
              </span>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-md">
              <Shield className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">
                Secure Analysis
              </span>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-md">
              <FileText className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-medium text-gray-700">
                Detailed Reports
              </span>
            </div>
          </div>
        </div>
      </BubbleCleaner>
    </section>
  )
}
