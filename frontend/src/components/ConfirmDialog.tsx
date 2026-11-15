import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'

/** Themed replacement for window.confirm. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Delete', onConfirm }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description} className="max-w-md">
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Keep it</Button>
          <Button variant="destructive" onClick={() => { onConfirm(); onOpenChange(false) }}>{confirmLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
