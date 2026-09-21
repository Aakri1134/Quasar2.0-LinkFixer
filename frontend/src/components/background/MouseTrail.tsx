import type { CursorPosition } from "@/pages/Home/Home.types"
import { useEffect, useRef, useState, type ReactNode } from "react"

export default function TriColorMouseTrail({
  children,
}: {
  children: ReactNode
}) {
    const containerRef = useRef<HTMLDivElement>(null)
  const [cursorTrail, setCursorTrail] = useState<CursorPosition[]>([])
  const colorIndex = useRef<number>(0)
  const colors: string[] = ["#ff0000", "#00ff00", "#0000ff"]

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // SVG is position:fixed so coordinates must be viewport-relative (clientX/Y),
      // not relative to any scrolling container.
      setCursorTrail((prev) => {
        const newTrail = [
          ...prev,
          { x: e.clientX, y: e.clientY, id: Date.now() + Math.random() },
        ]
        return newTrail.slice(-10)
      })
    }

    // Listen on window so the trail works across the whole page when scrolled.
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  useEffect(() => {
    if (cursorTrail.length === 0) {
      colorIndex.current = (colorIndex.current + 1) % colors.length
      return
    }
    const timeout = setTimeout(() => {
      setCursorTrail((prev) => prev.slice(1))
    }, 50)
    return () => clearTimeout(timeout)
  }, [cursorTrail])

  return (
    <div
      ref={containerRef}
      className="min-h-screen transition-colors duration-300 relative"
    >
        <svg
        className="fixed pointer-events-none inset-0 w-full h-full"
        style={{ zIndex: 100 }}
      >
        {cursorTrail.length > 1 &&
          cursorTrail.slice(1).map((pos, index) => {
            const prevPos = cursorTrail[index]
            return (
              <line
                key={`${pos.id}-${index}`}
                x1={prevPos.x}
                y1={prevPos.y}
                x2={pos.x}
                y2={pos.y}
                stroke={colors[colorIndex.current]}
                strokeWidth={6}
                opacity={1}
                strokeLinecap="round"
              />
            )
          })}
      </svg>
      {children}
    </div>
  )
}
