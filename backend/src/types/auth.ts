export type Role = 'admin' | 'staff';

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
};

export type UserRow = {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: Role;
};
