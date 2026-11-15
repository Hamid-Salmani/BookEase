import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Card = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-card border bg-card text-card-foreground', className)} {...p} />
)
export const CardHeader = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...p} />
export const CardTitle = ({ className, ...p }: HTMLAttributes<HTMLHeadingElement>) => <h3 className={cn('text-h3', className)} {...p} />
export const CardContent = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn('p-5 pt-2', className)} {...p} />
export const Skeleton = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn('animate-pulse rounded-control bg-muted', className)} aria-hidden {...p} />
