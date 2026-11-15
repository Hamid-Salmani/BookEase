import { Toaster } from 'sonner'
import { useTheme } from '@/lib/theme'

export function ThemedToaster() {
  const { resolved } = useTheme()
  return (
    <Toaster
      theme={resolved}
      position="top-center"
      closeButton
      toastOptions={{
        classNames: {
          toast: '!rounded-card !border !border-border !bg-popover !text-popover-foreground !shadow-pop !font-sans',
          description: '!text-muted-foreground',
          closeButton: '!border-border !bg-popover !text-muted-foreground',
        },
      }}
    />
  )
}
