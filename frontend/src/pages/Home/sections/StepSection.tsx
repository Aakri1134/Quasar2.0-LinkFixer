import { useEffect, useRef, useState } from "react"

export interface StepItem {
  title: string
  description: string
  icon?: React.ReactNode
}

interface StepsSectionProps {
  heading?: string
  subheading?: string
  items: StepItem[]
}

const W = 1400
const H = 500

// ─── Node generation ──────────────────────────────────────────────────────────
// Divides canvas into N columns. Each node gets:
//   x = column centre ± jitter (but stays in its column third)
//   y = alternates top/bottom band ± jitter
// Guarantees:
//   - every node is strictly right of the previous (x always increases)
//   - no two nodes share a row band (strict zigzag)
//   - safe padding so cards never clip the canvas edge
function generateNodes(n: number): [number, number][] {
  const PAD_X = 120          // left/right padding
  const PAD_Y = 80           // top/bottom padding
  const usableW = W - PAD_X * 2
  const usableH = H - PAD_Y * 2
  const colW = usableW / n   // width of each column slot

  // Seeded "random" jitter — deterministic so it never re-randomises on re-render
  const jitter = (seed: number, range: number) => {
    const x = Math.sin(seed * 9301 + 49297) * 0.5 + 0.5
    return (x - 0.5) * range
  }

  return Array.from({ length: n }, (_, i) => {
    // x: centre of column i, with small jitter (max ±25% of colW)
    const colCentre = PAD_X + colW * i + colW / 2
    const x = colCentre + jitter(i * 3 + 1, colW * 0.4)

    // y: strictly alternates top/bottom band
    const topBand    = PAD_Y + usableH * 0.15   // ~20% from top
    const bottomBand = PAD_Y + usableH * 0.70   // ~85% from top
    const base = i % 2 === 0 ? bottomBand : topBand
    const y = base + jitter(i * 3 + 2, usableH * 0.12)

    return [Math.round(x), Math.round(y)] as [number, number]
  })
}

// ─── Decorative web threads ───────────────────────────────────────────────────
// Connects non-adjacent nodes to give the web density.
// Skip-1 and skip-2 connections, capped so dense webs don't look noisy.
function generateWebThreads(n: number): [number, number][] {
  const threads: [number, number][] = []
  for (let skip = 2; skip <= Math.min(3, n - 1); skip++) {
    for (let i = 0; i + skip < n; i++) {
      threads.push([i, i + skip])
    }
  }
  return threads
}

