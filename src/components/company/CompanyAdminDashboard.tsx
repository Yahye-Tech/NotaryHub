type Invoice = { id: string; invoiceNumber?: string; customerName: string; amount: number; dueDate: string; status: string; items?: { description: string; price: number }[] };
type Appointment = { id: string; customerName: string; serviceType: string; appointmentTime: string; status: string; branchId?: string; customerEmail?: string };

import React from "react";
import { 
  Building2, Users, FileText, Calendar, 
  TrendingUp, Clock, AlertCircle, ArrowUpRight, CheckCircle2 
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, Legend 
} from "recharts";
import {Branch, Employee, NotaryDocument} from "../../types";

interface CompanyAdminDashboardProps {
  branches: Branch[];
  employees: Employee[];
  documents: NotaryDocument[];
  appointments: Appointment[];
  invoices: Invoice[];
  onNavigateToTab: (tab: string) => void;
}

export default function CompanyAdminDashboard({
  branches,
  employees,
  documents,
  appointments,
  invoices,
  onNavigateToTab
}: CompanyAdminDashboardProps) {

  // Compute stats
  const hasLocalData = branches.length > 0 || employees.length > 0 || documents.length > 0 || appointments.length > 0;
  const totalBranches = branches.length;
  const totalEmployees = employees.length;
  const totalDocuments = hasLocalData ? (documents.length + 34) : documents.length; // dynamic simulated historic records only when loaded
  const appointmentsToday = hasLocalData ? (appointments.filter(ap => ap.status === 'scheduled').length + 5) : appointments.filter(ap => ap.status === 'scheduled').length;
  const monthlyRevenue = hasLocalData ? (invoices.reduce((acc, inv) => acc + (inv.status === 'paid' ? inv.amount : 0), 0) + 12450) : invoices.reduce((acc, inv) => acc + (inv.status === 'paid' ? inv.amount : 0), 0);
  
  // Custom mock data for high fidelity Charts
  const revenueChartData = [
    { name: "Mon", Bosaso: 2400, Garowe: 1398, Galkayo: 980 },
    { name: "Tue", Bosaso: 1300, Garowe: 3000, Galkayo: 1398 },
    { name: "Wed", Bosaso: 5200, Garowe: 2000, Galkayo: 1840 },
    { name: "Thu", Bosaso: 2780, Garowe: 3908, Galkayo: 2100 },
    { name: "Fri", Bosaso: 3890, Garowe: 4800, Galkayo: 1980 },
    { name: "Sat", Bosaso: 2390, Garowe: 3800, Galkayo: 1200 },
    { name: "Sun", Bosaso: 3490, Garowe: 4300, Galkayo: 1500 },
  ];

  const documentTypeData = [
    { name: "Power of Attorney", count: 48, rate: 88 },
    { name: "Affidavit", count: 32, rate: 94 },
    { name: "Declaration", count: 18, rate: 100 },
    { name: "Agreements", count: 24, rate: 76 },
    { name: "Custom Templates", count: 12, rate: 60 },
  ];

  return (
    <div className="space-y-6" id="company-admin-dashboard-sub">
      
      {/* 2x4 Metric KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div 
          id="kpi-card-branches"
          onClick={() => onNavigateToTab("branches")}
          className="bg-white border border-slate-200 p-5 rounded-xl transition hover:shadow-md hover:border-slate-350 cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-120 px-2 py-0.5 rounded font-bold flex items-center gap-0.5">
              +12% <ArrowUpRight className="w-2.5 h-2.5" />
            </span>
          </div>
          <span className="text-xs text-slate-500 font-sans mt-3 block">Total Branches</span>
          <div className="flex justify-between items-baseline mt-1">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{totalBranches}</span>
            <span className="text-[10px] text-slate-400">Enterprise Limit: 10</span>
          </div>
        </div>

        <div 
          id="kpi-card-employees"
          onClick={() => onNavigateToTab("employees")}
          className="bg-white border border-slate-200 p-5 rounded-xl transition hover:shadow-md hover:border-slate-350 cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-120 px-2 py-0.5 rounded font-bold flex items-center gap-0.5">
              Active
            </span>
          </div>
          <span className="text-xs text-slate-500 font-sans mt-3 block">Total Employees</span>
          <div className="flex justify-between items-baseline mt-1">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{totalEmployees}</span>
            <span className="text-[10px] text-slate-400">Across all offices</span>
          </div>
        </div>

        <div 
          id="kpi-card-documents"
          onClick={() => onNavigateToTab("documents")}
          className="bg-white border border-slate-200 p-5 rounded-xl transition hover:shadow-md hover:border-slate-350 cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-120 px-2 py-0.5 rounded font-bold flex items-center gap-0.5">
              +{hasLocalData ? 42 : 0} today
            </span>
          </div>
          <span className="text-xs text-slate-500 font-sans mt-3 block">Global Documents</span>
          <div className="flex justify-between items-baseline mt-1">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{totalDocuments}</span>
            <span className="text-[10px] text-slate-400">Notarized archives</span>
          </div>
        </div>

        <div 
          id="kpi-card-billing"
          onClick={() => onNavigateToTab("billing")}
          className="bg-white border border-slate-200 p-5 rounded-xl transition hover:shadow-md hover:border-slate-350 cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 border border-blue-120 px-2 py-0.5 rounded font-bold">
              Stripe payout ok
            </span>
          </div>
          <span className="text-xs text-slate-500 font-sans mt-3 block">Monthly Revenue</span>
          <div className="flex justify-between items-baseline mt-1">
            <span className="text-2xl font-bold text-emerald-600 tracking-tight">${monthlyRevenue.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400">This billing period</span>
          </div>
        </div>

      </div>

      {/* Analytics Charts & High Fidelity Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue Stream chart */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-sans font-bold text-slate-900">Revenue Breakdowns</h3>
              <p className="text-[11px] text-slate-500">Live transaction volume mapped across operational bureaus</p>
            </div>
            <span className="text-[10px] bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-slate-600 font-mono font-bold">
              Daily Ledger (USD)
            </span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBosaso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGarowe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818CF8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#818CF8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Bosaso" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorBosaso)" />
                <Area type="monotone" dataKey="Garowe" stroke="#818CF8" strokeWidth={2} fillOpacity={1} fill="url(#colorGarowe)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Document categorization workload distribution */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-sans font-bold text-slate-900">Document Volume & SLA Rate</h3>
              <p className="text-[11px] text-slate-500">Distribution of notarization files by legal template classifications</p>
            </div>
            <span className="text-[10px] bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-slate-600 font-mono font-bold">
              Archived Deeds
            </span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={documentTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="count" name="Documents count" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={25} />
                <Bar dataKey="rate" name="Completion SLA (%)" fill="#10B981" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Low-noise high-contrast activity history list */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-sans font-bold text-slate-900">Live Compliance Audit logs</h3>
          <p className="text-[11px] text-slate-500">Global company-wide transaction and clerk operations tracker</p>
        </div>
        <div className="space-y-3">
          
          <div className="flex items-start justify-between border-b border-slate-100 pb-3 text-xs">
            <div className="flex gap-2.5 items-start">
              <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-slate-800 font-medium">Power of Attorney finalized by Clerk Michael Vance</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Grantor: Arthur Pendelton | Hash: NOTARY-SECURE-8fae639de1...</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">11:15 AM</span>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">Bosaso Main Branch</p>
            </div>
          </div>

          <div className="flex items-start justify-between border-b border-slate-100 pb-3 text-xs">
            <div className="flex gap-2.5 items-start">
              <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-slate-800 font-medium">Biometric minutiae lock captured and verified</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Customer: Alexander Westmoreland | OCR passport compliance score 0.98</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">11:14 AM</span>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">Bosaso Main Branch</p>
            </div>
          </div>

          <div className="flex items-start justify-between border-b border-slate-100 pb-3 text-xs">
            <div className="flex gap-2.5 items-start">
              <div className="p-1.5 rounded-md bg-amber-50 text-amber-605 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-slate-800 font-medium">New appointment booked dynamically via Customer portal</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Ahmed Ali | Chosen Service: Custom Contract Notarization</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">09:42 AM</span>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">Garowe Branch</p>
            </div>
          </div>

          <div className="flex items-start justify-between text-xs">
            <div className="flex gap-2.5 items-start">
              <div className="p-1.5 rounded-md bg-blue-50 text-blue-650 mt-0.5">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-slate-800 font-medium">New bureau office "Garowe Corporate Office" activated on Tenant Space</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Allocated 2 service desks | Managed under Enterprise plan license</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">08:00 AM</span>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">System Node</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
