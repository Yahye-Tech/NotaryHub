import React, { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  TrendingUp, Building2, FileText, CreditCard,
  GitBranch, RefreshCw, AlertCircle, Loader2,
  DollarSign, Users, BarChart3, CheckCircle2,
} from "lucide-react";
import { analyticsApi } from "../api/analytics.api";
import type {
  OverviewData, RevenueData, CompanyGrowthData,
  DocumentStatsData, SubscriptionData, BranchPerformanceData,
} from "../api/analytics.api";
import { ApiException } from "../api/client";

// ─── Colour palette ───────────────────────────────────────────────────────────
const COLORS = {
  blue:    "#2563eb",
  indigo:  "#6366f1",
  emerald: "#10b981",
  amber:   "#f59e0b",
  rose:    "#f43f5e",
  slate:   "#64748b",
  teal:    "#0d9488",
  violet:  "#7c3aed",
};

const PIE_COLORS = [COLORS.blue, COLORS.emerald, COLORS.amber, COLORS.rose, COLORS.violet, COLORS.teal];

// ─── Shared card wrapper ──────────────────────────────────────────────────────
function ChartCard({
  title,
  subtitle,
  badge,
  children,
  loading,
  error,
  onRetry,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-[10px] bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-600 font-mono font-bold">
              {badge}
            </span>
          )}
          {onRetry && (
            <button onClick={onRetry} className="p-1.5 hover:bg-slate-100 rounded-lg transition" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs">Loading from database…</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Failed to load chart data</p>
              <p className="text-[11px] text-rose-500 mt-0.5">{error}</p>
              {onRetry && (
                <button onClick={onRetry} className="mt-2 text-rose-600 font-semibold hover:underline text-[11px]">
                  Try again
                </button>
              )}
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, color = "blue",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: keyof typeof COLORS;
}) {
  const bg: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    indigo: "bg-indigo-50 text-indigo-600",
    rose: "bg-rose-50 text-rose-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-lg ${bg[color] ?? bg.blue}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide block">{label}</span>
        <span className="text-2xl font-bold text-slate-900 mt-0.5 block tracking-tight">{value}</span>
        {sub && <span className="text-[11px] text-slate-400 block mt-0.5">{sub}</span>}
      </div>
    </div>
  );
}

// ─── Tooltip styles ────────────────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: {
    fontSize: "11px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// CHART 1: REVENUE CHART
// ═════════════════════════════════════════════════════════════════════════════
function RevenueChart({ userRole }: { userRole: string }) {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await analyticsApi.revenue());
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isEmpty = !data || data.monthly.length === 0;

  return (
    <ChartCard
      title="Revenue Chart"
      subtitle="Monthly payment volume — directly from payments table"
      badge="Live SQL"
      loading={loading}
      error={error}
      onRetry={load}
    >
      {/* KPI row */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">MRR</span>
            <span className="text-lg font-bold text-blue-600">${data.totals.mrrDollars.toLocaleString()}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">Total Received</span>
            <span className="text-lg font-bold text-emerald-600">${data.totals.succeededDollars.toLocaleString()}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">Pending</span>
            <span className="text-lg font-bold text-amber-600">${data.totals.pendingDollars.toLocaleString()}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">Total Volume</span>
            <span className="text-lg font-bold text-slate-900">${data.totals.totalDollars.toLocaleString()}</span>
          </div>
        </div>
      )}

      {isEmpty ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-xs italic">
          No payment data yet — revenue will appear here once payments are recorded.
        </div>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data!.monthly} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS.blue} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" fontSize={10} stroke="#94a3b8" tickLine={false} />
              <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
              <Area type="monotone" dataKey="revenueDollars" name="Revenue (USD)" stroke={COLORS.blue}
                strokeWidth={2} fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CHART 2: COMPANY GROWTH (SUPER_ADMIN only)