// ─── Spider interpolation ─────────────────────────────────────────────────────
function spiderPos(
  progress: number,
  nodes: [number, number][],
  path: [number, number][]
): [number, number] {
  if (path.length === 0) return nodes[0]
  const scaled = progress * path.length
  const edgeIdx = Math.min(Math.floor(scaled), path.length - 1)
  const t = scaled - edgeIdx
  const [aIdx, bIdx] = path[edgeIdx]
  const [ax, ay] = nodes[aIdx]
  const [bx, by] = nodes[bIdx]
  return [ax + (bx - ax) * t, ay + (by - ay) * t]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StepsSection({
  heading = "How it works",
  subheading = "Our crawler walks your site like a spider walks its web.",
  items,
}: StepsSectionProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  // Memoised so positions never re-randomise on scroll re-renders
  const nodes = useRef(generateNodes(items.length)).current
  const path  = useRef(
    Array.from({ length: items.length - 1 }, (_, i) => [i, i + 1] as [number, number])
  ).current
  const decorThreads = useRef(generateWebThreads(items.length)).current

  useEffect(() => {
    const onScroll = () => {
      const el = wrapperRef.current
      if (!el) return
      const { top, height } = el.getBoundingClientRect()
      const vh = window.innerHeight
      const p = Math.min(1, Math.max(0, -top / (height - vh)))
      setProgress(p)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const [sx, sy] = spiderPos(progress, nodes, path)
  const edgesDone = progress * path.length

  // ViewBox with padding so nodes near edges don't clip
  const VB_PAD = 30
  const viewBox = `${-VB_PAD} ${-VB_PAD} ${W + VB_PAD * 2} ${H + VB_PAD * 2}`

  return (
    <div
      ref={wrapperRef}
      style={{ height: `${100 + items.length * 80}vh` }}
      className="relative"
    >
      <div
        className="sticky top-0 h-screen w-full overflow-hidden flex flex-col"
        style={{ background: "linear-gradient(160deg, #f0fdf4 0%, #f8fdf9 60%, #ecfdf5 100%)" }}
      >
        {/* ── Header ── */}
        <div className="text-center pt-10 pb-4 px-6 flex-shrink-0">
          <span className="inline-block px-4 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm font-medium mb-3 tracking-wide">
            How it works
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{heading}</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">{subheading}</p>
          {progress < 0.04 && (
            <p className="text-xs text-gray-400 mt-2 animate-bounce">↓ scroll to follow the spider</p>
          )}
        </div>

        {/* ── Web canvas ── */}
        <div className="flex-1 min-h-0 relative">
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            style={{ zIndex: 1 }}
          >
            <defs>
              <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="node-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Decorative cross-threads */}
            {decorThreads.map(([a, b], i) => {
              const [ax, ay] = nodes[a]
              const [bx, by] = nodes[b]
              return (
                <line key={`d${i}`}
                  x1={ax} y1={ay} x2={bx} y2={by}
                  stroke="#bbf7d0" strokeWidth="0.7" opacity="0.45"
                />
              )
            })}

            {/* Path edges — spider traces these */}
            {path.map(([a, b], i) => {
              const [ax, ay] = nodes[a]
              const [bx, by] = nodes[b]
              const t = Math.min(1, Math.max(0,
                edgesDone >= i + 1 ? 1 :
                edgesDone >= i     ? edgesDone - i : 0
              ))
              const ex = ax + (bx - ax) * t
              const ey = ay + (by - ay) * t
              return (
                <g key={`e${i}`}>
                  {/* Unvisited rail */}
                  <line x1={ax} y1={ay} x2={bx} y2={by}
                    stroke="#d1fae5" strokeWidth="1.5" opacity="0.7"
                  />
                  {/* Visited silk */}
                  {t > 0 && (
                    <line x1={ax} y1={ay} x2={ex} y2={ey}
                      stroke="#16a34a" strokeWidth="2"
                      filter="url(#glow)" strokeLinecap="round"
                    />
                  )}
                </g>
              )
            })}

            {/* Nodes */}
            {nodes.map(([nx, ny], i) => {
              const visited = i === 0 || edgesDone >= i
              return (
                <g key={`n${i}`}>
                  {visited && (
                    <circle cx={nx} cy={ny} r="20"
                      fill="none" stroke="#16a34a" strokeWidth="0.6" opacity="0.25"
                    />
                  )}
                  <circle cx={nx} cy={ny} r="11"
                    fill="white"
                    stroke={visited ? "#16a34a" : "#d1fae5"}
                    strokeWidth={visited ? "2" : "1"}
                    filter={visited ? "url(#node-glow)" : undefined}
                    style={{ transition: "stroke 0.3s" }}
                  />
                  <circle cx={nx} cy={ny} r="4"
                    fill={visited ? "#16a34a" : "#d1fae5"}
                    style={{ transition: "fill 0.3s" }}
                  />
                </g>
              )
            })}

            {/* Spider */}
            <g filter="url(#glow)">
              {[...Array(8)].map((_, k) => {
                const angle = (k / 8) * Math.PI * 2
                const wiggle = Math.sin(progress * 40 + k * 0.8) * 3
                const x1 = sx + 8  * Math.cos(angle)
                const y1 = sy + 8  * Math.sin(angle)
                const x2 = sx + (16 + wiggle) * Math.cos(angle + 0.3)
                const y2 = sy + (16 + wiggle) * Math.sin(angle + 0.3)
                return (
                  <line key={k} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#15803d" strokeWidth="1.5" strokeLinecap="round"
                  />
                )
              })}
              <circle cx={sx} cy={sy} r="8"  fill="white" stroke="#15803d" strokeWidth="2" />
              <circle cx={sx} cy={sy} r="3.5" fill="#15803d" />
            </g>
          </svg>

          {/* HTML cards aligned to nodes */}
          <WebCards
            nodes={nodes}
            items={items}
            edgesDone={edgesDone}
            canvasH={H}
            viewBoxPad={VB_PAD}
          />
        </div>
      </div>
    </div>
  )
}

// ─── WebCards ─────────────────────────────────────────────────────────────────

function WebCards({
  nodes,
  items,
  edgesDone,
  canvasH,
  viewBoxPad,
}: {
  nodes: [number, number][]
  items: StepItem[]
  edgesDone: number
  canvasH: number
  viewBoxPad: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setRect(containerRef.current.getBoundingClientRect())
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const VW = W + viewBoxPad * 2
  const VH = canvasH + viewBoxPad * 2

  const toScreen = (vx: number, vy: number): [number, number] => {
    if (!rect) return [0, 0]
    const scale = Math.min(rect.width / VW, rect.height / VH)
    const ox = (rect.width  - VW * scale) / 2
    const oy = (rect.height - VH * scale) / 2
    return [ox + (vx + viewBoxPad) * scale, oy + (vy + viewBoxPad) * scale]
  }

  // Dynamic card width: fewer nodes → wider cards, more nodes → narrower
  const cardW = Math.max(140, Math.min(200, Math.floor(1000 / nodes.length)))

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {nodes.map(([nx, ny], i) => {
        const visited = i === 0 || edgesDone >= i
        const [px, py] = toScreen(nx, ny)
        const isTop = ny < canvasH / 2   // card goes below if node is in top band

        return (
          <div
            key={i}
            className="absolute pointer-events-auto"
            style={{
              left: px,
              top: isTop ? py + 18 : py - 18,
              transform: isTop ? "translate(-50%, 0)" : "translate(-50%, -100%)",
              width: cardW,
              opacity: visited ? 1 : 0,
              transition: "opacity 0.45s ease",
            }}
          >
            {/* Silk connector between card edge and node */}
            <div
              className="absolute left-1/2 -translate-x-px w-px bg-green-300"
              style={{
                [isTop ? "top" : "bottom"]: 0,
                height: 18,
                transform: "translateX(-50%)",
              }}
            />

            <div
              style={{
                background: "rgba(255,255,255,0.93)",
                backdropFilter: "blur(10px)",
                border: "1px solid #dcfce7",
                boxShadow: "0 2px 16px rgba(22,163,74,0.09)",
                borderRadius: 14,
                padding: "10px 14px",
                marginTop: isTop ? 18 : 0,
                marginBottom: isTop ? 0 : 18,
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[9px] font-black text-green-500 font-mono tracking-widest">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {items[i]?.icon && (
                  <span className="text-green-600" style={{ fontSize: 11 }}>{items[i].icon}</span>
                )}
              </div>
              <h3
                className="font-semibold text-gray-900 leading-snug mb-1"
                style={{ fontSize: Math.max(10, Math.min(13, cardW / 14)) }}
              >
                {items[i]?.title}
              </h3>
              <p
                className="text-gray-500 leading-relaxed"
                style={{ fontSize: Math.max(9, Math.min(11, cardW / 17)) }}
              >
                {items[i]?.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}