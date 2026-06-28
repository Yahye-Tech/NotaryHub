import { api } from "./client.js";

// ─── Revenue ──────────────────────────────────────────────────────────────────
export interface RevenueMonth {
  month: string;
  monthKey: string;
  revenueDollars: number;
  paymentCount: number;
  succeededCount: number;
}

export interface RevenueData {
  monthly: RevenueMonth[];
  totals: {
    totalDollars: number;
    succeededDollars: number;
    pendingDollars: number;
    mrrDollars: number;
  };
}

// ─── Company Growth ───────────────────────────────────────────────────────────
export interface GrowthMonth {
  month: string;
  monthKey: string;
  newTenants: number;
  cumulative: number;
}

export interface CompanyGrowthData {
  monthly: GrowthMonth[];
  statusBreakdown: { status: string; count: number }[];
  planBreakdown: { plan: string; count: number; mrrDollars: number }[];
  totals: { total: number; active: number; suspended: number; trial: number };
}

// ─── Document Statistics ──────────────────────────────────────────────────────
export interface DocumentMonth {
  month: string;
  monthKey: string;
  total: number;
  notarised: number;
  draft: number;
  rejected: number;
}

export interface DocumentStatsData {
  monthly: DocumentMonth[];
  byType: {
    docType: string;
    rawType: string;
    count: number;
    notarisedCount: number;
    aiGenerated: number;
  }[];
  byStatus: { status: string; count: number }[];
  totals: { total: number; notarised: number; aiGenerated: number; thisMonth: number };
}

// ─── Subscriptions ────────────────────────────────────────────────────────────
export interface SubscriptionData {
  byPlan: { plan: string; count: number; mrrDollars: number; arrDollars: number }[];
  byStatus: { status: string; count: number }[];
  monthly: { month: string; monthKey: string; newSubs: number; cancelledSubs: number }[];
  totals: { mrrDollars: number; arrDollars: number; activeCount: number; churnedCount: number };
}

// ─── Branch Performance ───────────────────────────────────────────────────────
export interface BranchStat {
  branchId: string;
  branchName: string;
  tenantName: string;
  address: string;
  countersCount: number;
  status: string;
  employeeCount: number;
  activeEmployeeCount: number;
  documentCount: number;
  notarisedCount: number;
  customerCount: number;
}

export interface BranchPerformanceData {
  branches: BranchStat[];
  trend: { branchId: string; branchName: string; month: string; docCount: number }[];
}

// ─── Overview / KPI ───────────────────────────────────────────────────────────
export interface OverviewData {
  tenants:   { total: number; active: number };
  branches:  { total: number; active: number };
  employees: { total: number; active: number };
  documents: { total: number; thisMonth: number; notarised: number };
  customers: { total: number };
  revenue:   { mrrDollars: number };
}

// ─── API calls ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  overview:       () => api.get<OverviewData>("/api/analytics/overview"),
  revenue:        () => api.get<RevenueData>("/api/analytics/revenue"),
  companyGrowth:  () => api.get<CompanyGrowthData>("/api/analytics/company-growth"),
  documents:      () => api.get<DocumentStatsData>("/api/analytics/documents"),
  subscriptions:  () => api.get<SubscriptionData>("/api/analytics/subscriptions"),
  branches:       () => api.get<BranchPerformanceData>("/api/analytics/branches"),
};
