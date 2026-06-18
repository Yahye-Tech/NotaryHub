export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'trial';
  createdAt: string;
  plan: 'Basic' | 'Professional' | 'Enterprise';
  dbSize: string;
  cpuUsage: number;
  email?: string;
  license_number?: string;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  phone: string;
  countersCount: number;
  activeEmployees: number;
  currentQueueLength: number;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface Employee {
  id: string;
  branchId: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'NOTARY_OFFICER' | 'RECEPTIONIST';
  status: 'available' | 'busy' | 'offline' | 'suspended';
  assignedCounter?: number;
  archived?: boolean;
  passwordHash?: string;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface Appointment {
  id: string;
  branchId: string;
  tenantId?: string;
  customerName: string;
  customerEmail: string;
  serviceType: string;
  appointmentTime: string;
  status: 'scheduled' | 'completed' | 'canceled' | 'no-show';
  created_at?: string;
  updated_at?: string;
}

export interface QueueTicket {
  id: string;
  ticketNumber: string; // e.g. "NOT-104"
  customerName: string;
  serviceType: string;
  checkInTime: string;
  status: 'waiting' | 'calling' | 'serving' | 'completed' | 'passed';
  calledCounter?: number;
  servedBy?: string;
  tenantId?: string;
  branchId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentVersion {
  version_number: number;
  created_by: string;
  created_at: string;
  title: string;
  content: string;
  old_pdf?: string;
  new_pdf?: string;
}

export interface NotaryDocument {
  id: string;
  title: string;
  status: 'draft' | 'pending-signature' | 'completed' | 'archived';
  parties: string[];
  content: string;
  createdAt: string;
  watermarkCode?: string;
  qrVerifyUrl?: string;
  fingerprintHash?: string;
  signatureImage?: string;
  hash?: string;
  tenantId?: string;
  branchId?: string;
  document_number?: string;
  version_number?: number;
  versions?: DocumentVersion[];
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  timestamp: string;
  username: string;
  ipAddress: string;
  action: string;
  module: string;
  details: string;
  device?: string;
  before_value?: string;
  after_value?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'unpaid' | 'overdue';
  items: { description: string; price: number }[];
  tenantId?: string;
  branchId?: string;
  created_by?: string;
  fee?: number;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface MetricPoint {
  time: string;
  requests: number;
  cpu: number;
  queueTime: number;
  activeUsers: number;
}

