import { useEffect, useMemo, useState } from "react"

/**
 * LoadingScreen
 * A different asymmetric web every time it mounts: the hub, the anchor
 * points, and the spiral threads are generated on the fly, and the spider
 * patrols a random sequence of three anchors. Everything else (sway, glint,
 * cycling caption) stays the same.
 */

type Point = { x: number; y: number }

type LeafConfig = Point & {
  rot: number
  scale: number
}

type WebConfig = {
  hub: Point
  anchors: Point[]
  ring1: string
  ring2: string
  ring3: string
  glintPath: string
  patrolPath: string
  leavesA: LeafConfig[]
  leavesB: LeafConfig[]
}

type LoadingScreenProps = {
  fullScreen?: boolean
  messages?: string[]
  message?: string
  className?: string
}

const LEAF = "M0,0 Q9,-13 22,0 Q9,9 0,0 Z"

const DEFAULT_MESSAGES = [
  "mapping the far corners of your site…",
  "following every thread…",
  "checking what's still standing…",
  "weaving the report…",
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function ringPointsArray(hub: Point, anchors: Point[], t: number): Point[] {
  return anchors.map((a) => ({
    x: hub.x + t * (a.x - hub.x),
    y: hub.y + t * (a.y - hub.y),
  }))
}

function toPolygonPoints(points: Point[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
}

function toClosedPath(points: Point[]): string {
  return `M ${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")} Z`
}

function leafCluster(anchor: Point, hub: Point, count: number): LeafConfig[] {
  const angle = (Math.atan2(anchor.y - hub.y, anchor.x - hub.x) * 180) / Math.PI
  const out: LeafConfig[] = []
  for (let i = 0; i < count; i++) {
    const jitter = Math.random() * 44 - 22
    const dist = 6 + Math.random() * 10
    const rad = ((angle + jitter) * Math.PI) / 180
    out.push({
      x: anchor.x + Math.cos(rad) * dist,
      y: anchor.y + Math.sin(rad) * dist,
      rot: angle + jitter,
      scale: 0.55 + Math.random() * 0.35,
    })
  }
  return out
}

function generateWeb(): WebConfig {
  const hub: Point = { x: 150 + Math.random() * 70, y: 110 + Math.random() * 60 }
  const n = 7 + Math.floor(Math.random() * 2)
  const baseAngle = Math.random() * 360
  const anchors: Point[] = []
  for (let i = 0; i < n; i++) {
    const angle = baseAngle + (360 / n) * i + (Math.random() * 30 - 15)
    const radius = 80 + Math.random() * 70
    const rad = (angle * Math.PI) / 180
    anchors.push({
      x: Math.max(30, Math.min(370, hub.x + radius * Math.cos(rad))),
      y: Math.max(25, Math.min(275, hub.y + radius * Math.sin(rad))),
    })
  }

  const ring1 = toPolygonPoints(ringPointsArray(hub, anchors, 0.35))
  const ring2 = toPolygonPoints(ringPointsArray(hub, anchors, 0.6))
  const outerRing = ringPointsArray(hub, anchors, 0.85)
  const ring3 = toPolygonPoints(outerRing)
  const glintPath = toClosedPath(outerRing)

  const patrolTargets = shuffle(anchors).slice(0, 3)
  const patrolPath =
    `M ${hub.x.toFixed(1)},${hub.y.toFixed(1)} ` +
    patrolTargets
      .map((a) => `L ${a.x.toFixed(1)},${a.y.toFixed(1)} L ${hub.x.toFixed(1)},${hub.y.toFixed(1)}`)
      .join(" ")

  const topLeft = anchors.reduce((best, a) => (a.x + a.y < best.x + best.y ? a : best), anchors[0])
  const bottomRight = anchors.reduce((best, a) => (a.x + a.y > best.x + best.y ? a : best), anchors[0])
  const leavesA = leafCluster(topLeft, hub, 3)
  const leavesB = leafCluster(bottomRight, hub, 2)

  return { hub, anchors, ring1, ring2, ring3, glintPath, patrolPath, leavesA, leavesB }
}

export default function LoadingScreen({
  fullScreen = true,
  messages = DEFAULT_MESSAGES,
  message,
  className = "",
}: LoadingScreenProps) {
  const web = useMemo<WebConfig>(generateWeb, [])
  const [idx, setIdx] = useState(0)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    if (mq.addEventListener) {
      mq.addEventListener("change", handler)
    } else {
      mq.addListener(handler)
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener("change", handler)
      } else {
        mq.removeListener(handler)
      }
    }
  }, [])

  useEffect(() => {
    if (message || reduced) return
    const id = setInterval(() => setIdx((i) => (i + 1) % messages.length), 3000)
    return () => clearInterval(id)
  }, [message, messages, reduced])

  const activeMessage = message ?? messages[idx]

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${fullScreen ? "fixed inset-0 z-50" : "relative w-full py-20"} flex flex-col items-center justify-center bg-[#fff] ${className}`}
    >
      <style>{`
        @keyframes lf-sway { 0%,100%{ transform: rotate(-1.4deg);} 50%{ transform: rotate(1.4deg);} }
        @keyframes lf-fade { from{ opacity:0;} to{ opacity:1;} }
        .lf-sway { animation: lf-sway 7s ease-in-out infinite; }
        .lf-fade { animation: lf-fade .6s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .lf-sway, .lf-fade { animation: none !important; }
        }
      `}</style>

      <svg viewBox="0 0 400 300" className="h-auto w-64 sm:w-80" aria-hidden="true">
        <g fill="#5B6B4F" opacity="0.85">
          {web.leavesA.map((l, i) => (
            <g
              key={`la-${i}`}
              transform={`translate(${l.x.toFixed(1)},${l.y.toFixed(1)}) rotate(${l.rot.toFixed(1)}) scale(${l.scale.toFixed(2)})`}
            >
              <path d={LEAF} />
            </g>
          ))}
          {web.leavesB.map((l, i) => (
            <g
              key={`lb-${i}`}
              transform={`translate(${l.x.toFixed(1)},${l.y.toFixed(1)}) rotate(${l.rot.toFixed(1)}) scale(${l.scale.toFixed(2)})`}
            >
              <path d={LEAF} />
            </g>
          ))}
        </g>

        <g
          className={reduced ? "" : "lf-sway"}
          style={{ transformOrigin: `${web.hub.x.toFixed(1)}px ${web.hub.y.toFixed(1)}px` }}
          stroke="#33443A"
          strokeWidth="1"
          fill="none"
          opacity="0.55"
        >
          {web.anchors.map((a, i) => (
            <line key={`spoke-${i}`} x1={web.hub.x} y1={web.hub.y} x2={a.x} y2={a.y} />
          ))}
          <polygon points={web.ring1} />
          <polygon points={web.ring2} />
          <polygon points={web.ring3} />
          <circle cx={web.hub.x} cy={web.hub.y} r="2.5" fill="#33443A" stroke="none" />
        </g>

        {!reduced && (
          <circle r="2.5" fill="#C9A227">
            <animateMotion dur="6s" repeatCount="indefinite" path={web.glintPath} />
            <animate attributeName="opacity" values="0.15;0.9;0.15" dur="1.1s" repeatCount="indefinite" />
          </circle>
        )}

        {!reduced && (
          <g fill="#221A14">
            <animateMotion dur="13s" repeatCount="indefinite" rotate="auto" path={web.patrolPath} />
            <ellipse cx="0" cy="0" rx="5.5" ry="3.5" />
            <ellipse cx="-5" cy="0" rx="2.6" ry="2" />
            <g stroke="#221A14" strokeWidth="0.9" strokeLinecap="round">
              <line x1="-1.5" y1="-2" x2="-6" y2="-6" />
              <line x1="0.5" y1="-2.6" x2="-1.5" y2="-8" />
              <line x1="3" y1="-2.6" x2="4" y2="-8" />
              <line x1="4.5" y1="-1.8" x2="9" y2="-5" />
              <line x1="-1.5" y1="2" x2="-6" y2="6" />
              <line x1="0.5" y1="2.6" x2="-1.5" y2="8" />
              <line x1="3" y1="2.6" x2="4" y2="8" />
              <line x1="4.5" y1="1.8" x2="9" y2="5" />
            </g>
          </g>
        )}
      </svg>

      <p key={idx} className={`mt-6 text-sm text-[#4B5A4E] sm:text-base ${reduced ? "" : "lf-fade"}`}>
        {activeMessage}
      </p>
    </div>
  )
}