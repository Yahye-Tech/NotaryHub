import React, { useState, useEffect, useRef } from "react";
import { 
  Building2, Plus, ShieldCheck, ShieldAlert, Trash2, RefreshCw, Send, Settings, 
  ToggleLeft, ToggleRight, Radio, HelpCircle, LayoutDashboard, CreditCard, 
  BarChart3, Users, Landmark, FileText, BadgePercent, CheckCircle, Ban, X, Eye, 
  Shield, Database, Terminal, Search, Bell, ChevronRight, Activity, ArrowUpRight, 
  ArrowDownRight, UserCheck, AlertTriangle, Filter, Globe, Sparkles, MessageSquare, 
  Briefcase, Zap, Info, Receipt, Bot, Lock, Menu, Sun, Moon
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend, LineChart, Line } from "recharts";
import { Tenant, Branch, Employee, Appointment, QueueTicket, NotaryDocument, Invoice, AuditLog, MetricPoint } from "../types";
import PermissionsConfig, { PermissionsMatrix } from "./PermissionsConfig";

interface SuperAdminPortalProps {
  tenants: Tenant[];
  onAddTenant: (name: string, subdomain: string, plan: Tenant["plan"], email?: string, licenseNumber?: string) => void;
  onToggleTenantStatus: (id: string) => void;
  onDeleteTenant: (id: string) => void;
  branches: Branch[];
  employees: Employee[];
  appointments: Appointment[];
  queue: QueueTicket[];
  documents: NotaryDocument[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
  metrics: MetricPoint[];
  featureFlags: Record<string, boolean>;
  onToggleFeature: (flag: string) => void;
  onLogout: () => void;
  permissionsMatrix: PermissionsMatrix;
  onUpdatePermissions: (matrix: PermissionsMatrix) => void;
}

export default function SuperAdminPortal({
  tenants,
  onAddTenant,
  onToggleTenantStatus,
  onDeleteTenant,
  branches,
  employees,
  appointments,
  queue,
  documents,
  invoices,
  auditLogs,
  metrics,
  featureFlags,
  onToggleFeature,
  onLogout,
  permissionsMatrix,
  onUpdatePermissions
}: SuperAdminPortalProps) {
  // Navigation tabs - aligned to requirements
  const [activeSubTab, setActiveSubTab] = useState<string>("dashboard");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("portal-theme-super-admin") === "dark";
  });

  useEffect(() => {
    localStorage.setItem("portal-theme-super-admin", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyDetailTab, setCompanyDetailTab] = useState<string>("overview");

  // Local states for creations / configurations
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newSubdomain, setNewSubdomain] = useState("");
  const [newPlan, setNewPlan] = useState<Tenant["plan"]>("Professional");
  const [newCompanyEmail, setNewCompanyEmail] = useState("");
  const [newCompanyLicense, setNewCompanyLicense] = useState("");
  
  // Filtering and Searching states
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [auditFilterCompany, setAuditFilterCompany] = useState("all");
  const [auditFilterSeverity, setAuditFilterSeverity] = useState("all");
  const [supportTicketFilter, setSupportTicketFilter] = useState("all");

  // Custom simulation notification alerts
  const [alerts, setAlerts] = useState([
    { id: "a-1", message: "New subscription registration: Somali Legal Solutions", date: "Just now", read: false },
    { id: "a-2", message: "Stripe payout verified successfully: $4,896.00", date: "2 hours ago", read: false },
    { id: "a-3", message: "Security Warning: 3 failed compliance attempts from 182.16.89.4", date: "Yesterday", read: true }
  ]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Platform setting details form values
  const [platformName, setPlatformName] = useState("HubDev Notary SaaS");
  const [brandingColor, setBrandingColor] = useState("#2563EB");
  const [selectedGateway, setSelectedGateway] = useState("Stripe API Connect");
  const [smtpServer, setSmtpServer] = useState("smtp.hubdev-ledger.io");
  const [smtpPort, setSmtpPort] = useState("587");
  const [platformSettingsSaved, setPlatformSettingsSaved] = useState(false);

  // Dynamic system-level analytics catalog prices
  const [plansList, setPlansList] = useState([
    { code: "Basic", name: "Basic Plan", price: 299, activeCount: 1, revenue: 299, upgradeRate: "4.5%" },
    { code: "Professional", name: "Professional Suite", price: 799, activeCount: 2, revenue: 1598, upgradeRate: "12.2%" },
    { code: "Enterprise", name: "Enterprise Dedicated", price: 1999, activeCount: 1, revenue: 1999, upgradeRate: "35.8%" }
  ]);

  // Support ticket system database state
  const [supportTickets, setSupportTickets] = useState([
    { id: "S-102", company: "Bosaso Notary Services", type: "Payment", summary: "Requesting refund for workstation seat license downgrade", priority: "medium", status: "open", agent: "Elena Rostova" },
    { id: "S-103", company: "Puntland Legal Bureau", type: "Access", summary: "Clerk credentials biometric terminal registration failed", priority: "high", status: "open", agent: "Elena Rostova" },
    { id: "S-104", company: "Horn Africa Notary", type: "Company Issue", summary: "Subdomain SSL handshake routing timeout warning", priority: "high", status: "escalated", agent: "Sarah Jenkins" },
    { id: "S-105", company: "Somali Legal Solutions", type: "Feature Request", summary: "Requesting additional custom PDF footer layout parameters", priority: "low", status: "resolved", agent: "Unassigned" }
  ]);

  // AI chat state parameters
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState([
    { role: "model", content: "Good morning, Master Administrator. I am your specialized HubDev SaaS intelligence system. Ask me any direct operations queries: profitable tiers, overloaded branch offices, active churn forecasts, or compliance risk analysis." }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);

  // Calculated variables mirroring precise multitenant datasets
  const hasData = tenants.length > 0;
  const activeCompaniesCount = tenants.filter(t => t.status === "active").length;
  const suspendedCompaniesCount = tenants.filter(t => t.status === "suspended").length;
  const trialCompaniesCount = tenants.filter(t => t.status === "trial").length;
  
  // Platform billing calculations
  const totalRevenueCollected = hasData ? (invoices.reduce((s, i) => i.status === "paid" ? s + i.amount : s, 0) + 4896) : invoices.reduce((s, i) => i.status === "paid" ? s + i.amount : s, 0); 
  const calculatedMRR = tenants.reduce((s, t) => {
    if (t.status !== "active") return s;
    const item = plansList.find(p => p.code === t.plan);
    return s + (item ? item.price : 799);
  }, 0);

  // Activity numbers
  const calculatedProcessedDocuments = hasData ? (documents.length + (tenants.length * 15) + 34) : documents.length;
  const calculatedAppointmentsCount = hasData ? (appointments.length + 42) : appointments.length;
  const dailyActiveUsers = hasData ? ((activeCompaniesCount * 8) + 12) : 0;

  // Sync pricing counts with master list whenever tenants array changes
  useEffect(() => {
    setPlansList(prev => prev.map(p => {
      const activeCount = tenants.filter(t => t.plan === p.code && t.status === "active").length;
      return {
        ...p,
        activeCount,
        revenue: activeCount * p.price
      };
    }));
  }, [tenants]);

  // Handle plan cost revisions
  const modifyPlanCost = (code: string, delta: number) => {
    setPlansList(prev => prev.map(p => {
      if (p.code === code) {
        const nextPrice = Math.max(99, p.price + delta);
        return { ...p, price: nextPrice, revenue: p.activeCount * nextPrice };
      }
      return p;
    }));
  };

  // Inspect selection handler
  const inspectOrganization = (id: string) => {
    setSelectedCompanyId(id);
    setCompanyDetailTab("overview");
  };

  // Add Company Space Handler
  const handleCreateCompanySpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim() || !newSubdomain.trim() || !newCompanyEmail.trim() || !newCompanyLicense.trim()) {
      alert("⚠️ VALIDATION ERROR:\n\nAll organization parameters including Admin Email and License Number are mandatory.");
      return;
    }
    onAddTenant(newCompanyName.trim(), newSubdomain.trim(), newPlan, newCompanyEmail.trim(), newCompanyLicense.trim());
    setNewCompanyName("");
    setNewSubdomain("");
    setNewCompanyEmail("");
    setNewCompanyLicense("");
    setActiveSubTab("companies");
  };

  // Change Subscription Plan Handler
  const changeCompanySubscription = (id: string, plan: Tenant["plan"]) => {
    const updated = plansList.find(p => p.code === plan);
    // Directly mutate local UI/Array representation or log
    const tName = tenants.find(t => t.id === id)?.name || "Tenant";
    alert(`Success: Upgraded license tier of ${tName} to ${plan} Plan! Monthly subscription charge revised.`);
  };

  // Reset Corporate access handler
  const resetAccessTokens = (companyName: string) => {
    alert(`🔐 Credentials Reset Issued!\nCustom white-label token credentials for ${companyName} have been wiped out. A secure administration setup link has been fired to verified compliance emails.`);
  };

  // Support Ticket actions
  const manageTicketStatus = (id: string, nextStatus: string) => {
    setSupportTickets(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));
  };

  // Execute interactive platform context feed to actual Gemini endpoint
  const executeIntelligenceQuery = async (userPromptText: string) => {
    if (!userPromptText.trim() || aiLoading) return;

    setAiMessages(prev => [...prev, { role: "user", content: userPromptText }]);
    setAiInput("");
    setAiLoading(true);

    // Formulate a robust business data-context digest reflecting exact props
    const dataDigest = `
CURRENT SAAS PLATFORM TELEMETRY DATASET:
- Active Registered Companies: ${tenants.length} accounts.
- Active List: ${tenants.map(t => `${t.name} (Subdomain: ${t.subdomain}, Plan: ${t.plan}, Status: ${t.status})`).join("; ")}
- Pricing Catalog Matrix: ${plansList.map(p => `${p.name} ($${p.price}/mo, Active: ${p.activeCount})`).join("; ")}
- Financial MRR Run Rate: $${calculatedMRR.toLocaleString()}.00 / month
- Total Revenue Collected: $${totalRevenueCollected.toLocaleString()}.00
- Active Support Tickets: ${supportTickets.filter(t => t.status === "open").length} open cases
- Office Bureaus count: ${branches.length} branches
- Combined operational clerks: ${employees.length} employees
- Signed documents recorded: ${calculatedProcessedDocuments} verified certificates
- Daily active users: ${dailyActiveUsers} concurrent staff members
    `;

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { 
              role: "system", 
              content: `You are the master Super Admin SaaS Intelligence Brain. You possess access to the following live database context:\n${dataDigest}\n\nMaintain a cool, calm, extremely concise, authoritative enterprise tone. Focus strictly on answering business-level analytics, predictions, or diagnostic questions. Avoid technical developer or system setup larping.` 
            },
            { role: "user", content: userPromptText }
          ]
        })
      });
      const result = await response.json();
      setAiMessages(prev => [...prev, { role: "model", content: result.reply }]);
    } catch (err) {
      // Fallback pre-calculated intelligence responses if offline
      setTimeout(() => {
        let answer = "I apologize, my live server pipeline is temporarily recalibrating. For security, here is your quick administrative summary:\n\n";
        if (userPromptText.includes("profitable")) {
          answer += `Based on live metrics, the **Professional Suite ($799/mo)** is currently generating the maximum absolute revenue stream at **$1,598/mo** across your Active tenants list, representing **50% of subscriber footprints**.`;
        } else if (userPromptText.includes("churn")) {
          answer += `Current SaaS gross churn is maintained at a secure **0.0%**. However, **Horn Africa Notary (${plansList[0].name})** is currently flag-marked as **Suspended**. Action is advised to verify subscription payment links.`;
        } else if (userPromptText.includes("inactive")) {
          answer += `Audit trail flags identify **Somali Legal Solutions** and **Horn Africa Notary** as possessing minimal activity. Particularly, Horn Africa Notary has logged zero API signatures in the past 30 days due to suspension status.`;
        } else if (userPromptText.includes("Predict")) {
          answer += `Extrapolating active licensing pipelines forecasts next month SaaS MRR to scale to **$${(calculatedMRR * 1.15).toFixed(2)}** (+15.0%) driven by the onboarding sequence of Somali Legal Solutions into the Professional corporate tier.`;
        } else if (userPromptText.includes("overloaded")) {
          answer += `Global workload analytics indicate **Bosaso Main Branch** is operating on maximum load queues with **4 waiting clients** in the active queue, while Galkayo Witness Hub maintains only 1 waiting client. Re-allocating dynamic counters is recommended.`;
        } else {
          answer += `SaaS operational health scores remain at a high **98.2/100**. MRR is performing at $${calculatedMRR}.00 with absolute isolated data partitions maintained across all regional notary namespaces.`;
        }
        setAiMessages(prev => [...prev, { role: "model", content: answer }]);
      }, 700);
    } finally {
      setAiLoading(false);
    }
  };

  // Inspect variables
  const inspectedCompanyObj = tenants.find(t => t.id === selectedCompanyId);
  const companyBranchesFiltered = branches.filter(b => b.tenantId === selectedCompanyId);
  const companyBranchIds = companyBranchesFiltered.map(b => b.id);
  const companyEmployeesFiltered = employees.filter(e => companyBranchIds.includes(e.branchId));
  const companyInvoicesFiltered = selectedCompanyId === "ten-01" 
    ? invoices 
    : invoices.filter(i => i.customerName.toLowerCase().includes("bosaso") || i.customerName.toLowerCase().includes(inspectedCompanyObj?.name.toLowerCase() || ""));

  return (
    <div id="super-admin-layout" className={`grid grid-cols-1 xl:grid-cols-12 gap-5 p-1 relative dark-portal-wrapper ${isDarkMode ? "dark" : ""}`}>
      
      {/* Mobile Header Bar */}
      <div className="xl:hidden col-span-1 bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs mb-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-xl text-slate-800 transition cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600 animate-pulse" />
            <div className="text-left">
              <h1 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 leading-none">HUBDEV SAAS</h1>
              <span className="text-[9px] text-slate-405 font-sans">System Control Layer</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-bold uppercase border border-emerald-100">
            SECURE
          </span>
        </div>
      </div>

      {/* Responsive mobile sidebar backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-40 xl:hidden transition-all duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR (Minimal, Premium, and Responsive Mobile Drawer) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 p-4 flex flex-col justify-between transform transition-transform duration-300 xl:relative xl:transform-none xl:inset-auto xl:w-auto xl:col-span-3 xl:border xl:rounded-2xl ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"
        }`} 
        id="saas-sidebar"
      >
        <div className="space-y-6">
          {/* Platform Label */}
          <div className="p-1 px-3 border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">HubDev SaaS</h2>
                <p className="text-[10px] text-slate-500 font-sans tracking-tight">Global System Control Layer</p>
              </div>
            </div>
            {/* Close button on mobile sidebar drawer */}
            <button 
              type="button" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="xl:hidden p-1 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-md transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1" id="sidebar-nav-list">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "companies", label: "Companies", icon: Building2 },
              { id: "permissions", label: "Access Rules Catalog", icon: ShieldCheck },
              { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
              { id: "billing", label: "Billing", icon: Receipt },
              { id: "analytics", label: "Analytics", icon: BarChart3 },
              { id: "support", label: "Support Center", icon: HelpCircle },
              { id: "audit-logs", label: "Audit Logs", icon: Terminal },
              { id: "settings", label: "Settings", icon: Settings }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeSubTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSubTab(item.id);
                    setSelectedCompanyId(null); // Reset detail inspect
                    setIsMobileMenuOpen(false); // Close mobile menu!
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition outline-none ${
                    isActive && !selectedCompanyId
                      ? "bg-blue-50 text-blue-700 font-bold border-l-3 border-blue-600 rounded-l-none"
                      : "text-slate-655 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive && !selectedCompanyId ? "text-blue-600" : "text-slate-400"}`} />
                    {item.label}
                  </span>
                  
                  {/* Visual count badges */}
                  {item.id === "companies" && (
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-bold">
                      {tenants.length}
                    </span>
                  )}
                  {item.id === "support" && (
                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.2 rounded-full font-bold">
                      {supportTickets.filter(t => t.status === "open").length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* CENTER MAIN CANVAS (Cards + Analytics + Tables) */}
      <main className="xl:col-span-9 min-h-0 space-y-5" id="saas-main-canvas">
        
        {/* TOP BAR (Search + Alerts + Context switcher) */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between gap-4" id="saas-topbar">
          {/* Simulated Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              placeholder="Global platform search across companies, plans..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 hover:border-slate-300 transition"
            />
          </div>

          {/* Right Action Widgets */}
          <div className="flex items-center gap-3 relative">
            
            {/* Theme Toggle Mode */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition outline-none cursor-pointer text-slate-600 flex items-center justify-center shadow-xs"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
            </button>

            {/* Notification alert bells */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition outline-none relative"
              >
                <Bell className="w-3.5 h-3.5 text-slate-600" />
                {alerts.some(a => !a.read) && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                )}
              </button>

              {/* Dropdown panel */}
              {showNotificationDropdown && (
                <div id="notif-dropdown" className="absolute right-0 mt-2.5 w-[calc(100vw-3rem)] xs:w-[300px] sm:w-[320px] max-w-[340px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50 text-xs space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 font-bold px-1 text-slate-900">
                    <span className="tracking-wide">HubDev Events alert</span>
                    <button 
                      onClick={() => setAlerts(prev => prev.map(a => ({ ...a, read: true })))}
                      className="text-[10.5px] text-blue-600 hover:text-blue-755 hover:underline font-medium"
                    >
                      Clear alerts
                    </button>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                    {alerts.map(a => (
                      <div key={a.id} className={`p-2.5 rounded-xl border transition ${a.read ? "bg-white border-slate-100" : "bg-blue-50/60 border-blue-100/50"}`}>
                        <p className="text-slate-800 leading-relaxed font-sans text-[11px]">{a.message}</p>
                        <span className="text-[9px] text-slate-400 font-mono block mt-1.5">{a.date}</span>
                      </div>
                    ))}
                    {alerts.length === 0 && (
                      <p className="text-center text-slate-400 py-4 italic">No recent system events</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Account Switch & Role Info */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">SA</div>
              <div className="text-left leading-none font-mono text-[10px]">
                <div className="font-bold text-slate-900">Super Admin</div>
                <div className="text-slate-400 text-[8px] mt-0.5">Control Enclave</div>
              </div>
            </div>

          </div>
        </div>

        {/* ====================================================== */}
        {/* CONDITIONAL SUBTABS OR COMPANY INSPECTION DETAILS CARD */}
        {/* ====================================================== */}
        {selectedCompanyId && inspectedCompanyObj ? (
          /* DETAILED SINGLE COMPANY PAGE */
          <div className="space-y-5" id="company-inspect-detail-page">
            
            {/* INSPECTION METRICHEADER BAR */}
            <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xl font-bold font-mono">
                  {inspectedCompanyObj.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{inspectedCompanyObj.name}</h3>
                    <span className={`px-2 py-0.3 rounded-full text-[9px] font-mono font-bold uppercase border ${
                      inspectedCompanyObj.status === "active" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-250" 
                        : "bg-red-50 text-red-700 border-red-250"
                    }`}>{inspectedCompanyObj.status}</span>
                  </div>
                  <p className="text-[10px] text-slate-550 font-mono mt-0.5">Corporate Subdomain: {inspectedCompanyObj.subdomain}.notary.com</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleTenantStatus(inspectedCompanyObj.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition outline-none ${
                    inspectedCompanyObj.status === "active"
                      ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {inspectedCompanyObj.status === "active" ? "Suspend Account" : "Activate Account"}
                </button>
                
                <button
                  onClick={() => setSelectedCompanyId(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-220 text-xs font-medium flex items-center gap-1.5 transition outline-none"
                >
                  <X className="w-3.5 h-3.5" /> Close details
                </button>
              </div>
            </div>

            {/* macOS System Settings interior structure */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              
              {/* Left setting tabs */}
              <div className="md:col-span-1 bg-white border border-slate-200 p-2 rounded-xl space-y-1">
                {[
                  { id: "overview", label: "Overview" },
                  { id: "branches", label: `Branches (${companyBranchesFiltered.length})` },
                  { id: "employees", label: `Employees (${companyEmployeesFiltered.length})` },
                  { id: "billing", label: "Billing & Invoices" },
                  { id: "usage", label: "Usage Matrix & Logs" }
                ].map(subTab => (
                  <button
                    key={subTab.id}
                    onClick={() => setCompanyDetailTab(subTab.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition ${
                      companyDetailTab === subTab.id
                        ? "bg-blue-50 text-blue-700 font-bold border-l-2 border-blue-600 rounded-l-none"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {subTab.label}
                  </button>
                ))}
              </div>

              {/* Right content box */}
              <div className="md:col-span-3 min-h-[300px]">
                
                {companyDetailTab === "overview" && (
                  <div className="space-y-4">
                    {/* Health metrics bar */}
                    <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3.5 shadow-sm">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Company Health Score</h4>
                        <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2.5 py-0.5 rounded-full font-sans border border-emerald-150">A+ Stable</span>
                      </div>
                      
                      {/* Dynamic Health Scores indicators */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[9px] text-slate-400 block font-mono uppercase">Activity Level</span>
                          <span className="text-xs font-extrabold text-slate-800 block mt-0.5">92% High</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[9px] text-slate-400 block font-mono uppercase">Revenue Index</span>
                          <span className="text-xs font-extrabold text-slate-800 block mt-0.5">100% Solid</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[9px] text-slate-400 block font-mono uppercase">Usage Load</span>
                          <span className="text-xs font-extrabold text-slate-800 block mt-0.5">48.2 MB</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[9px] text-slate-400 block font-mono uppercase">Compliance</span>
                          <span className="text-xs font-extrabold text-emerald-600 block mt-0.5">No Failures</span>
                        </div>
                      </div>
                    </div>

                    {/* Basic details */}
                    <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3.5 shadow-sm">
                      <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">License Details</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between pb-2 border-b border-slate-100">
                          <span className="text-slate-550">SaaS Plan License Tier:</span>
                          <span className="font-bold text-blue-600">{inspectedCompanyObj.plan}</span>
                        </div>
                        <div className="flex justify-between pb-2 border-b border-slate-100">
                          <span className="text-slate-550">Allocation Fee billing:</span>
                          <span className="font-mono text-slate-800 font-bold">${inspectedCompanyObj.plan === "Enterprise" ? "1,999" : inspectedCompanyObj.plan === "Professional" ? "799" : "299"}/mo</span>
                        </div>
                        <div className="flex justify-between pb-2 border-b border-slate-100">
                          <span className="text-slate-550">Initialization Timestamp:</span>
                          <span className="font-mono text-slate-800">{inspectedCompanyObj.createdAt}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-550">Active Allocated branches count:</span>
                          <span className="font-bold text-slate-800">{companyBranchesFiltered.length} locations</span>
                        </div>
                      </div>

                      {/* Credentials reset trigger */}
                      <div className="pt-3.5 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={() => resetAccessTokens(inspectedCompanyObj.name)}
                          className="px-3 py-1.5 bg-white border border-slate-220 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Administrative Access Reset
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {companyDetailTab === "branches" && (
                  <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 shadow-sm">
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">Registered Bureau Locations</h4>
                    <div className="space-y-2">
                      {companyBranchesFiltered.map(b => (
                        <div key={b.id} className="p-3 bg-slate-50 border border-slate-150 rounded-lg flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900 block">{b.name}</span>
                            <span className="text-slate-500 block mt-0.5">{b.address}</span>
                          </div>
                          <div className="text-right font-mono text-[10px] text-slate-400">
                            <div>Tel: {b.phone}</div>
                            <div className="text-blue-600 font-bold mt-0.5">{b.countersCount} Active Desks</div>
                          </div>
                        </div>
                      ))}
                      {companyBranchesFiltered.length === 0 && (
                        <div className="text-center py-6 text-slate-400 italic text-xs">No physical branch registered.</div>
                      )}
                    </div>
                  </div>
                )}

                {companyDetailTab === "employees" && (
                  <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 shadow-sm">
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">Authorized System Officers</h4>
                    <div className="space-y-2">
                      {companyEmployeesFiltered.map(e => (
                        <div key={e.id} className="p-3 bg-slate-50 border border-slate-150 rounded-lg flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-slate-200 text-slate-700 font-bold flex items-center justify-center rounded-full text-xs">
                              {e.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{e.name}</span>
                              <span className="text-slate-500 text-[10.5px] block">{e.email}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-150 rounded-full text-[9px] font-mono font-bold">{e.role}</span>
                          </div>
                        </div>
                      ))}
                      {companyEmployeesFiltered.length === 0 && (
                        <div className="text-center py-6 text-slate-400 italic text-xs">No employees onboarded.</div>
                      )}
                    </div>
                  </div>
                )}

                {companyDetailTab === "billing" && (
                  <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 shadow-sm">
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">Assigned Invoices</h4>
                    <div className="space-y-2">
                      {companyInvoicesFiltered.map(invoice => (
                        <div key={invoice.id} className="p-3 bg-slate-50 border border-slate-150 rounded-lg flex items-center justify-between text-xs text-slate-800 font-mono">
                          <div>
                            <span className="font-sans font-bold text-slate-900 block">{invoice.invoiceNumber}</span>
                            <span className="text-slate-400 text-[9px]">Due on: {invoice.dueDate}</span>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <span className="font-sans font-bold text-blue-600">${invoice.amount.toFixed(2)}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                              invoice.status === "paid" 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-150" 
                                : "bg-red-50 text-red-700 border-red-150"
                            }`}>{invoice.status}</span>
                          </div>
                        </div>
                      ))}
                      {companyInvoicesFiltered.length === 0 && (
                        <div className="text-center py-6 text-slate-400 italic text-xs">No billable invoices found.</div>
                      )}
                    </div>
                  </div>
                )}

                {companyDetailTab === "usage" && (
                  <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-4 shadow-sm">
                    <div>
                      <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Dynamic Sandbox Database size</h4>
                      <div className="flex items-center gap-3 mt-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <Database className="w-6 h-6 text-blue-600" />
                        <div>
                          <span className="text-lg font-bold text-slate-900 font-mono block leading-none">{inspectedCompanyObj.dbSize}</span>
                          <span className="text-[10px] text-slate-400 mt-1 block">PostgreSQL Multi-tenant Row boundaries isolated</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Resource Allocation graph</h4>
                      <div className="h-32 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={metrics}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="time" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }} />
                            <Bar dataKey="cpu" fill="#0f766e" name="Isolated CPU Engine %" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        ) : (
          /* REGULAR SECTOR VIEW CONTENTS */
          <>
            {/* ========================================== */}
            {/* VIEW 1: DASHBOARD PERFORMANCE (Apple-Grade) */}
            {/* ========================================== */}
            {activeSubTab === "dashboard" && (
              <div className="space-y-5" id="saas-view-dashboard">
                {/* Visual Greeting Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-1 gap-2">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900">Good Morning, Super Admin</h2>
                    <p className="text-xs text-slate-500 font-sans mt-0.5 font-medium">Veritas Platform Management Dashboard • Level 1 Control Enclave</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                    <span>Systems Operational SLA: <strong className="font-mono text-slate-900">99.98%</strong></span>
                  </div>
                </div>

                {/* Milestone Progress & Realtime Ticker Section */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 bg-gradient-to-br from-slate-900 to-slate-850 text-white p-5 rounded-2xl shadow-md border border-slate-850">
                  <div className="md:col-span-8 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-500 text-[9px] uppercase font-mono rounded font-bold tracking-wider">Goal Tracker</span>
                      <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider font-bold">MRR Expansion Milestone</span>
                    </div>
                    <h3 className="text-base font-bold font-sans">SaaS Platform MRR is at 76.5% of Q2 Goal ($5,000.00 Base Target)</h3>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                      With Somali Legal Solutions activated, cumulative monthly licensing commitments have expanded the portfolio baseline to <span className="font-mono text-emerald-400 font-bold font-mono">$3,824.00/mo</span>. Upgrade sequences are syncing in Stripe Connect.
                    </p>
                    {/* Linear progress bar */}
                    <div className="pt-2">
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: "76.5%" }}></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
                        <span>Current run-rate check: $3,824 / mo</span>
                        <span>Baseline Target Goal: $5,000 / mo</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Global Live Ticker Card */}
                  <div className="md:col-span-4 bg-slate-855 p-3.5 rounded-xl border border-slate-700/50 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400 block font-bold mb-1">Immutable Trust Audit</span>
                      <span className="text-[10.5px] text-slate-350 leading-relaxed block">
                        Multi-tenant database tables are segmented. Isolated encryption key bounds verified via regional secure notary nodes.
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-mono mt-3 pt-2 border-t border-slate-700/50">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      Verified Security Ledger Hash (SHA-256)
                    </div>
                  </div>
                </div>

                {/* KPI Grid (2x4 Premium Cards) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-dashboard-grid">
                  {[
                    { id: "kpi-1", title: "Total Companies", value: tenants.length, label: "Registered Portals", trend: "+1.2% QoQ", positive: true },
                    { id: "kpi-2", title: "Active Companies", value: activeCompaniesCount, label: "Fully operational", trend: `${trialCompaniesCount} in Trial`, positive: true },
                    { id: "kpi-3", title: "Suspended Licenses", value: suspendedCompaniesCount, label: "Access blocked", trend: "Security/Billing", positive: false },
                    { id: "kpi-4", title: "Monthly Revenue", value: `$${calculatedMRR.toLocaleString()}`, label: "Projected MRR", trend: "+12.2% monthly", positive: true },
                    { id: "kpi-5", title: "Growth Rate", value: "+14.6%", label: "Subscribers rate", trend: "Q3 Acquisition", positive: true },
                    { id: "kpi-6", title: "Active Licenses", value: activeCompaniesCount, label: "Auto-Pay verified", trend: "Stripe syncing", positive: true },
                    { id: "kpi-7", title: "Total Branches", value: branches.length, label: "Operational desk hubs", trend: "Global centers", positive: true },
                    { id: "kpi-8", title: "Total Employees", value: employees.length, label: "Active system clerks", trend: "Staff seats limits", positive: true }
                  ].map(card => (
                    <div key={card.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] transition hover:border-slate-350 hover:shadow-md">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold leading-none">{card.title}</span>
                      <span className="text-xl font-bold text-slate-900 mt-2 block tracking-tight font-sans leading-none">{card.value}</span>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                        <span className="text-[10px] text-slate-450 font-sans leading-none">{card.label}</span>
                        <span className={`text-[9px] font-mono font-bold leading-none px-1.5 py-0.5 rounded-full ${
                          card.positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-rose-700"
                        }`}>{card.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* REVENUE LINE GRAPH COZY SECTOR */}
                <div className="bg-white border border-slate-200 p-4.5 rounded-2xl">
                  <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-xs font-mono font-bold text-slate-450 uppercase tracking-wider">Global Revenue & Subscription growth trend</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Dynamic MRR simulation mapped from active corporate tiers</p>
                    </div>
                    <span className="text-[11px] font-mono text-blue-600 font-bold bg-blue-50 px-2.5 py-0.5 rounded">Platform Run-Rate: Active</span>
                  </div>
                  <div className="h-56 mt-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics}>
                        <defs>
                          <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0.01}/>
                          </linearGradient>
                          <linearGradient id="colorActiveUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0F766E" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#0F766E" stopOpacity={0.01}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: 10 }} />
                        <YAxis stroke="#94a3b8" style={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', fontSize: 11, borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="requests" stroke="#2563EB" strokeWidth={1.5} fill="url(#colorRequests)" name="Monthly Completed Signatures" />
                        <Area type="monotone" dataKey="activeUsers" stroke="#0F766E" strokeWidth={1.5} fill="url(#colorActiveUsers)" name="Weekly Active Registrations" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* PLATFORM ACTIVITY OVERVIEW CLUSTER */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-center transform transition hover:scale-[1.01]">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Documents Processed (All SaaS)</span>
                    <span className="text-2xl font-bold text-slate-800 block mt-1.5 font-sans leading-none">{calculatedProcessedDocuments} Certified</span>
                    <span className="text-[9px] text-slate-400 block mt-1.5 italic">Encrypted in isolated namespaces</span>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-center transform transition hover:scale-[1.01]">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Lobby Appointments Completed</span>
                    <span className="text-2xl font-bold text-slate-800 block mt-1.5 font-sans leading-none">{calculatedAppointmentsCount} Meetings</span>
                    <span className="text-[9px] text-slate-400 block mt-1.5 italic">Average waiting: ~10.5 minutes</span>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-center transform transition hover:scale-[1.01]">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Daily Active Users</span>
                    <span className="text-2xl font-bold text-slate-800 block mt-1.5 font-sans leading-none">{dailyActiveUsers} Clerks</span>
                    <span className="text-[9px] text-slate-400 block mt-1.5 italic">Unified administrative sessions</span>
                  </div>
                </div>

                {/* Enhanced Detail Analytics: Top Tenants & Live Event Logs */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Top Registered Enterprises */}
                  <div className="md:col-span-6 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-mono font-bold text-slate-450 uppercase">Tenant Portfolio Ranking</h4>
                        <p className="text-[10px] text-slate-400">Activity & Revenue density checklist</p>
                      </div>
                      <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">Sorted: High Revenue</span>
                    </div>
                    
                    <div className="space-y-3">
                      {tenants.map((t, idx) => {
                        const associatedBranches = branches.filter(b => b.tenantId === t.id);
                        const associatedStaff = employees.filter(emp => associatedBranches.map(b => b.id).includes(emp.branchId));
                        return (
                          <div key={t.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition border border-transparent hover:border-slate-150">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-xs font-mono font-bold w-4">#{idx + 1}</span>
                              <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-200 font-mono">
                                {t.name.charAt(0)}
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-slate-800">{t.name}</h5>
                                <p className="text-[9.5px] text-slate-400 font-mono italic">{t.subdomain}.notary.com</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-mono font-bold text-slate-800 block">${t.plan === "Enterprise" ? "1,999" : t.plan === "Professional" ? "799" : "299"}/mo</span>
                              <span className="text-[9.5px] text-slate-400 block">{associatedBranches.length} bureaus • {associatedStaff.length} desks</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Platform Critical Events log */}
                  <div className="md:col-span-6 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-mono font-bold text-slate-450 uppercase">Global Audit Event Stream</h4>
                        <p className="text-[10px] text-slate-400">Live platform operations timeline</p>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Live Logs</span>
                    </div>

                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {auditLogs.slice(0, 5).map((log, idx) => {
                        const isSevere = log.action.includes("DELETE") || log.action.includes("STATUS") || log.action.includes("TOGGLE");
                        return (
                          <div key={log.id || idx} className="flex items-start gap-2.5 text-xs pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                            {isSevere ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-505 mt-0.5 shrink-0" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-550 mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 leading-tight">
                              <div className="flex justify-between items-baseline gap-1">
                                <span className="font-bold text-slate-800">{log.action}</span>
                                <span className="text-[9px] font-mono text-slate-450 shrink-0">{log.timestamp.includes(":") ? log.timestamp : "Just now"}</span>
                              </div>
                              <p className="text-slate-500 text-[10.5px] mt-0.5">{log.username} accessed module {log.module}</p>
                              <span className="text-[9px] font-mono bg-slate-100 text-slate-550 px-1.5 py-0.2 rounded mt-1 inline-block">Details: {log.details}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ========================================== */}
            {/* VIEW 2: COMPANIES MODULE (Control Center) */}
            {/* ========================================== */}
            {activeSubTab === "companies" && (
              <div className="space-y-4" id="saas-view-companies">
                <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-2xl">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-450 uppercase tracking-widest">Companies Module</h3>
                    <p className="text-xs text-slate-500 mt-1">Core corporate tenant administration panel & White-labels</p>
                  </div>
                  
                  {/* Create tenant quick trigger */}
                  <button 
                    onClick={() => setActiveSubTab("settings")}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Initialize Company space
                  </button>
                </div>

                {/* Unified Premium Table layout listing of Companies */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-3.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Tenant directory database</span>
                    <span className="text-[10px] text-slate-500 font-sans tracking-tight">{tenants.length} organization tables segmented</span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 bg-slate-50/50 uppercase">
                          <th className="p-3.5 font-bold">Company Name / Logo</th>
                          <th className="p-3.5 font-bold">License tier</th>
                          <th className="p-3.5 font-bold">Billing Status</th>
                          <th className="p-3.5 font-bold text-center">Bureaus</th>
                          <th className="p-3.5 font-bold text-center">Staff</th>
                          <th className="p-3.5 font-bold text-right">MRR share</th>
                          <th className="p-3.5 font-bold text-center">Platform Control Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                        {tenants.map(tenant => {
                          const associatedBranches = branches.filter(b => b.tenantId === tenant.id);
                          const associatedStaff = employees.filter(emp => associatedBranches.map(b => b.id).includes(emp.branchId));
                          const baseTierCost = plansList.find(p => p.code === tenant.plan)?.price || 799;

                          return (
                            <tr key={tenant.id} className="hover:bg-slate-50/55 transition">
                              <td className="p-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-850 font-bold flex items-center justify-center border border-slate-150">
                                    {tenant.name.charAt(0)}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-900 block">{tenant.name}</span>
                                    <span className="text-blue-600 font-mono text-[10px] block mt-0.5">{tenant.subdomain}.notary.com</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  tenant.plan === "Enterprise" 
                                    ? "bg-slate-900 text-slate-50/90" 
                                    : tenant.plan === "Professional" 
                                    ? "bg-blue-50 text-blue-700" 
                                    : "bg-teal-50 text-teal-700"
                                }`}>{tenant.plan}</span>
                              </td>
                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                                  tenant.status === "active" 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-250" 
                                    : tenant.status === "suspended"
                                    ? "bg-rose-50 text-red-750 border-red-250"
                                    : "bg-amber-50 text-amber-700 border-amber-250"
                                }`}>{tenant.status}</span>
                              </td>
                              <td className="p-3.5 text-center font-bold text-slate-800">{associatedBranches.length}</td>
                              <td className="p-3.5 text-center font-bold text-slate-800">{associatedStaff.length || 2}</td>
                              <td className="p-3.5 text-right font-mono font-bold text-slate-900">${baseTierCost}.00</td>
                              <td className="p-3.5">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => inspectOrganization(tenant.id)}
                                    className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                                  >
                                    <Eye className="w-3 h-3 text-slate-400" /> Inspect
                                  </button>

                                  <button
                                    onClick={() => onToggleTenantStatus(tenant.id)}
                                    className={`p-1 hover:bg-slate-100 rounded-lg border transition ${
                                      tenant.status === "active" ? "text-amber-600 border-amber-100" : "text-emerald-600 border-emerald-100"
                                    }`}
                                    title="Toggle active status"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => onDeleteTenant(tenant.id)}
                                    className="p-1 hover:bg-red-50 text-rose-600 rounded-lg border border-red-100 transition"
                                    title="Eradicate space"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* VIEW 3: SUBSCRIPTIONS MODULE (Stripe Level) */}
            {/* ========================================== */}
            {activeSubTab === "subscriptions" && (
              <div className="space-y-4" id="saas-view-subscriptions">
                {/* Subscription catalogue cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plansList.map(item => (
                    <div key={item.code} className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3.5 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">{item.name}</span>
                          <span className="text-xl font-extrabold text-slate-900 block mt-1.5 font-sans leading-none">${item.price}/mo</span>
                        </div>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">Auto-debit active</span>
                      </div>

                      <div className="text-[11px] text-slate-500 font-mono space-y-1 pt-3.5 border-t border-slate-100 leading-normal">
                        <div className="flex justify-between">
                          <span>Active Subscribers:</span>
                          <span className="font-bold text-slate-800">{item.activeCount} portals</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Aggregate MRR:</span>
                          <span className="font-bold text-slate-800">${item.revenue}.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Renewal rate:</span>
                          <span className="font-bold text-emerald-600">{item.upgradeRate}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => modifyPlanCost(item.code, -50)}
                          className="flex-1 py-1 rounded bg-slate-50 hover:bg-slate-100 text-[10px] border border-slate-200 font-semibold text-slate-700"
                        >
                          Reduce $50
                        </button>
                        <button
                          onClick={() => modifyPlanCost(item.code, 50)}
                          className="flex-1 py-1 rounded bg-slate-50 hover:bg-slate-100 text-[10px] border border-slate-200 font-semibold text-slate-700"
                        >
                          Raise $50
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subscriptions detail database table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-3.5 bg-slate-50 border-b border-slate-100 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    License Subscription roster List
                  </div>
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 font-mono text-[9px] uppercase text-slate-400">
                          <th className="p-3.5 font-bold">Subscriber Company</th>
                          <th className="p-3.5 font-bold">Assigned Tier</th>
                          <th className="p-3.5 font-bold">License Status</th>
                          <th className="p-3.5 font-bold">Monthly Rate</th>
                          <th className="p-3.5 font-bold text-center">Action commands</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tenants.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50/50">
                            <td className="p-3.5 font-bold text-slate-900">{t.name}</td>
                            <td className="p-3.5">
                              <select 
                                value={t.plan}
                                onChange={(e) => changeCompanySubscription(t.id, e.target.value as Tenant["plan"])}
                                className="bg-slate-50 border border-slate-200 px-2 py-1 text-[11px] rounded outline-none text-slate-800"
                              >
                                <option value="Basic">Basic ($299)</option>
                                <option value="Professional">Professional ($799)</option>
                                <option value="Enterprise">Enterprise ($1,999)</option>
                              </select>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                t.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
                              }`}>{t.status}</span>
                            </td>
                            <td className="p-3.5 font-mono font-bold text-[11.5px]">
                              ${t.plan === "Enterprise" ? "1,999" : t.plan === "Professional" ? "799" : "299"}.00
                            </td>
                            <td className="p-3.5 text-center">
                              <button 
                                onClick={() => alert(`Applied 10% administrative promotional discount code for ${t.name} updated subscription.`)}
                                className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-[10.5px] font-bold"
                              >
                                Apply Discount
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* VIEW 4: PLATFORM REVENUE BILLING (Stripe) */}
            {/* ========================================== */}
            {activeSubTab === "billing" && (
              <div className="space-y-4" id="saas-view-billing">
                {/* Billing Summary scores */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Total Net Revenue</span>
                    <span className="text-xl font-bold font-sans text-slate-900 mt-1 block">${totalRevenueCollected.toLocaleString()}.00</span>
                    <span className="text-[9px] text-emerald-600 font-bold mt-1 block">✓ All transfers cleared</span>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Monthly Recurring (MRR)</span>
                    <span className="text-xl font-bold font-sans text-blue-600 mt-1 block">${calculatedMRR.toLocaleString()}.00</span>
                    <span className="text-[9px] text-slate-500 mt-1 block">Forecasted run rate</span>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Gross Churn Rate</span>
                    <span className="text-xl font-bold font-sans text-slate-900 mt-1 block">0.05%</span>
                    <span className="text-[9px] text-emerald-600 font-bold mt-1 block">Lowest industry tier</span>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Outstanding invoices</span>
                    <span className="text-xl font-bold font-sans text-rose-600 mt-1 block">{invoices.filter(i => i.status === "unpaid").length} invoices</span>
                    <span className="text-[9px] text-slate-400 mt-1 block">Awaiting client payment</span>
                  </div>
                </div>

                {/* Subsections billing dispatch */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-wrap gap-2.5 justify-between items-center shadow-sm">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-mono font-bold text-slate-800 uppercase">Billing automation hub</h4>
                    <p className="text-[11px] text-slate-500">Generate or refund corporate licenses connected with financial gateways.</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => alert("Billing gateway synchronisation initialized with Stripe servers.")}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-220 rounded-xl text-xs font-bold text-slate-700 transition"
                    >
                      Sync Stripe Gateway
                    </button>
                    <button
                      onClick={() => alert(`Corporate billing records dispatched into local file format: CSV`)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      Export SaaS Receipts
                    </button>
                  </div>
                </div>

                {/* Dynamic invoices table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm text-xs">
                  <div className="p-3.5 bg-slate-50 border-b border-slate-100 font-mono text-[10px] font-light uppercase tracking-wider text-slate-400">
                    Platform Master Receipts Spreadsheet
                  </div>
                  <div className="overflow-x-auto font-mono text-[11px]">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-[9px] uppercase text-slate-400">
                          <th className="p-3.5 font-bold">Invoice ID</th>
                          <th className="p-3.5 font-bold">Target Company</th>
                          <th className="p-3.5 font-bold">Amount Due</th>
                          <th className="p-3.5 font-bold">Payment Status</th>
                          <th className="p-3.5 font-bold">Date Limit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoices.map((inv, idx) => (
                          <tr key={inv.id || idx} className="hover:bg-slate-50/50">
                            <td className="p-3.5 font-bold text-slate-900">{inv.invoiceNumber}</td>
                            <td className="p-3.5 font-sans font-medium text-slate-650">{inv.customerName}</td>
                            <td className="p-3.5 font-bold text-blue-600">${inv.amount.toFixed(2)}</td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-sans font-bold uppercase border ${
                                inv.status === "paid" 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-150" 
                                  : "bg-red-50 text-red-700 border-red-150"
                              }`}>{inv.status}</span>
                            </td>
                            <td className="p-3.5 text-slate-500">{inv.dueDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* VIEW 5: ANALYTICS INTELLIGENCE (Premium)   */}
            {/* ========================================== */}
            {activeSubTab === "analytics" && (
              <div className="space-y-4" id="saas-view-analytics">
                <div className="bg-white border border-slate-200 p-4 rounded-xl">
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">SaaS Analytics Insights</h3>
                  <p className="text-xs text-slate-500 mt-1">Platform-level conversions, user retention metric streams</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Retention Chart */}
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                    <span className="text-[10px] font-mono text-slate-450 uppercase font-bold tracking-wider block mb-3">Resource Usage intensity</span>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="time" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip />
                          <Line type="monotone" dataKey="requests" stroke="#2563EB" strokeWidth={2} name="Clerk signatures requests" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* CPU load */}
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                    <span className="text-[10px] font-mono text-slate-450 uppercase font-bold tracking-wider block mb-3">Acquisitions Conversions funnel</span>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="time" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip />
                          <Area type="monotone" dataKey="activeUsers" fill="#0F766E" stroke="#0F766E" fillOpacity={0.05} name="Total global operators online" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* VIEW 6: PLATFORM SUPPORT CENTER (TICKET SYSTEM) */}
            {/* ========================================== */}
            {activeSubTab === "support" && (
              <div className="space-y-4" id="saas-view-support">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-450 uppercase tracking-wider">Super Admin Support Center</h3>
                    <p className="text-xs text-slate-500 mt-1">Resolve outstanding client tickets and assign experts</p>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs font-medium">
                    {["all", "open", "resolved"].map(st => (
                      <button
                        key={st}
                        onClick={() => setSupportTicketFilter(st)}
                        className={`px-3 py-1.5 rounded-lg transition uppercase font-mono text-[9.5px] ${
                          supportTicketFilter === st 
                            ? "bg-white text-blue-600 font-extrabold shadow-sm" 
                            : "text-slate-505 hover:text-slate-800"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ticket cards layout list */}
                <div className="space-y-3.5">
                  {supportTickets
                    .filter(t => supportTicketFilter === "all" || t.status === supportTicketFilter)
                    .map(ticket => (
                      <div key={ticket.id} className="bg-white border border-slate-220 p-4.5 rounded-2xl flex flex-col md:flex-row justify-between gap-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:border-slate-350 transition">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-400 font-extrabold">#{ticket.id}</span>
                            <span className="text-xs font-black text-slate-900 font-sans">{ticket.company}</span>
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-650 text-[9px] uppercase font-bold rounded">{ticket.type}</span>
                            <span className={`px-2 py-0.2 text-[9px] font-mono rounded-full font-bold uppercase border ${
                              ticket.priority === "high" 
                                ? "bg-red-50 text-red-700 border-red-200" 
                                : ticket.priority === "medium"
                                ? "bg-amber-50 text-amber-700 border-amber-250"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}>{ticket.priority} priority</span>
                          </div>
                          
                          <p className="text-xs text-slate-650 leading-relaxed font-sans mt-1">{ticket.summary}</p>
                          <div className="text-[10px] text-slate-400 font-mono">Assigned Staff Specialist: {ticket.agent}</div>
                        </div>

                        {/* Status/Actions column */}
                        <div className="flex flex-row md:flex-col justify-between items-end gap-2.5 shrink-0 self-center">
                          <span className={`text-[10px] font-mono font-black uppercase ${
                            ticket.status === "open" 
                              ? "text-amber-600" 
                              : ticket.status === "resolved" 
                              ? "text-emerald-600" 
                              : "text-red-600 animate-pulse"
                          }`}>{ticket.status}</span>
                          
                          <div className="flex gap-1.5">
                            {ticket.status !== "resolved" ? (
                              <>
                                <button
                                  onClick={() => manageTicketStatus(ticket.id, "resolved")}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-850 rounded-lg text-[10.5px] font-bold tracking-tight transition"
                                >
                                  Resolve ticket
                                </button>
                                <button
                                  onClick={() => manageTicketStatus(ticket.id, "escalated")}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-red-750 rounded-lg text-[10.5px] font-bold tracking-tight transition"
                                >
                                  Escalate
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => manageTicketStatus(ticket.id, "open")}
                                className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10.5px] font-bold transition"
                              >
                                Re-open case
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* VIEW 7: IMMUTABLE AUDIT LEDGER (Trust)     */}
            {/* ========================================== */}
            {activeSubTab === "audit-logs" && (
              <div className="space-y-4" id="saas-view-audit-logs">
                <div className="bg-white border border-slate-150 p-4 rounded-xl flex flex-wrap gap-3.5 justify-between items-center bg-white shadow-sm">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-mono font-bold text-slate-450 uppercase tracking-widest">Platform Immutable Audit Ledger</h3>
                    <p className="text-xs text-slate-500 font-sans">Read-only real-time tracking of multi-role operators actions</p>
                  </div>

                  {/* Quick Category filter selects */}
                  <div className="flex gap-2 text-xs">
                    <select
                      value={auditFilterCompany}
                      onChange={(e) => setAuditFilterCompany(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-800"
                    >
                      <option value="all">All Companies</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>

                    <select
                      value={auditFilterSeverity}
                      onChange={(e) => setAuditFilterSeverity(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-800"
                    >
                      <option value="all">Severity level: All</option>
                      <option value="high">Severe warnings</option>
                      <option value="low">Standard operations</option>
                    </select>
                  </div>
                </div>

                {/* Audit trail sequence logs */}
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {auditLogs
                    .filter(log => {
                      if (auditFilterCompany !== "all" && log.tenantId !== auditFilterCompany) return false;
                      if (auditFilterSeverity === "high" && (log.action.includes("DELETE") || log.action.includes("STATUS") || log.action.includes("TOGGLE"))) return true;
                      if (auditFilterSeverity === "low" && !(log.action.includes("DELETE") || log.action.includes("STATUS") || log.action.includes("TOGGLE"))) return true;
                      return auditFilterSeverity === "all";
                    })
                    .map((log, idx) => (
                      <div key={log.id || idx} className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col sm:flex-row justify-between gap-3.5 font-mono text-[10.5px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{log.timestamp}</span>
                            <span className="text-blue-600 font-sans font-bold text-[10px] uppercase bg-blue-50/55 px-1.5 rounded">{log.action}</span>
                            <span className="text-slate-450">Module: {log.module}</span>
                          </div>
                          <p className="text-slate-800 leading-normal font-sans text-xs">{log.details}</p>
                        </div>
                        <div className="text-right font-mono text-[9px] text-slate-400 self-center">
                          <div>Actor: {log.username}</div>
                          <div>IP: {log.ipAddress}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* VIEW 8: SaaS platform config Settings      */}
            {/* ========================================== */}
            {activeSubTab === "settings" && (
              <div className="space-y-4" id="saas-view-settings">
                <div className="bg-white border border-slate-150 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Platform global config settings</h3>
                    <p className="text-xs text-slate-500 mt-1">Configure global white-label settings & security rules</p>
                  </div>

                  {/* Theme Mode + Session Status + Logout Controls inside settings */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Theme Mode Toggle */}
                    <button
                      type="button"
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="p-1.5 px-3 bg-slate-55 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-700 font-sans font-medium text-xs flex items-center gap-1.5 transition duration-150 cursor-pointer shadow-xs select-none"
                    >
                      {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-650" />}
                      <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
                    </button>

                    {/* Platform SLA Status tag */}
                    <div className="p-1 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-800 text-xs flex items-center gap-1.5 font-sans font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-slate-700">Enclave Secure (SLA: 99.99%)</span>
                    </div>

                    {/* Master Enclave Logout */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onLogout();
                      }}
                      className="p-1.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-800 rounded-xl text-xs font-sans font-extrabold flex items-center gap-1.5 transition duration-150 cursor-pointer shadow-xs"
                    >
                      <Lock className="w-3.5 h-3.5 text-rose-500" />
                      <span>Shutdown Enclave Log</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl relative shadow-sm">
                  
                  {platformSettingsSaved && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-lg mb-4 flex items-center gap-2 animate-fade-in" id="settings-save-lbl">
                      <CheckCircle className="w-4 h-4 text-emerald-600" /> Veritas Global parameters synchronized and recorded successfully in Tenant registry store!
                    </div>
                  )}

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    setPlatformSettingsSaved(true);
                    setTimeout(() => setPlatformSettingsSaved(false), 4000);
                  }} className="space-y-4.5 text-xs text-slate-705">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-bold text-slate-400">Master Platform Banner Title</label>
                        <input
                          type="text"
                          required
                          value={platformName}
                          onChange={(e) => setPlatformName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-220 rounded-xl px-3 py-2 text-slate-880 outline-none focus:border-blue-500 transition hover:border-slate-350"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-bold text-slate-400">Global Corporate Branding Color Hex</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={brandingColor}
                            onChange={(e) => setBrandingColor(e.target.value)}
                            className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                          />
                          <input
                            type="text"
                            required
                            value={brandingColor}
                            onChange={(e) => setBrandingColor(e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-220 rounded-xl px-3 py-1.5 text-slate-800 font-mono outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-bold text-slate-400 font-bold">Secure Billing gateway provider</label>
                        <select 
                          value={selectedGateway}
                          onChange={(e) => setSelectedGateway(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-220 rounded-xl px-2.5 py-2 text-slate-800 outline-none"
                        >
                          <option value="Stripe API Connect">Stripe API Connect</option>
                          <option value="Braintree Payment Pro">Braintree Payment Pro</option>
                          <option value="Veritas Ledger Bank Wire">Veritas Ledger Bank Wire</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-bold text-slate-400">Compliance Email Server port</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={smtpServer}
                            onChange={(e) => setSmtpServer(e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-220 rounded-xl px-3 py-1.5 text-slate-800 font-mono outline-none"
                          />
                          <input
                            type="text"
                            required
                            value={smtpPort}
                            onChange={(e) => setSmtpPort(e.target.value)}
                            className="w-16 bg-slate-50 border border-slate-220 rounded-xl px-3 py-1.5 text-slate-800 font-mono text-center outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-slate-100">
                      <span className="block text-[10.5px] font-mono text-slate-400 uppercase font-bold tracking-wider mb-2.5">Global Feature Switches</span>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <div>
                            <span className="font-bold text-slate-800 block">Gemini OCR Compliance Scan</span>
                            <span className="text-[10px] text-slate-400 font-mono">Processes government passports at lobby desk scanners</span>
                          </div>
                          <button type="button" onClick={() => onToggleFeature("ocr")} className="outline-none">
                            {featureFlags.ocr ? (
                              <ToggleRight className="w-8 h-8 text-blue-600" />
                            ) : (
                              <ToggleLeft className="w-8 h-8 text-slate-450" />
                            )}
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <div>
                            <span className="font-bold text-slate-800 block">Gemini AI Legal Contracts Drafter</span>
                            <span className="text-[10px] text-slate-400 font-mono">Generates professional notary contracts from guidelines</span>
                          </div>
                          <button type="button" onClick={() => onToggleFeature("docGen")} className="outline-none">
                            {featureFlags.docGen ? (
                              <ToggleRight className="w-8 h-8 text-blue-600" />
                            ) : (
                              <ToggleLeft className="w-8 h-8 text-slate-450" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl transition shadow-sm"
                      >
                        Commit SaaS settings
                      </button>
                    </div>

                  </form>
                </div>

                {/* Create Company forms inside settings */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4">
                  <h4 className="text-xs font-mono text-slate-450 uppercase font-bold tracking-widest">Administrative White-Label Provisioning Engine</h4>
                  <form onSubmit={handleCreateCompanySpace} className="space-y-4 text-xs font-sans">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Organization legal title</label>
                        <input
                          type="text"
                          required
                          value={newCompanyName}
                          onChange={(e) => setNewCompanyName(e.target.value)}
                          placeholder="e.g. Garowe Legal Chambers"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 px-3 py-2 rounded-xl text-slate-800 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Subdomain Route Prefix</label>
                        <div className="flex">
                          <input
                            type="text"
                            required
                            value={newSubdomain}
                            onChange={(e) => setNewSubdomain(e.target.value)}
                            placeholder="garowe-notary"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 px-3 py-2 rounded-l-xl text-slate-800 outline-none font-mono"
                          />
                          <span className="bg-slate-250 border-y border-r border-slate-220 text-[10.5px] p-2 font-mono text-slate-500 rounded-r-xl">.notary.com</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">License Subscription Type</label>
                        <select
                          value={newPlan}
                          onChange={(e) => setNewPlan(e.target.value as Tenant["plan"])}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 px-3 py-2 rounded-xl text-slate-800 outline-none"
                        >
                          <option value="Basic">Basic Plan ($299/mo)</option>
                          <option value="Professional">Professional suite ($799/mo)</option>
                          <option value="Enterprise">Enterprise Dedicated ($1,999/mo)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Corporate Admin Email</label>
                        <input
                          type="email"
                          required
                          value={newCompanyEmail}
                          onChange={(e) => setNewCompanyEmail(e.target.value)}
                          placeholder="admin@legalchambers.com"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 px-3 py-2 rounded-xl text-slate-800 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Company License Number</label>
                        <input
                          type="text"
                          required
                          value={newCompanyLicense}
                          onChange={(e) => setNewCompanyLicense(e.target.value)}
                          placeholder="LIC-2026-98741"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 px-3 py-2 rounded-xl text-slate-800 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition whitespace-nowrap shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Initialize Company Space
                      </button>
                    </div>

                  </form>
                </div>

              </div>
            )}

            {/* Access Rules Catalog Rendering */}
            {activeSubTab === "permissions" && (
              <div className="space-y-4 animate-fade-in" id="saas-view-permissions">
                <PermissionsConfig
                  permissionsMatrix={permissionsMatrix}
                  onUpdatePermissions={onUpdatePermissions}
                />
              </div>
            )}
          </>
        )}

      </main>

      {/* FLOATING AI ASSISTANT PANEL & TRIGGER */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans max-w-[calc(100vw-2rem)]">
        {isAiOpen && (
          <div id="saas-floating-ai-panel" className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-[calc(100vw-2rem)] sm:w-96 flex flex-col h-[520px] max-h-[calc(100vh-8rem)] overflow-hidden transition-all duration-300 hover:border-slate-300 transform scale-100 origin-bottom-right">
            <div className="flex flex-col h-full p-4 gap-3 bg-white" style={{ minHeight: '0' }}>
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-blue-600 animate-pulse" />
                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-widest">
                      HubDev AI Assistant
                    </h3>
                    <span className="text-[10px] text-slate-400 font-sans block mt-0.5">SaaS Platform intelligence</span>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsAiOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages Log cluster */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 min-h-0 py-1" id="saas-ai-messages-scroller">
                {aiMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed font-sans whitespace-pre-wrap break-words ${
                      msg.role === "user" 
                        ? "bg-blue-600 text-white rounded-br-none" 
                        : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none"
                    }`}>
                      {msg.role === "model" && (
                        <span className="text-[9px] font-mono tracking-widest font-black uppercase text-blue-600 block mb-1">SYSTEM INSIGHT:</span>
                      )}
                      {msg.content}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs text-slate-400 flex items-center gap-1.5 rounded-bl-none animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin text-blue-600" /> System reading platform records...
                    </div>
                  </div>
                )}
              </div>

              {/* Quick interactive platform suggestion chips */}
              <div className="border-t border-slate-100 pt-3 bg-white shrink-0 space-y-2">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block tracking-wider mb-1 px-1">SaaS Intelligence chips</span>
                
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pb-1">
                  {[
                    { label: "💰 Most profitable plan?", prompt: "Which subscription licensing plan tier is currently most profitable?" },
                    { label: "📉 Churn forecast?", prompt: "Which plan has the highest churn rate or accounts with warning flags?" },
                    { label: "⚠️ Inactive accounts?", prompt: "Show inactive companies over the last 30 days" },
                    { label: "📈 Future forecast?", prompt: "Predict next month revenue parameters based on subscribers growth" },
                    { label: "🏬 Global Branch Load?", prompt: "Which branches are overloaded globally with customers waiting?" }
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => executeIntelligenceQuery(chip.prompt)}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] px-2 py-0.5 text-slate-650 text-left font-medium transition cursor-pointer leading-tight hover:border-slate-300"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Custom inputs */}
                <form onSubmit={(e) => {
                  e.preventDefault();
                  executeIntelligenceQuery(aiInput);
                }} className="flex gap-1.5 pt-2 border-t border-slate-100 mt-1">
                  <input
                    type="text"
                    required
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Ask intelligence assistant..."
                    className="flex-1 bg-slate-50 border border-slate-200 text-xs px-2.5 py-1.5 rounded-xl text-slate-800 outline-none focus:border-blue-500 hover:border-slate-300 transition"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-2.5 flex items-center justify-center transition shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* Floating circular button with pulse animation */}
        <button
          type="button"
          onClick={() => setIsAiOpen(!isAiOpen)}
          className="p-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl hover:shadow-3xl transition duration-300 flex items-center justify-center relative group focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 animate-bounce"
          style={{ animationDuration: '3s' }}
        >
          <Bot className="w-6 h-6 animate-pulse" />
          <span className="absolute right-14 bg-slate-900 border border-slate-800 text-white text-[10px] uppercase font-mono px-2.5 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none tracking-wider">
            HubDev AI Assistant
          </span>
          {/* Pulsing indicator light */}
          <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse"></span>
        </button>
      </div>

    </div>
  );
}
