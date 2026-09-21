import { useEffect, useMemo, useRef, useState } from "react"

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

// Desktop canvas: wide, progression runs left→right (x = main axis).
// Mobile canvas: tall, progression runs top→bottom (y = main axis).
// Mobile is literally the desktop canvas transposed (W/H swapped), so the
// same generation math produces the same "feel" in the other orientation.
const DESKTOP_DIMS = { W: 1400, H: 500 }
const MOBILE_DIMS = { W: 500, H: 1400 }

const MOBILE_QUERY = "(max-width: 767px)"

// Sub-pixel rounding in getBoundingClientRect()/innerHeight (especially at
// non-100% browser zoom, e.g. 80%/90%) means `progress` can top out at
// something like 0.997 instead of a clean 1 even when fully scrolled. Since
// the last node's "visited" check needs edgesDone to reach exactly its
// index, that rounding error can permanently hide the final card. This
// tolerance absorbs it without being visible during the animation.
const VISITED_EPSILON = 0.02

// ─── Node generation ──────────────────────────────────────────────────────────
// Divides the canvas into N slots along the "main" axis (the direction of
// progression: x on desktop, y on mobile). Each node gets:
//   main  = slot centre ± jitter (but stays in its slot third)
//   cross = alternates near/far band ± jitter (the zigzag axis: y on
//           desktop, x on mobile)
// Guarantees:
//   - every node is strictly further along the main axis than the previous
//   - no two nodes share a cross band (strict zigzag)
//   - safe padding so cards never clip the canvas edge
//
// Jitter uses real Math.random(), so positions differ on every page
// load/refresh. The result is cached in the component below, so it stays
// fixed across re-renders within a single mount (scrolling, unrelated state
// updates, etc. won't reshuffle nodes mid-session) — it only re-rolls on an
// actual remount, or when switching between desktop/mobile layouts.
function generateNodes(
  n: number,
  dims: { W: number; H: number },
  vertical: boolean
): [number, number][] {
  const PAD_MAIN = vertical ? 80 : 120 // padding along the progression axis
  const PAD_CROSS = vertical ? 120 : 80 // padding along the zigzag axis
  const mainSize = vertical ? dims.H : dims.W
  const crossSize = vertical ? dims.W : dims.H
  const usableMain = mainSize - PAD_MAIN * 2
  const usableCross = crossSize - PAD_CROSS * 2
  const stepMain = usableMain / n

  const jitter = (range: number) => (Math.random() - 0.5) * range

  return Array.from({ length: n }, (_, i) => {
    // main: centre of slot i, with small random jitter (max ±20% of stepMain)
    const slotCentre = PAD_MAIN + stepMain * i + stepMain / 2
    const main = slotCentre + jitter(stepMain * 0.4)

    // cross: strictly alternates far/near band
    const farBand = PAD_CROSS + usableCross * 0.7 // ~85% along the cross axis
    const nearBand = PAD_CROSS + usableCross * 0.15 // ~20% along the cross axis
    const base = i % 2 === 0 ? farBand : nearBand
    const cross = base + jitter(usableCross * 0.12)

    const [x, y] = vertical ? [cross, main] : [main, cross]
    return [Math.round(x), Math.round(y)] as [number, number]
  })
}

// ─── Decorative web threads ───────────────────────────────────────────────────
// Connects non-adjacent nodes to give the web density.
// Skip-2 and skip-3 connections (skip-1 is already the main path), capped
// so dense webs don't look noisy. Orientation-agnostic (just indices).
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

