import { Badge } from '@/components/ui/badge'
import { STATUS_LABELS } from '@/lib/labels'
import type { AppointmentStatus } from '@/types/clinic'

const variants: Record<AppointmentStatus, 'secondary' | 'default' | 'outline'> = {
  pending: 'secondary',
  confirmed: 'default',
  cancelled: 'outline',
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge variant={variants[status]}>{STATUS_LABELS[status]}</Badge>
}
