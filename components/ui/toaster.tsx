"use client"

import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props} className="rounded-none">
          <div className="bg-[#000080] text-white p-1 w-full flex items-center justify-between rounded-none">
            <span className="text-xs font-['MS_Sans_Serif',sans-serif]">Notification</span>
            <ToastClose />
          </div>
          <div className="p-3">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
            {action}
          </div>
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}

