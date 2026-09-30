export type Patient = {
  id: string;
  fullName: string;
  cin: string;
  phone: string;
  birthDate: string;
  address: string | null;
  createdAt: string;
};

export type PatientInput = {
  fullName: string;
  cin: string;
  phone: string;
  birthDate: string;
  address: string | null;
};

export type PatientList = {
  patients: Patient[];
  page: number;
  limit: number;
  total: number;
};

export type PatientRow = {
  id: string;
  full_name: string;
  cin: string;
  phone: string;
  birth_date: string;
  address: string | null;
  created_at: Date;
};
