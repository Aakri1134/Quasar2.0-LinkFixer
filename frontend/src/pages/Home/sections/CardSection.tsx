import { useEffect, useRef } from "react"
import type { FeaturesSectionProps } from "../Home.types"

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({
  heading = "Everything you need",
  subheading = "A complete toolkit for keeping your website healthy and your users happy.",
  items,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("feature-card--visible")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )

    cardRefs.current.forEach((card) => {
      if (card) observer.observe(card)
    })

    return () => observer.disconnect()
  }, [items])

  // Accent colors cycling through the green/yellow brand palette
  const accents = [
    { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-400" },
    { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-400" },
    { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-400" },
    { bg: "bg-lime-100", text: "text-lime-700", dot: "bg-lime-500" },
  ]

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-white"
    >
      {/* Subtle top divider wave */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none">
        <svg
          viewBox="0 0 1440 56"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-14"
          preserveAspectRatio="none"
        >
          <path
            d="M0,28 C360,56 1080,0 1440,28 L1440,0 L0,0 Z"
            fill="#f0fdf4"
          />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-24">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {heading}
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            {subheading}
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => {
            const accent = accents[i % accents.length]
            return (
              <div
                key={i}
                ref={(el) => { cardRefs.current[i] = el }}
                className="feature-card group relative bg-white rounded-2xl border border-gray-100 p-7 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
                style={{
                  // Initial state for scroll animation
                  opacity: 0,
                  transform: "translateY(28px)",
                  transitionDelay: `${(i % 3) * 80}ms`,
                }}
              >
                {/* Accent dot */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-9 h-9 rounded-xl ${accent.bg} flex items-center justify-center flex-shrink-0`}>
                    {item.icon ? (
                      <span className={`${accent.text}`}>{item.icon}</span>
                    ) : (
                      <div className={`w-3 h-3 rounded-full ${accent.dot}`} />
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 leading-snug">
                    {item.title}
                  </h3>
                </div>

                <p className="text-gray-500 text-sm leading-relaxed">
                  {item.description}
                </p>

                {/* Hover accent line */}
                <div className={`absolute bottom-0 left-6 right-6 h-0.5 rounded-full ${accent.dot} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Scroll-animation styles injected once */}
      <style>{`
        .feature-card--visible {
          opacity: 1 !important;
          transform: translateY(0) !important;
          transition: opacity 0.55s ease, transform 0.55s ease, box-shadow 0.3s ease, translate 0.3s ease;
        }
      `}</style>
    </section>
  )
}