// ─── Responsive breakpoint ────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_QUERY).matches : false
  )

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  return isMobile
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StepsSection({
  heading = "How it works",
  subheading = "Our crawler walks your site like a spider walks its web.",
  items,
}: StepsSectionProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const isMobile = useIsMobile()

  const canvasDims = isMobile ? MOBILE_DIMS : DESKTOP_DIMS

  // Memoised so positions never re-randomise on scroll re-renders (progress
  // isn't a dependency) — but they DO re-roll on remount, and re-transpose
  // whenever the layout crosses the mobile/desktop breakpoint.
  const nodes = useMemo(
    () => generateNodes(items.length, canvasDims, isMobile),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.length, isMobile]
  )
  const path = useMemo(
    () => Array.from({ length: items.length - 1 }, (_, i) => [i, i + 1] as [number, number]),
    [items.length]
  )
  const decorThreads = useMemo(() => generateWebThreads(items.length), [items.length])

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
  const VB_PAD = 0
  const viewBox = `${-VB_PAD} ${-VB_PAD} ${canvasDims.W + VB_PAD * 2} ${
    canvasDims.H + VB_PAD * 2
  }`

  return (
    <div
      ref={wrapperRef}
      style={{ height: `${100 + items.length * (isMobile ? 100 : 80)}vh` }}
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
              const t = Math.min(1, Math.max(0, edgesDone - i + VISITED_EPSILON))
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
              const visited = i === 0 || edgesDone + VISITED_EPSILON >= i
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
            canvasW={canvasDims.W}
            canvasH={canvasDims.H}
            viewBoxPad={VB_PAD}
            vertical={isMobile}
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
  canvasW,
  canvasH,
  viewBoxPad,
  vertical,
}: {
  nodes: [number, number][]
  items: StepItem[]
  edgesDone: number
  canvasW: number
  canvasH: number
  viewBoxPad: number
  vertical: boolean
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

  const VW = canvasW + viewBoxPad * 2
  const VH = canvasH + viewBoxPad * 2

  // This is the same factor the <svg> uses internally to map its viewBox
  // onto its actual rendered box (preserveAspectRatio="meet"). SVG shapes
  // (nodes, edges, spider) automatically track it because they live inside
  // the viewBox — the browser rescales them for free whenever the container
  // resizes (zoom, window resize, breakpoint change, whatever).
  //
  // The HTML card overlay doesn't get that for free: it's positioned in
  // real screen pixels. If we hand it raw "design-space" pixel values
  // (card width, font size, connector length, padding) without pushing
  // them through this same factor, the cards stay a fixed CSS-px size
  // while the web around them grows/shrinks — so at any zoom/viewport size
  // other than the one the numbers were tuned at, the cards drift out of
  // proportion with the web instead of scaling together with it.
  const scale = rect ? Math.min(rect.width / VW, rect.height / VH) : 1
  const toScreenSize = (designPx: number) => designPx * scale

  const toScreen = (vx: number, vy: number): [number, number] => {
    if (!rect) return [0, 0]
    const ox = (rect.width  - VW * scale) / 2
    const oy = (rect.height - VH * scale) / 2
    return [ox + (vx + viewBoxPad) * scale, oy + (vy + viewBoxPad) * scale]
  }

  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

  // Dynamic card width, defined in the SAME design-space units as the SVG
  // canvas (1400x500 / 500x1400): fewer nodes → wider cards, more nodes →
  // narrower. Mobile gets a tighter cap since cards sit side-by-side with a
  // narrower canvas rather than stacked in a wide one. This is the design
  // value — it gets run through toScreenSize() before it ever touches a
  // CSS property, exactly like node coordinates do via toScreen().
  const cardWDesign = vertical
    ? Math.max(120, Math.min(170, Math.floor(900 / nodes.length)))
    : Math.max(140, Math.min(200, Math.floor(1000 / nodes.length)))
  const cardW = toScreenSize(cardWDesign)

  // Design-space gap between a node and its card (was a bare "18" before),
  // scaled the same way so the silk connector and card offset shrink/grow
  // with everything else instead of staying a fixed 18 CSS px forever.
  const gap = toScreenSize(18)

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {nodes.map(([nx, ny], i) => {
        const visited = i === 0 || edgesDone + VISITED_EPSILON >= i
        const [px, py] = toScreen(nx, ny)

        // Desktop: node in the top band → card above it, bottom band → below.
        // Mobile: node in the left band → card to its left, right band → to its right.
        const before = vertical ? nx < canvasW / 2 : ny < canvasH / 2

        let left: number
        let top: number
        let transform: string

        if (vertical) {
          const rawLeft = before ? px - gap - cardW : px + gap
          left = rect ? clamp(rawLeft, 8, rect.width - cardW - 8) : rawLeft
          top = py
          transform = "translate(0, -50%)"
        } else {
          left = px
          top = before ? py - gap : py + gap
          transform = before ? "translate(-50%, -100%)" : "translate(-50%, 0)"
        }

        return (
          <div
            key={i}
            className="absolute pointer-events-auto"
            style={{
              left,
              top,
              transform,
              width: cardW,
              opacity: visited ? 1 : 0,
              transition: "opacity 0.45s ease",
            }}
          >
            {/* Silk connector between card edge and node */}
            {vertical ? (
              <div
                className="absolute top-1/2 h-px bg-green-300"
                style={{
                  [before ? "right" : "left"]: 0,
                  width: gap,
                  transform: "translateY(-50%)",
                } as React.CSSProperties}
              />
            ) : (
              <div
                className="absolute left-1/2 w-px bg-green-300"
                style={{
                  [before ? "bottom" : "top"]: 0,
                  height: gap,
                  transform: "translateX(-50%)",
                } as React.CSSProperties}
              />
            )}

            <div
              style={{
                background: "rgba(255,255,255,0.93)",
                backdropFilter: "blur(10px)",
                border: "1px solid #dcfce7",
                boxShadow: "0 2px 16px rgba(22,163,74,0.09)",
                borderRadius: toScreenSize(14),
                padding: `${toScreenSize(10)}px ${toScreenSize(14)}px`,
                marginTop: vertical ? 0 : before ? 0 : gap,
                marginBottom: vertical ? 0 : before ? gap : 0,
                marginLeft: vertical ? (before ? 0 : gap) : 0,
                marginRight: vertical ? (before ? gap : 0) : 0,
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="font-black text-green-500 font-mono tracking-widest"
                  style={{ fontSize: toScreenSize(9) }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {items[i]?.icon && (
                  <span className="text-green-600" style={{ fontSize: toScreenSize(11) }}>{items[i].icon}</span>
                )}
              </div>
              <h3
                className="font-semibold text-gray-900 leading-snug mb-1"
                style={{ fontSize: toScreenSize(clamp(cardWDesign / 14, 10, 13)) }}
              >
                {items[i]?.title}
              </h3>
              <p
                className="text-gray-500 leading-relaxed"
                style={{ fontSize: toScreenSize(clamp(cardWDesign / 17, 9, 11)) }}
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