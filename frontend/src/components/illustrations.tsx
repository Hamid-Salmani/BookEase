import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'

/*
 * Small line illustrations for empty states. They only use design tokens
 * (stroke-input, fill-card, fill-accent, stroke-primary), so they follow the theme.
 */
const base = 'stroke-input'

function Frame({ className, children, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 160 110" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn('h-28 w-40', className)} {...p}>
      {children}
    </svg>
  )
}

export const IllustrationCalendar = (p: SVGProps<SVGSVGElement>) => (
  <Frame {...p}>
    <rect x="30" y="18" width="100" height="78" rx="8" className={cn(base, 'fill-card')} />
    <path d="M30 38h100" className={base} />
    <path d="M56 12v12M104 12v12" className="stroke-foreground/60" />
    {[0, 1, 2, 3, 4].map((c) => [0, 1].map((r) => (
      <rect key={`${c}${r}`} x={42 + c * 16} y={48 + r * 18} width="10" height="10" rx="3" className={cn('fill-muted stroke-none')} />
    )))}
    <rect x="74" y="66" width="12" height="12" rx="3.5" className="fill-accent stroke-primary" strokeDasharray="3 3" />
  </Frame>
)

export const IllustrationList = (p: SVGProps<SVGSVGElement>) => (
  <Frame {...p}>
    <rect x="34" y="16" width="92" height="22" rx="6" className={cn(base, 'fill-card')} />
    <rect x="34" y="44" width="92" height="22" rx="6" className={cn(base, 'fill-card')} />
    <rect x="34" y="72" width="92" height="22" rx="6" className={cn(base, 'fill-card')} strokeDasharray="4 4" />
    <path d="M44 27h30M44 55h40" className="stroke-foreground/50" />
    <rect x="98" y="22" width="20" height="10" rx="4" className="fill-accent stroke-none" />
    <path d="M80 83h0" className="stroke-primary" />
  </Frame>
)

export const IllustrationSearch = (p: SVGProps<SVGSVGElement>) => (
  <Frame {...p}>
    <path d="M28 30h64M28 48h46M28 66h56M28 84h34" className={base} />
    <circle cx="106" cy="58" r="22" className="fill-card stroke-foreground/60" />
    <circle cx="106" cy="58" r="14" className="fill-accent stroke-none" />
    <path d="M122 74l14 14" className="stroke-primary" strokeWidth="2.5" />
  </Frame>
)

export const IllustrationPeople = (p: SVGProps<SVGSVGElement>) => (
  <Frame {...p}>
    <circle cx="64" cy="44" r="13" className={cn(base, 'fill-card')} />
    <path d="M38 92c0-14 11-24 26-24s26 10 26 24" className={cn(base, 'fill-card')} />
    <circle cx="100" cy="50" r="11" className="fill-accent stroke-primary" strokeDasharray="3 3" />
    <path d="M82 92c1-11 8-18 18-18s17 7 18 18" className="stroke-primary" strokeDasharray="3 3" />
  </Frame>
)

export const IllustrationAway = (p: SVGProps<SVGSVGElement>) => (
  <Frame {...p}>
    <rect x="30" y="22" width="100" height="70" rx="8" className={cn(base, 'fill-card')} />
    <path d="M30 40h100" className={base} />
    <rect x="46" y="50" width="68" height="30" rx="5" className="fill-muted stroke-none" />
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <path key={i} d={`M${54 + i * 8} 80l8-30`} className="stroke-input" opacity="0.7" />)}
  </Frame>
)

export const IllustrationLog = (p: SVGProps<SVGSVGElement>) => (
  <Frame {...p}>
    <path d="M50 20v72" className={base} strokeDasharray="2 5" />
    {[28, 54, 80].map((y, i) => (
      <g key={y}>
        <circle cx="50" cy={y} r="5" className={cn('fill-card', i === 0 ? 'stroke-primary' : base)} />
        <path d={`M66 ${y}h${[44, 58, 36][i]}`} className="stroke-foreground/50" />
        <path d={`M66 ${y + 9}h${[26, 30, 22][i]}`} className={base} />
      </g>
    ))}
  </Frame>
)

export const IllustrationChart = (p: SVGProps<SVGSVGElement>) => (
  <Frame {...p}>
    <path d="M30 20v70h104" className={base} />
    <path d="M30 76h104" className={base} strokeDasharray="3 5" />
    <path d="M38 80l22-8 20 4 22-18 24 10" className="stroke-primary" strokeDasharray="1 6" />
    <rect x="40" y="62" width="10" height="28" rx="3" className="fill-muted stroke-none" />
    <rect x="66" y="52" width="10" height="38" rx="3" className="fill-accent stroke-none" />
    <rect x="92" y="68" width="10" height="22" rx="3" className="fill-muted stroke-none" />
  </Frame>
)

/** Larger week-at-a-glance drawing used on the landing page. */
export function WeekStrip({ className }: { className?: string }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const booked: Record<number, number[]> = { 0: [1, 4], 1: [0, 2, 5], 2: [3], 3: [1, 2, 6], 4: [0, 4], 5: [2], 6: [] }
  const open = { day: 2, slot: 5 }
  return (
    <svg viewBox="0 0 280 200" fill="none" strokeWidth="1.5" aria-hidden className={cn('w-full', className)}>
      <rect x="1" y="1" width="278" height="198" rx="12" className="fill-card stroke-border" />
      {days.map((d, i) => (
        <g key={i}>
          <text x={28 + i * 36} y="30" textAnchor="middle" className="fill-muted-foreground font-sans text-[11px] font-medium">{d}</text>
          {Array.from({ length: 7 }).map((_, s) => {
            const isBooked = booked[i].includes(s)
            const isOpen = open.day === i && open.slot === s
            return (
              <rect
                key={s}
                x={14 + i * 36}
                y={42 + s * 21}
                width="28"
                height="16"
                rx="5"
                className={isOpen ? 'fill-primary stroke-primary' : isBooked ? 'fill-muted stroke-none' : 'fill-none stroke-border'}
                strokeDasharray={isOpen || isBooked ? undefined : '3 3'}
              />
            )
          })}
        </g>
      ))}
    </svg>
  )
}
