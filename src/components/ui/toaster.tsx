"use client"

import {
    Toast,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react"

const getToastIcon = (variant: string | null | undefined) => {
    switch (variant) {
        case "success":
            return <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
        case "destructive":
            return <XCircle className="h-5 w-5 text-red-600 shrink-0" />
        case "warning":
            return <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
        case "info":
            return <Info className="h-5 w-5 text-sky-600 shrink-0" />
        default:
            return null
    }
}

export function Toaster() {
    const { toasts } = useToast()

    return (
        <ToastProvider>
            {toasts.map(function ({ id, title, description, action, variant, ...props }) {
                const icon = getToastIcon(variant)
                return (
                    <Toast key={id} variant={variant} {...props}>
                        <div className="flex gap-3 items-start">
                            {icon}
                            <div className="grid gap-1">
                                {title && <ToastTitle>{title}</ToastTitle>}
                                {description && (
                                    <ToastDescription>{description}</ToastDescription>
                                )}
                            </div>
                        </div>
                        {action}
                        <ToastClose />
                    </Toast>
                )
            })}
            <ToastViewport />
        </ToastProvider>
    )
}
