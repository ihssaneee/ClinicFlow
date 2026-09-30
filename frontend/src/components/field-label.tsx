import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

export function FieldLabel({
  htmlFor,
  required = false,
  children,
}: {
  htmlFor?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <Label htmlFor={htmlFor} className="gap-1">
      {children}
      {required && (
        <>
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
          <span className="sr-only">obligatoire</span>
        </>
      )}
    </Label>
  )
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null
  return <p className="text-sm text-destructive">{children}</p>
}
