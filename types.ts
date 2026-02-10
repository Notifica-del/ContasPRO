
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum BillStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE'
}

export enum BillType {
  SINGLE = 'SINGLE',
  PARCEL = 'PARCEL',
  RECURRING = 'RECURRING'
}

export interface Company {
  id: string;
  name: string;
  color: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar: string;
  accessibleUnits: string[]; // IDs of Companies
}

export interface Bill {
  id: string;
  beneficiary: string;
  amount: number;
  dueDate: string;
  category: string;
  status: BillStatus;
  companyId: string;
  type: BillType;
  createdAt: string;
  installmentsCount?: number;
  currentInstallment?: number;
}

export interface OCRResult {
  beneficiary: string;
  amount: number;
  dueDate: string;
  category: string;
}
