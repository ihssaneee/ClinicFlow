export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled';

export type Appointment = {
  id: string;
  patientId: string;
  appointmentDate: string;
  status: AppointmentStatus;
  reason: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
};

export type AppointmentInput = {
  patientId: string;
  appointmentDate: string;
  status: AppointmentStatus;
  reason: string;
  notes: string | null;
};

export type AppointmentListFilters = {
  date?: string;
  status?: AppointmentStatus;
};

export type AppointmentRow = {
  id: string;
  patient_id: string;
  appointment_date: Date;
  status: AppointmentStatus;
  reason: string;
  notes: string | null;
  created_by: string;
  created_at: Date;
};