// ═════════════════════════════════════════════════════════════════════════════
function CompanyGrowthChart() {
  const [data, setData] = useState<CompanyGrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await analyticsApi.companyGrowth());
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Failed to load company growth");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isEmpty = !data || data.monthly.length === 0;

  return (
    <ChartCard
      title="Company Growth"
      subtitle="Tenant registrations over time — COUNT(*) FROM tenants GROUP BY month"
      badge="Live SQL"
      loading={loading}
      error={error}
      onRetry={load}
    >
      {data && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total", value: data.totals.total, color: "text-slate-900" },
            { label: "Active", value: data.totals.active, color: "text-emerald-600" },
            { label: "Suspended", value: data.totals.suspended, color: "text-rose-600" },
            { label: "Trial", value: data.totals.trial, color: "text-amber-600" },
          ].map(k => (
            <div key={k.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <span className="text-[9px] font-mono text-slate-400 uppercase block">{k.label}</span>
              <span className={`text-lg font-bold ${k.color}`}>{k.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Line chart: cumulative tenants */}
        <div className="h-44">
          {isEmpty ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
              No tenant registration history yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data!.monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" fontSize={10} stroke="#94a3b8" tickLine={false} />
                <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="cumulative" name="Total tenants" stroke={COLORS.blue} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="newTenants" name="New this month" stroke={COLORS.emerald} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie: plan breakdown */}
        <div className="h-44">
          {!data || data.planBreakdown.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
              No active subscriptions.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.planBreakdown} dataKey="count" nameKey="plan"
                  cx="50%" cy="50%" outerRadius={60} label={({ plan, count }) => `${plan} (${count})`}
                  labelLine={false} fontSize={9}>
                  {data.planBreakdown.map((_entry, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [v, name]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </ChartCard>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CHART 3: DOCUMENT STATISTICS
// ═════════════════════════════════════════════════════════════════════════════
function DocumentStatsChart() {
  const [data, setData] = useState<DocumentStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await analyticsApi.documents());
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Failed to load document statistics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <ChartCard
      title="Document Statistics"
      subtitle="Volume by type and status — COUNT(*) FROM documents GROUP BY doc_type"
      badge="Live SQL"
      loading={loading}
      error={error}
      onRetry={load}
    >
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total Docs", value: data.totals.total, color: "text-slate-900" },
            { label: "Notarised", value: data.totals.notarised, color: "text-emerald-600" },
            { label: "AI Generated", value: data.totals.aiGenerated, color: "text-indigo-600" },
            { label: "This Month", value: data.totals.thisMonth, color: "text-blue-600" },
          ].map(k => (
            <div key={k.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <span className="text-[9px] font-mono text-slate-400 uppercase block">{k.label}</span>
              <span className={`text-lg font-bold ${k.color}`}>{k.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bar: monthly trend */}
        <div className="h-44">
          {!data || data.monthly.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
              No documents recorded yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" fontSize={10} stroke="#94a3b8" tickLine={false} />
                <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="notarised" name="Notarised" fill={COLORS.emerald} radius={[3,3,0,0]} />
                <Bar dataKey="draft" name="Draft" fill={COLORS.blue} radius={[3,3,0,0]} />
                <Bar dataKey="rejected" name="Rejected" fill={COLORS.rose} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar: by document type */}
        <div className="h-44">
          {!data || data.byType.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
              No document types yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byType} layout="vertical" margin={{ top: 4, right: 4, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" fontSize={10} stroke="#94a3b8" tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="docType" fontSize={9} stroke="#94a3b8" tickLine={false} width={60} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" name="Count" fill={COLORS.blue} radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </ChartCard>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CHART 4: SUBSCRIPTIONS
// ═════════════════════════════════════════════════════════════════════════════
function SubscriptionsChart() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await analyticsApi.subscriptions());
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <ChartCard
      title="Subscriptions"
      subtitle="Plan distribution and revenue — SUM(amount_cents) FROM subscriptions GROUP BY plan"
      badge="Live SQL"
      loading={loading}
      error={error}
      onRetry={load}
    >
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: "MRR", value: `$${data.totals.mrrDollars.toLocaleString()}`, color: "text-blue-600" },
            { label: "ARR", value: `$${data.totals.arrDollars.toLocaleString()}`, color: "text-indigo-600" },
            { label: "Active Subs", value: data.totals.activeCount, color: "text-emerald-600" },
            { label: "Churned", value: data.totals.churnedCount, color: "text-rose-600" },
          ].map(k => (
            <div key={k.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <span className="text-[9px] font-mono text-slate-400 uppercase block">{k.label}</span>
              <span className={`text-lg font-bold ${k.color}`}>{k.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bar: MRR by plan */}
        <div className="h-44">
          {!data || data.byPlan.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
              No active subscriptions.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byPlan} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="plan" fontSize={10} stroke="#94a3b8" tickLine={false} />
                <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, "MRR"]} />
                <Bar dataKey="mrrDollars" name="MRR" fill={COLORS.blue} radius={[4,4,0,0]}>
                  {data.byPlan.map((_entry, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Line: monthly new vs cancelled */}
        <div className="h-44">
          {!data || data.monthly.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
              No subscription history yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" fontSize={10} stroke="#94a3b8" tickLine={false} />
                <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="newSubs" name="New" stroke={COLORS.emerald} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cancelledSubs" name="Cancelled" stroke={COLORS.rose} strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </ChartCard>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CHART 5: BRANCH PERFORMANCE
// ═════════════════════════════════════════════════════════════════════════════
function BranchPerformanceChart() {
  const [data, setData] = useState<BranchPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await analyticsApi.branches());
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Failed to load branch performance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <ChartCard
      title="Branch Performance"
      subtitle="Documents, employees and customers per branch — JOIN branches, documents, employees"
      badge="Live SQL"
      loading={loading}
      error={error}
      onRetry={load}
    >
      {!data || data.branches.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-xs italic">
          No branch data available. Branches will appear here once created.
        </div>
      ) : (
        <>
          {/* Branch comparison bar chart */}
          <div className="h-52 mb-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.branches}
                margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="branchName" fontSize={9} stroke="#94a3b8" tickLine={false}
                  tick={{ fill: "#64748b" }} />
                <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="documentCount" name="Documents" fill={COLORS.blue} radius={[3,3,0,0]} />
                <Bar dataKey="notarisedCount" name="Notarised" fill={COLORS.emerald} radius={[3,3,0,0]} />
                <Bar dataKey="activeEmployeeCount" name="Active Staff" fill={COLORS.amber} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Branch table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 text-[10px] uppercase">Branch</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-500 text-[10px] uppercase">Staff</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-500 text-[10px] uppercase">Docs</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-500 text-[10px] uppercase">Notarised</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-500 text-[10px] uppercase">Counters</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-500 text-[10px] uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.branches.map(b => (
                  <tr key={b.branchId} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-slate-900 block">{b.branchName}</span>
                      <span className="text-[10px] text-slate-400">{b.tenantName}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="font-bold text-slate-800">{b.activeEmployeeCount}</span>
                      <span className="text-slate-400">/{b.employeeCount}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-slate-800">{b.documentCount}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-emerald-600 font-bold">{b.notarisedCount}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-600">{b.countersCount}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        b.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ChartCard>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// OVERVIEW KPI PANEL
// ═════════════════════════════════════════════════════════════════════════════
function OverviewKpis({ userRole }: { userRole: string }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.overview()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse h-20" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  type KpiCardDef = { label: string; value: string | number; sub?: string; icon: React.ElementType; color?: "blue"|"indigo"|"emerald"|"amber"|"rose"|"slate"|"teal"|"violet" };
  const cards: KpiCardDef[] = [
    ...(userRole === "SUPER_ADMIN"
      ? [{ label: "Tenants", value: data.tenants.active, sub: `${data.tenants.total} total`, icon: Building2, color: "blue" as const }] as KpiCardDef[]
      : [] as KpiCardDef[]
    ),
    { label: "Branches",  value: data.branches.active,   sub: `${data.branches.total} total`,   icon: GitBranch,    color: "indigo"  as const },
    { label: "Employees", value: data.employees.active,  sub: `${data.employees.total} total`,  icon: Users,        color: "violet"  as const },
    { label: "Documents", value: data.documents.total,   sub: `${data.documents.thisMonth} this month`, icon: FileText, color: "amber" as const },
    { label: "Notarised", value: data.documents.notarised, sub: "completed",                   icon: CheckCircle2, color: "emerald" as const },
    { label: "MRR",       value: `$${data.revenue.mrrDollars.toLocaleString()}`,               icon: DollarSign,   color: "emerald" as const },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, idx) =>
        React.createElement(KpiCard, {
          key: idx,
          label: card.label,
          value: card.value,
          sub: card.sub,
          icon: card.icon,
          color: card.color,
        })
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT: DynamicCharts
// Renders all charts appropriate for the user's role
// ═════════════════════════════════════════════════════════════════════════════
interface DynamicChartsProps {
  userRole: string;
}

export default function DynamicCharts({ userRole }: DynamicChartsProps) {
  const isSuper       = userRole === "SUPER_ADMIN";
  const isCompanyPlus = ["SUPER_ADMIN", "COMPANY_ADMIN"].includes(userRole);

  return (
    <div className="space-y-6">
      {/* KPI overview row */}
      <OverviewKpis userRole={userRole} />

      {/* Revenue — visible to COMPANY_ADMIN+ */}
      {isCompanyPlus && <RevenueChart userRole={userRole} />}

      {/* Company Growth + Subscriptions — SUPER_ADMIN only */}
      {isSuper && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CompanyGrowthChart />
          <SubscriptionsChart />
        </div>
      )}

      {/* Document Statistics — COMPANY_ADMIN+ */}
      {isCompanyPlus && <DocumentStatsChart />}

      {/* Branch Performance — COMPANY_ADMIN+ */}
      {isCompanyPlus && <BranchPerformanceChart />}
    </div>
  );
}
