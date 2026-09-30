import type { AppointmentStatus, Role } from '@/types/clinic'

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  staff: 'Staff',
}
