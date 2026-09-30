export type Role = 'admin' | 'staff'

export type AuthUser = {
  id: string
  fullName: string
  email: string
  role: Role
}

export type Patient = {
  id: string
  fullName: string
  cin: string
  phone: string
  birthDate: string
  address: string | null
  createdAt: string
}

export type PatientInput = {
  fullName: string
  cin: string
  phone: string
  birthDate: string
  address: string | null
}

export type PatientList = {
  patients: Patient[]
  page: number
  limit: number
  total: number
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled'

export type Appointment = {
  id: string
  patientId: string
  appointmentDate: string
  status: AppointmentStatus
  reason: string
  notes: string | null
  createdBy: string
  createdAt: string
}

export type AppointmentInput = {
  patientId: string
  appointmentDate: string
  status: AppointmentStatus
  reason: string
  notes: string | null
}

export type ApiErrorBody = {
  message?: string
  errors?: { field: string; message: string }[]
}
