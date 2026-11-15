import { useState } from 'react'
import type { Service } from '@/lib/types'
import { cn } from '@/lib/utils'

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/* Quiet pattern fallbacks, picked per service so a grid of them does not repeat in a row. */
const motifs = [
  <g key="arcs" fill="none" strokeWidth="1.5"><circle cx="96" cy="70" r="26" /><circle cx="96" cy="70" r="42" /><circle cx="96" cy="70" r="58" /></g>,
  <g key="stripes" strokeWidth="1.5">{Array.from({ length: 9 }).map((_, i) => <path key={i} d={`M${-10 + i * 20} 100L${50 + i * 20} -10`} />)}</g>,
  <g key="dots" stroke="none">{Array.from({ length: 5 }).map((_, r) => Array.from({ length: 5 }).map((__, c) => <circle key={`${r}${c}`} cx={40 + c * 17} cy={14 + r * 17} r="1.6" />))}</g>,
  <g key="blocks" stroke="none"><rect x="64" y="8" width="40" height="40" rx="8" /><rect x="76" y="52" width="40" height="30" rx="8" opacity="0.6" /><rect x="22" y="40" width="34" height="34" rx="8" opacity="0.4" /></g>,
  <g key="waves" fill="none" strokeWidth="1.5">{Array.from({ length: 6 }).map((_, i) => <path key={i} d={`M-5 ${22 + i * 14}q15 -12 30 0t30 0t30 0t30 0t30 0`} />)}</g>,
]

export function ServiceImage({ service, className }: { service: Service; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (service.imageUrl && !failed) {
    return (
      <div className={cn('aspect-[4/3] overflow-hidden bg-muted', className)}>
        <img src={service.imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      </div>
    )
  }
  const motif = motifs[hash(service.id || service.name) % motifs.length]
  return (
    <div className={cn('relative aspect-[4/3] overflow-hidden bg-accent', className)} aria-hidden>
      <svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full fill-primary/15 stroke-primary/25 [&_*]:[vector-effect:non-scaling-stroke]">{motif}</svg>
      <span className="absolute bottom-2 left-3 font-display text-5xl font-medium leading-none text-accent-foreground/30">{service.name.trim()[0]?.toUpperCase()}</span>
    </div>
  )
}
