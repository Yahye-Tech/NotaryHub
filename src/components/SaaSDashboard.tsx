import React, { useState, useRef, useEffect } from "react";
import { 
  Building2, Users, Receipt, ShieldAlert, Cpu, 
  Sparkles, Bot, Clock, Volume2, ShieldCheck, HelpCircle, 
  Send, RefreshCw, Layers, Database, Lock, ShieldQuestion, Play,
  ArrowLeft, ChevronRight, Check, Copy, Fingerprint, Shield
} from "lucide-react";

// Import modular portal components
import SuperAdminPortal from "./SuperAdminPortal";
import CompanyAdminPortal from "./CompanyAdminPortal";
import BranchAdminPortal from "./BranchAdminPortal";
import EmployeePortal from "./EmployeePortal";
import CustomerPortal from "./CustomerPortal";
import TenantLoginForm from "./TenantLoginForm";
import PermissionsConfig, { PermissionsMatrix, PermissionKey, Role } from "./PermissionsConfig";

import { Tenant, Branch, Employee, QueueTicket, NotaryDocument, Invoice, AuditLog, MetricPoint, Appointment } from "../types";

const generateUniqueId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000550)}`;
};

export interface ActiveUser {
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "BRANCH_ADMIN" | "EMPLOYEE" | "CUSTOMER";
  username: string;
  email: string;
  tenantId?: string;
  branchId?: string;
  employeeId?: string;
  extraInfo?: string;
}

const TENANT_THEMES: Record<string, {
  name: string;
  logoIcon: string;
  badgeText: string;
  gradientFrom: string;
  gradientTo: string;
  buttonClass: string;
  bgClass: string;
  badgeClass: string;
  ringClass: string;
  accentText: string;
  bannerText: string;
  hexColor: string;
  logoUrl: string;
  welcomeContext: string;
}> = {
  "ten-01": {
    name: "Bosaso Notary Services",
    logoIcon: "⚖️",
    badgeText: "BOSASO METRO WORKSPACE",
    gradientFrom: "from-blue-600",
    gradientTo: "to-indigo-700",
    buttonClass: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 shadow-md hover:shadow-blue-200",
    bgClass: "bg-gradient-to-br from-blue-50/50 via-slate-50 to-indigo-50/50",
    badgeClass: "bg-blue-50 border-blue-200 text-blue-700",
    ringClass: "focus:border-blue-450 focus:ring-blue-100",
    accentText: "text-blue-600",
    bannerText: "Federal Trust & Notarial Ledger Isolation Node",
    hexColor: "#2563eb",
    logoUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=350&q=80",
    welcomeContext: "Access the premier legal notarization workspace of Bosaso. Verify deeds, physical signatures, and synchronize records onto the Puntland cryptographic ledger system."
  },
  "ten-02": {
    name: "Puntland Legal Bureau",
    logoIcon: "🛡️",
    badgeText: "PUNTLAND COMPLIANCE HUB",
    gradientFrom: "from-emerald-600",
    gradientTo: "to-teal-700",
    buttonClass: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 shadow-md hover:shadow-emerald-200",
    bgClass: "bg-gradient-to-br from-emerald-50/50 via-slate-50 to-teal-50/50",
    badgeClass: "bg-emerald-50 border-emerald-200 text-emerald-700",
    ringClass: "focus:border-emerald-450 focus:ring-emerald-100",
    accentText: "text-emerald-600",
    bannerText: "Constitutional Court Deed Archival Node",
    hexColor: "#059669",
    logoUrl: "https://images.unsplash.com/photo-1450280786055-b7700f682155?auto=format&fit=crop&w=350&q=80",
    welcomeContext: "Corporate identity verification depot for localized Puntland courts. Authorize, seal, and register digital instruments under physical and digital witness protocols."
  },
  "ten-03": {
    name: "Horn Africa Notary",
    logoIcon: "⭐",
    badgeText: "HORN OF AFRICA REGISTRY",
    gradientFrom: "from-amber-600",
    gradientTo: "to-orange-700",
    buttonClass: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 shadow-md hover:shadow-amber-200",
    bgClass: "bg-gradient-to-br from-amber-50/50 via-slate-50 to-orange-50/50",
    badgeClass: "bg-amber-50 border-amber-200 text-amber-750",
    ringClass: "focus:border-amber-450 focus:ring-amber-100",
    accentText: "text-amber-600",
    bannerText: "Regional Trade & Notarial Signatures Node",
    hexColor: "#d97706",
    logoUrl: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=350&q=80",
    welcomeContext: "Securing interstate trade deeds and high-value maritime cargo affidavits. Direct liaison with commercial boards across the entire Horn of Africa."
  },
  "ten-04": {
    name: "Somali Legal Solutions",
    logoIcon: "🌐",
    badgeText: "SCS DIGITAL SECURE PORTAL",
    gradientFrom: "from-violet-600",
    gradientTo: "to-purple-700",
    buttonClass: "bg-violet-600 hover:bg-violet-700 focus:ring-violet-500 shadow-md hover:shadow-violet-200",
    bgClass: "bg-gradient-to-br from-violet-50/50 via-slate-50 to-purple-50/50",
    badgeClass: "bg-violet-50 border-violet-200 text-violet-700",
    ringClass: "focus:border-violet-450 focus:ring-violet-100",
    accentText: "text-violet-600",
    bannerText: "Unified Legal Services Cloud Directory",
    hexColor: "#7c3aed",
    logoUrl: "https://images.unsplash.com/photo-1521791136368-1a46827d0515?auto=format&fit=crop&w=350&q=80",
    welcomeContext: "Modern digital signature verification, real estate titling escrows, and civil witness registry for tech-powered Somali business spaces."
  }
};

interface UnifiedLoginGatewayProps {
  tenants: Tenant[];
  branches: Branch[];
  employees: Employee[];
  appointments: Appointment[];
  documents: NotaryDocument[];
  invoices: Invoice[];
  onLogin: (user: ActiveUser) => void;
}

function UnifiedLoginGateway({ tenants, branches, employees, appointments, documents, invoices, onLogin }: UnifiedLoginGatewayProps) {
  const [loginMode, setLoginMode] = useState<"landing" | "tenant" | "super-admin">("landing");
  const [selectedTenantId, setSelectedTenantId] = useState<string>("ten-01");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);
  const [showHelpers, setShowHelpers] = useState(true);

  const activeTenantTheme = TENANT_THEMES[selectedTenantId] || TENANT_THEMES["ten-01"];

  // Dynamic role and credentials resolver (Requirement 3, 5, 6)
  const resolveUser = (input: string, tenantId: string, currentMode: "tenant" | "super-admin"): ActiveUser | null => {
    const query = input.trim().toLowerCase();
    if (!query) return null;

    // Isolate Super Admin Portal logic (Requirement 1)
    if (currentMode === "super-admin") {
      if (["admin@hubdev.co", "root@hubdev.co", "super-admin-root", "admin", "superadmin"].includes(query)) {
        return {
          role: "SUPER_ADMIN",
          username: "Super Admin Root",
          email: "root@hubdev.co",
          extraInfo: "Access Clearance Node: Level 1 (Infrastructure Master)"
        };
      }
      return null;
    }

    // Tenant Shared Portal logic (Requirement 2, 3)
    if (tenants.length === 0) {
      return null; // Empty database - no active tenant portal access allowed
    }

    const t = tenants.find(ten => ten.id === tenantId) || tenants[0];
    if (!t) return null;

    // 1. Company Admin
    if (
      query === `admin@${t.subdomain}.com` || 
      query === t.subdomain || 
      query === `admin@${t.subdomain}.notary.com` ||
      query === `admin@${t.id}.com` ||
      query === "admin" ||
      query === "companyadmin" ||
      query === "company-admin"
    ) {
      return {
        role: "COMPANY_ADMIN",
        username: `Corp Admin (${t.name})`,
        email: `admin@${t.subdomain}.com`,
        tenantId: t.id,
        extraInfo: `SaaS Corporation ID: ${t.id}`
      };
    }

    // 2. Branch Admin (Supervisor) - Restricted to the selected tenant
    const tenantBranches = branches.filter(b => b.tenantId === t.id);
    if (tenantBranches.length > 0) {
      for (const br of tenantBranches) {
        const slugName = br.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        if (
          query === `supervisor@${slugName}.com` || 
          query === `supervisor@${br.id}.com` || 
          query === `manager@${slugName}.com` ||
          query === `supervisor@${br.name.toLowerCase().replace(/\s+/g, "-")}.com` ||
          query === "supervisor" ||
          query === "branchadmin" ||
          query === "branch-admin"
        ) {
          return {
            role: "BRANCH_ADMIN",
            username: `Branch Manager (${br.name})`,
            email: `supervisor@${br.id}.com`,
            tenantId: br.tenantId,
            branchId: br.id,
            extraInfo: `Authorized Supervisor: ${br.name}`
          };
        }
      }
    }

    // 3. Employee (Counter Clerk) - Restricted to the selected tenant
    const tenantBranchIds = tenantBranches.map(b => b.id);
    const tenantEmployees = employees.filter(e => tenantBranchIds.includes(e.branchId));
    
    if (tenantEmployees.length > 0) {
      const matchingEmployee = tenantEmployees.find(e => e.email.toLowerCase() === query || e.name.toLowerCase() === query)
        || (query === "employee" || query === "clerk" ? tenantEmployees[0] : null);

      if (matchingEmployee) {
        const br = branches.find(b => b.id === matchingEmployee.branchId);
        return {
          role: "EMPLOYEE",
          username: matchingEmployee.name,
          email: matchingEmployee.email,
          tenantId: br?.tenantId || t.id,
          branchId: matchingEmployee.branchId,
          employeeId: matchingEmployee.id,
          extraInfo: `Duty Officer — Counter Desk ${matchingEmployee.assignedCounter || 2}`
        };
      }
    }

    // 4. Client (Customer) - Requires actual customer record or demo data present
    const hasCustomerData = appointments.length > 0 || documents.length > 0 || invoices.length > 0;
    if (hasCustomerData) {
      // Direct matching on active logs
      const matchingAppt = appointments.find(ap => 
        (ap.customerEmail.toLowerCase() === query || ap.customerName.toLowerCase() === query) &&
        branches.some(b => b.id === ap.branchId && b.tenantId === t.id)
      );

      if (matchingAppt) {
        return {
          role: "CUSTOMER",
          username: matchingAppt.customerName,
          email: matchingAppt.customerEmail,
          tenantId: t.id,
          extraInfo: `Secure Client Portal Node (${t.name})`
        };
      }

      const matchingInv = invoices.find(inv => 
        inv.customerName.toLowerCase().includes(query) &&
        (!inv.branchId || branches.some(b => b.id === inv.branchId && b.tenantId === t.id))
      );

      if (matchingInv) {
        const cleanName = matchingInv.customerName.split("/")[0].trim();
        return {
          role: "CUSTOMER",
          username: cleanName,
          email: query.includes("@") ? query : "client@veritas.com",
          tenantId: t.id,
          extraInfo: `Secure Client Portal Node (${t.name})`
        };
      }

      // Predefined Demo Customers
      if (
        query === "arthur@pendelton-legal.org" || 
        query === "arthur" || 
        query === "arthur pendelton"
      ) {
        return {
          role: "CUSTOMER",
          username: "Arthur Pendelton",
          email: "arthur@pendelton-legal.org",
          tenantId: t.id,
          extraInfo: `Secure Client Portal Node (${t.name})`
        };
      }

      if (
        query === "alex@westmoreland-holdings.co" || 
        query === "alex" || 
        query === "alexander westmoreland"
      ) {
        return {
          role: "CUSTOMER",
          username: "Alexander Westmoreland",
          email: "alex@westmoreland-holdings.co",
          tenantId: t.id,
          extraInfo: `Secure Client Portal Node (${t.name})`
        };
      }

      if (query === "robert@led-zepp.co.uk" || query === "robert" || query === "robert plant") {
        return {
          role: "CUSTOMER",
          username: "Robert Plant",
          email: "robert@led-zepp.co.uk",
          tenantId: t.id,
          extraInfo: `Secure Client Portal Node (${t.name})`
        };
      }
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    setTimeout(() => {
      const resolved = resolveUser(usernameOrEmail, selectedTenantId, loginMode === "super-admin" ? "super-admin" : "tenant");

      if (!resolved) {
        if (loginMode === "super-admin") {
          setErrorMsg("Access Denied: The requested credentials hold no HubDev SaaS Root Authority clearance.");
        } else {
          setErrorMsg(`Authorization Failed: Credentials could not be matched against any registered principal schema inside ${activeTenantTheme.name}.`);
        }
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onLogin(resolved);
        setSubmitting(false);
        setSuccess(false);
      }, 650);
    }, 750);
  };

  // Helper autofiller to speed up client review and testing
  const triggerAutoFill = (mode: "tenant" | "super-admin", tenantId: string, emailStr: string) => {
    setLoginMode(mode);
    setSelectedTenantId(tenantId);
    setUsernameOrEmail(emailStr);
    setPassword("••••••••••••");
    setErrorMsg(null);
    setForgotStatus(null);
  };

  return (
    <div className="flex-1 w-full flex flex-col justify-center items-center py-12 px-4 font-sans select-none" id="hybrid-auth-portal">
      
      {/* 1. SEPARATE CORE LANDING / SELECTOR (Requirement 1, 2) */}
      {loginMode === "landing" && (
        <div className="w-full max-w-4xl space-y-8 animate-fade-in text-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-500 font-medium mb-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
              HubDev Notary Identity & Access System v4.12
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-sans sm:text-4xl">
              HubDev Notary Bureau Operations
            </h1>
            <p className="text-slate-500 text-sm max-w-lg mx-auto mt-2 leading-relaxed">
              Log in to secure, cryptographically sandboxed workspaces designed for legal offices, counters, and public client notarizations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* Left Card: Client and Shared Tenant Logins */}
            <button 
              onClick={() => {
                setLoginMode("tenant");
                setErrorMsg(null);
                setForgotStatus(null);
              }}
              className="group text-left bg-white border border-slate-200 hover:border-blue-500 rounded-3xl p-8 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center transition-all group-hover:bg-blue-600 group-hover:text-white">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-sans group-hover:text-blue-600 transition-colors">
                    Tenant Partner Portal
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Access workspaces reserved for corporate accounts, branch supervisors, counter clerks, and public client lobbies. Determines your role automatically.
                  </p>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-1.5 text-xs text-blue-650 font-bold group-hover:translate-x-1 duration-200">
                <span>Enter Workspace Gateway</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            {/* Right Card: Super Admin Portal Restricted Layout */}
            <button 
              onClick={() => {
                setLoginMode("super-admin");
                setErrorMsg(null);
                setForgotStatus(null);
              }}
              className="group text-left bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/10 group-hover:bg-amber-500 group-hover:text-slate-950">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-sans group-hover:text-amber-400 transition-colors">
                    SaaS Infrastructure Core
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Restricted owner terminal reserved exclusively for the SaaS Owner, platform telemetry audits, licensing compliance managers, and database global schema partition control.
                  </p>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-1.5 text-xs text-amber-400 font-bold group-hover:translate-x-1 duration-200">
                <span className="font-mono tracking-wider">SECURE CONSOLE ONLY</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

          </div>
        </div>
      )}

      {/* 2. DYNAMIC SHOWN TENANT GATEWAY (Requirement 2, 4) */}
      {loginMode === "tenant" && (
        <div className="flex flex-col items-center gap-6 animate-fade-in w-full max-w-4xl">
          {tenants.length === 0 ? (
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-[28px] p-8 shadow-xl text-center space-y-4 font-sans">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Workspace Ledger is Slate-Cleaned</h2>
              <p className="text-xs text-slate-500 leading-normal">
                You have completely wiped the Veritas database. No corporate company workspaces, physical bureaus, or customer registries exist.
              </p>
              <div className="bg-amber-50/70 border border-amber-100 text-[11px] text-amber-800 p-4 rounded-2xl leading-relaxed text-left space-y-1.5">
                <p className="font-bold">To continue testing, please either:</p>
                <p>1. Click the blue <strong className="text-blue-600 font-extrabold">"Load Demo Data"</strong> button in the bottom-right developer hub to restore fully-manned multi-tenant bureaus.</p>
                <p>2. Connect via the <strong className="text-slate-900 font-extrabold">"SaaS Infrastructure Core"</strong> gateway to register custom corporations.</p>
              </div>
              <button
                type="button"
                onClick={() => setLoginMode("landing")}
                className="mt-2 inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-xs px-4 py-2 text-slate-700 rounded-xl font-bold transition select-none cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Gateways</span>
              </button>
            </div>
          ) : (
            <>
              {/* Tenant Selector Switcher for Preview Testing */}
              <div className="bg-white/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-200 flex items-center gap-3 shadow-xs text-xs font-semibold text-slate-700">
                <span>Selected Active Workspace:</span>
                <div className="relative">
                  <select
                    value={selectedTenantId}
                    onChange={(e) => {
                      setSelectedTenantId(e.target.value);
                      setErrorMsg(null);
                      setForgotStatus(null);
                    }}
                    className="bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs px-3.5 py-1.5 rounded-lg text-slate-800 outline-none transition cursor-pointer appearance-none pr-8 font-semibold"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
                </div>
              </div>

              <TenantLoginForm
                tenantLogo={activeTenantTheme.logoUrl}
                tenantName={activeTenantTheme.name}
                tenantColor={activeTenantTheme.hexColor}
                welcomeContext={activeTenantTheme.welcomeContext}
                usernameOrEmail={usernameOrEmail}
                setUsernameOrEmail={setUsernameOrEmail}
                password={password}
                setPassword={setPassword}
                submitting={submitting}
                onSubmit={handleSubmit}
                errorMsg={errorMsg}
                forgotStatus={forgotStatus}
                setForgotStatus={setForgotStatus}
                onBack={() => setLoginMode("landing")}
                success={success}
              />
            </>
          )}
        </div>
      )}

      {/* 3. SEPARATED SUPER ADMIN PORTAL CARD (Requirement 1) */}
      {loginMode === "super-admin" && (
        <div className="w-full max-w-md bg-slate-950/40 backdrop-blur-3xl border border-slate-800/80 rounded-[32px] p-2.5 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.8),0_0_50px_-12px_rgba(245,158,11,0.15)] transition-all duration-500 animate-fade-in text-left relative overflow-hidden" id="super-admin-master-terminal">
          
          {/* Subtle Glowing Radial Backdrops for elegant lighting */}
          <div className="absolute -right-24 -top-24 w-60 h-60 rounded-full bg-amber-500/10 pointer-events-none blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 w-52 h-52 rounded-full bg-slate-900 pointer-events-none blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-amber-500/5 pointer-events-none blur-2xl"></div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-[22px] overflow-hidden p-8 sm:p-10 flex flex-col justify-between relative z-10">
            
            {/* Top Interactive Vault Indicator */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-slate-800/60 mb-8 space-y-4">
              <div className="relative group">
                {/* Radiant border ring */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 opacity-30 blur-md group-hover:opacity-55 transition duration-500"></div>
                <div className="relative w-14 h-14 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner text-amber-400">
                  <Fingerprint className="w-7 h-7 text-amber-500 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] font-mono tracking-[0.2em] px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/25 text-amber-400 inline-block font-extrabold uppercase">
                  SaaS Sovereign Terminal
                </span>
                <h2 className="text-xl font-bold text-white font-sans tracking-tight">
                  HubDev Root Authority
                </h2>
                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                  Authentication requires active cryptographic session credentials allocated directly to the platform owners.
                </p>
              </div>
            </div>

            {/* Error notifications with dark-cyber aesthetic */}
            {errorMsg && (
              <div className="bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs p-4 rounded-xl mb-6 flex items-start gap-2 text-left animate-fade-in">
                <ShieldAlert className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-normal">{errorMsg}</span>
              </div>
            )}

            {ForgotStatusElement(forgotStatus, setForgotStatus)}

            {success ? (
              <div className="py-12 text-center space-y-4 animate-fade-in flex flex-col items-center">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-full bg-amber-400/20 blur-md animate-ping"></div>
                  <div className="relative inline-flex p-4 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/30">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                </div>
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Passcode Hash Accepted</h4>
                <p className="text-[11px] text-slate-500 font-mono">Routing key to core database cluster...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Username Input with unique futuristic styling */}
                <div className="space-y-2 text-left">
                  <label className="block text-[9px] text-slate-400 font-mono uppercase font-bold tracking-widest">
                    ROOT DIRECTORY EMAIL OR KEY ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Users className="w-4 h-4 text-amber-500/40" />
                    </div>
                    <input
                      type="text"
                      required
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-850 hover:bg-slate-950/90 focus:border-amber-500/60 text-amber-400 placeholder-slate-650 pl-10 pr-4 py-3 text-xs font-mono outline-none rounded-xl transition duration-200"
                      placeholder="root@hubdev.co"
                    />
                  </div>
                </div>

                {/* Passphrase Input */}
                <div className="space-y-2 text-left">
                  <div className="flex justify-between items-center">
                    <label className="block text-[9px] text-slate-400 font-mono uppercase font-bold tracking-widest">
                      ROOT PASSCODE CRYPTOGRAPHIC KEY
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4 text-amber-500/40" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 hover:bg-slate-950/90 focus:border-amber-500/60 text-slate-200 placeholder-slate-650 pl-10 pr-4 py-3 text-xs font-mono outline-none rounded-xl transition duration-200"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                {/* Submit button with golden ambient sheen */}
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:brightness-115 active:scale-[99%] text-slate-950 font-mono font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition duration-200 hover:shadow-[0_4px_20px_rgba(245,158,11,0.25)] select-none uppercase tracking-wider"
                >
                  <Shield className="w-4.5 h-4.5 text-slate-950" />
                  <span>DECRYPT MASTER INSTANCE</span>
                </button>
              </form>
            )}

            {/* Back action */}
            <div className="mt-8 pt-5 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setLoginMode("landing")}
                className="text-slate-400 hover:text-white flex items-center gap-1.5 transition hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Gateways</span>
              </button>
              <span className="text-slate-500 uppercase tracking-widest font-bold">SOVEREIGN CORE</span>
            </div>

          </div>
        </div>
      )}

      {/* 4. SANDBOX TESTING HELPER DIRECTORY PANEL (click triggers auto-login logic) */}
      <div className="w-full max-w-4xl mt-10 p-0.5 bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden shadow-md">
        <div className="bg-white rounded-[14px] p-4 text-left">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pb-3 border-b border-on-slate border-slate-100">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-slate-900 font-sans">🔑 Sandbox Auth Directory (Instant Auto-Fill Testing Console)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowHelpers(!showHelpers)}
              className="text-xs text-blue-600 font-bold hover:underline cursor-pointer select-none"
            >
              {showHelpers ? "Hide Sandbox Directory" : "Show Sandbox Directory"}
            </button>
          </div>

          {showHelpers && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4 text-xs select-text animate-fade-in">
              
              {/* Box 1: Super Admin */}
              <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[8.5px] font-mono bg-slate-955 bg-slate-900 text-white font-bold px-1.5 py-0.5 rounded uppercase">ROOT SECTOR</span>
                  <p className="font-sans font-bold text-slate-950 mt-1.5">SaaS Owner</p>
                  <p className="font-mono text-[10px] text-slate-500 mt-1 select-all break-all leading-normal">root@hubdev.co</p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerAutoFill("super-admin", "ten-01", "root@hubdev.co")}
                  className="mt-3 w-full bg-slate-900 hover:bg-slate-850 text-[10px] text-white py-1.5 px-2 rounded-lg font-bold transition text-center hover:scale-[102%] active:scale-95"
                >
                  Auto-Fill SaaS Root
                </button>
              </div>

              {/* Box 2: Bosaso Company Admin */}
              <div className="bg-blue-50/50 border border-blue-100 p-2.5 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[8.5px] font-mono bg-blue-50 text-blue-700 border border-blue-150 font-bold px-1.5 py-0.5 rounded uppercase">BOSASO OFFICE</span>
                  <p className="font-sans font-bold text-slate-950 mt-1.5">Company Admin</p>
                  <p className="font-mono text-[10px] text-slate-500 mt-1 select-all break-all leading-normal">admin@bosaso-notary.com</p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerAutoFill("tenant", "ten-01", "admin@bosaso-notary.com")}
                  className="mt-3 w-full bg-blue-600 hover:bg-blue-750 text-[10px] text-white py-1.5 px-2 rounded-lg font-bold transition text-center hover:scale-[102%] active:scale-95"
                >
                  Auto-Fill Bosaso Admin
                </button>
              </div>

              {/* Box 3: Bosaso Branch Supervisor */}
              <div className="bg-blue-50/50 border border-blue-100 p-2.5 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[8.5px] font-mono bg-blue-50 text-blue-700 border border-blue-150 font-bold px-1.5 py-0.5 rounded uppercase font-sans">BOSASO B1</span>
                  <p className="font-sans font-bold text-slate-950 mt-1.5">Branch Manager</p>
                  <p className="font-mono text-[10px] text-slate-500 mt-1 select-all break-all leading-normal">supervisor@br-01.com</p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerAutoFill("tenant", "ten-01", "supervisor@br-01.com")}
                  className="mt-3 w-full bg-indigo-600 hover:bg-indigo-750 text-[10px] text-white py-1.5 px-2 rounded-lg font-bold transition text-center hover:scale-[102%] active:scale-95"
                >
                  Auto-Fill Manager
                </button>
              </div>

              {/* Box 4: Clerk */}
              <div className="bg-indigo-50/30 border border-indigo-150 p-2.5 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[8.5px] font-mono bg-indigo-100 text-indigo-805 font-bold px-1.5 py-0.5 rounded uppercase">BOSASO B1 CLERK</span>
                  <p className="font-sans font-bold text-slate-950 mt-1.5">Employee Officer</p>
                  <p className="font-mono text-[10px] text-slate-500 mt-1 select-all break-all leading-normal">m.vance@bosaso-notary.com</p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerAutoFill("tenant", "ten-01", "m.vance@bosaso-notary.com")}
                  className="mt-3 w-full bg-slate-800 hover:bg-slate-900 text-[10px] text-white py-1.5 px-2 rounded-lg font-bold transition text-center hover:scale-[102%] active:scale-95"
                >
                  Auto-Fill Clerk Vance
                </button>
              </div>

              {/* Box 5: Customer Client */}
              <div className="bg-purple-50/50 border border-purple-100 p-2.5 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[8.5px] font-mono bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded uppercase">PUBLIC CLIENT</span>
                  <p className="font-sans font-bold text-slate-950 mt-1.5">Arthur Pendelton</p>
                  <p className="font-mono text-[10px] text-slate-500 mt-1 select-all break-all leading-normal">arthur@pendelton-legal.org</p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerAutoFill("tenant", "ten-01", "arthur@pendelton-legal.org")}
                  className="mt-3 w-full bg-purple-600 hover:bg-purple-750 text-[10px] text-white py-1.5 px-2 rounded-lg font-bold transition text-center hover:scale-[102%] active:scale-95"
                >
                  Auto-Fill Customer
                </button>
              </div>

            </div>
          )}

          {/* Toggle status indicator */}
          <div className="mt-3.5 pt-3.5 border-t border-slate-100 text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 justify-between font-medium">
            <span>💡 Quick Test Hint: Try switching the select-tenant dropdown above to <b>&quot;Puntland Legal Bureau&quot;</b> or <b>&quot;Somali Legal Solutions&quot;</b> - see the entire auth portal live-brand instantly!</span>
            <span className="hidden leading-normal text-[10.5px] sm:block">Commission Code HubDev compliance OK</span>
          </div>

        </div>
      </div>

    </div>
  );
}

function ForgotStatusElement(forgotStatus: string | null, setForgotStatus: (v: string | null) => void) {
  if (!forgotStatus) return null;
  return (
    <div className="bg-blue-950 border border-blue-800 text-blue-300 text-xs p-3.5 rounded-xl mb-5 flex items-start justify-start gap-2 text-left">
      <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
      <span>{forgotStatus}</span>
    </div>
  );
}

export default function SaaSDashboard() {
  const [currentUser, setCurrentUser] = useState<ActiveUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Mock global multi-tenant database state
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    try {
      const saved = localStorage.getItem("veritas_tenants");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedTenantId, setSelectedTenantId] = useState<string>(() => {
    return localStorage.getItem("veritas_selectedTenantId") || "";
  });

  const [branches, setBranches] = useState<Branch[]>(() => {
    try {
      const saved = localStorage.getItem("veritas_branches");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem("veritas_employees");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem("veritas_appointments");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [queue, setQueue] = useState<QueueTicket[]>(() => {
    try {
      const saved = localStorage.getItem("veritas_queue");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [documents, setDocuments] = useState<NotaryDocument[]>(() => {
    try {
      const saved = localStorage.getItem("veritas_documents");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem("veritas_invoices");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Master write-only audit trial tracking structure
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem("veritas_auditLogs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Telemetry stream logs
  const [metrics, setMetrics] = useState<MetricPoint[]>([
    { time: "11:10", requests: 12, cpu: 5, queueTime: 8, activeUsers: 2 },
    { time: "11:11", requests: 18, cpu: 8, queueTime: 7, activeUsers: 4 },
    { time: "11:12", requests: 25, cpu: 14, queueTime: 9, activeUsers: 5 },
    { time: "11:13", requests: 30, cpu: 11, queueTime: 8, activeUsers: 6 },
    { time: "11:14", requests: 22, cpu: 9, queueTime: 8, activeUsers: 5 }
  ]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem("veritas_tenants", JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    localStorage.setItem("veritas_selectedTenantId", selectedTenantId);
  }, [selectedTenantId]);

  useEffect(() => {
    localStorage.setItem("veritas_branches", JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem("veritas_employees", JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem("veritas_appointments", JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem("veritas_queue", JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    localStorage.setItem("veritas_documents", JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem("veritas_invoices", JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem("veritas_auditLogs", JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Quick Action triggers for clearing/loading
  const handleWipeDatabase = () => {
    // Clear React states
    setTenants([]);
    setSelectedTenantId("");
    setBranches([]);
    setEmployees([]);
    setAppointments([]);
    setQueue([]);
    setDocuments([]);
    setInvoices([]);
    setAuditLogs([]);
    setCurrentUser(null);
    setActiveTab("dashboard");

    // Clear Local Storage explicitly
    localStorage.removeItem("veritas_tenants");
    localStorage.removeItem("veritas_selectedTenantId");
    localStorage.removeItem("veritas_branches");
    localStorage.removeItem("veritas_employees");
    localStorage.removeItem("veritas_appointments");
    localStorage.removeItem("veritas_queue");
    localStorage.removeItem("veritas_documents");
    localStorage.removeItem("veritas_invoices");
    localStorage.removeItem("veritas_auditLogs");

    alert("⚡ VERITAS DATABASE WIPED PERMANENTLY:\n\nAll session logins have been terminated. Every corporate account, office branch, assigned counter, clerk credential, contract log, and client booking has been wiped permanently.");
  };

  const handleLoadMockData = () => {
    setTenants([
      { id: "ten-01", name: "Bosaso Notary Services", subdomain: "bosaso-notary", status: "active", createdAt: "2026-01-10", plan: "Enterprise", dbSize: "148.2 MB", cpuUsage: 0.12, is_deleted: false, email: "info@bosaso.com", license_number: "LIC-2026-001" },
      { id: "ten-02", name: "Puntland Legal Bureau", subdomain: "puntland-legal", status: "active", createdAt: "2026-02-14", plan: "Professional", dbSize: "44.1 MB", cpuUsage: 0.05, is_deleted: false, email: "info@puntland.com", license_number: "LIC-2026-002" },
      { id: "ten-03", name: "Horn Africa Notary", subdomain: "horn-africa", status: "suspended", createdAt: "2026-04-01", plan: "Basic", dbSize: "1.2 MB", cpuUsage: 0.00, is_deleted: false, email: "info@hornafrica.com", license_number: "LIC-2026-003" },
      { id: "ten-04", name: "Somali Legal Solutions", subdomain: "somali-legal", status: "active", createdAt: "2026-05-02", plan: "Professional", dbSize: "28.4 MB", cpuUsage: 0.08, is_deleted: false, email: "info@somalilegal.com", license_number: "LIC-2026-004" }
    ]);
    setSelectedTenantId("ten-01");
    setBranches([
      { id: "br-01", tenantId: "ten-01", name: "Bosaso Main Branch", address: "Kismayo Street, Central Bosaso", phone: "+252 90 779 1234", countersCount: 4, activeEmployees: 3, currentQueueLength: 4, is_deleted: false },
      { id: "br-02", tenantId: "ten-01", name: "Garowe Corporate Office", address: "Mogadishu Highway, Garowe", phone: "+252 90 779 5678", countersCount: 2, activeEmployees: 2, currentQueueLength: 0, is_deleted: false },
      { id: "br-03", tenantId: "ten-02", name: "Galkayo Witness Hub", address: "Afgoye Road, Galkayo", phone: "+252 90 779 9999", countersCount: 3, activeEmployees: 1, currentQueueLength: 1, is_deleted: false },
      { id: "br-04", tenantId: "ten-04", name: "Mogadishu Counter", address: "Lido Beach Road, Mogadishu", phone: "+252 90 700 1122", countersCount: 2, activeEmployees: 1, currentQueueLength: 0, is_deleted: false }
    ]);
    setEmployees([
      { id: "emp-01", branchId: "br-01", name: "Michael Vance", email: "m.vance@bosaso-notary.com", role: "NOTARY_OFFICER", status: "available", assignedCounter: 2, is_deleted: false },
      { id: "emp-02", branchId: "br-01", name: "Elena Rostova", email: "e.rostova@bosaso-notary.com", role: "RECEPTIONIST", status: "available", assignedCounter: 1, is_deleted: false },
      { id: "emp-03", branchId: "br-01", name: "Sarah Jenkins", email: "s.jenkins@bosaso-notary.com", role: "NOTARY_OFFICER", status: "busy", assignedCounter: 3, is_deleted: false },
      { id: "emp-04", branchId: "br-03", name: "Raul Sanchez", email: "r.sanchez@puntland-witness.com", role: "NOTARY_OFFICER", status: "available", assignedCounter: 1, is_deleted: false }
    ]);
    setAppointments([
      { id: "ap-01", branchId: "br-01", customerName: "Arthur Pendelton", customerEmail: "arthur@pendelton-legal.org", serviceType: "Deed of Escrow Settlement", appointmentTime: "2026-06-15 @ 10:30 AM", status: "scheduled", is_deleted: false },
      { id: "ap-02", branchId: "br-01", customerName: "Alexander Westmoreland", customerEmail: "alex@westmoreland-holdings.co", serviceType: "Affidavit of Identity", appointmentTime: "2026-06-15 @ 11:15 AM", status: "scheduled", is_deleted: false },
      { id: "ap-03", branchId: "br-03", customerName: "Robert Plant", customerEmail: "robert@led-zepp.co.uk", serviceType: "General Power of Attorney", appointmentTime: "2026-06-16 @ 02:00 PM", status: "scheduled", is_deleted: false }
    ]);
    setQueue([
      { id: "tick-01", ticketNumber: "NOT-102", customerName: "Alexander Westmoreland", serviceType: "Affidavit Verification", checkInTime: "11:10 AM", status: "calling", calledCounter: 2, servedBy: "Elena Rostova", branchId: "br-01", is_deleted: false },
      { id: "tick-02", ticketNumber: "NOT-103", customerName: "Alice Cooper", serviceType: "Escrow Signing", checkInTime: "11:14 AM", status: "waiting", branchId: "br-01", is_deleted: false },
      { id: "tick-03", ticketNumber: "NOT-104", customerName: "Arthur Pendelton", serviceType: "Deed Certification", checkInTime: "11:20 AM", status: "waiting", branchId: "br-01", is_deleted: false }
    ]);
    setDocuments([
      { id: "doc-01", title: "Affidavit of Identity Verification - Arthur Pendelton", status: "completed", parties: ["Arthur Pendelton", "Michael Vance"], content: "I, Arthur Pendelton, hereby certify under physical oath that identity parameters align precisely with US passport files recorded...", createdAt: "2026-06-12", hash: "8fae639de1044ba902888258e74719ef10c1f202b20468ea9f1311b988f01bde", branchId: "br-01", is_deleted: false }
    ]);
    setInvoices([
      { id: "inv-01", invoiceNumber: "INV-2026-001", customerName: "Arthur Pendelton / Pendelton Legal", amount: 150.00, dueDate: "2026-06-25", status: "unpaid", items: [{ description: "Deed of Escrow Settlement Certification Fee", price: 100 }, { description: "Biometric Fingerprint Minutiae Stamp Duty", price: 50 }], branchId: "br-01", is_deleted: false },
      { id: "inv-02", invoiceNumber: "INV-2026-002", customerName: "Alexander Westmoreland", amount: 80.00, dueDate: "2026-06-25", status: "paid", items: [{ description: "Affidavit Verification Paperwork Processing", price: 80 }], branchId: "br-01", is_deleted: false }
    ]);
    setAuditLogs([
      { id: "log-01", tenantId: "ten-01", timestamp: "2026-06-12 11:15:02", username: "m.vance", ipAddress: "192.168.12.102", action: "TENANT_BOOT_SUCCESS", module: "SYSTEM", details: "Isolated database partition schemas validated for tenant metro-chi" }
    ]);
    alert("⚡ VERITAS DEMO DATA RESTORED:\n\nSample companies, branches, employees, and transaction queues have been successfully populated.");
  };

  const addAuditLog = (moduleName: string, actionCode: string, description: string) => {
    const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newLog: AuditLog = {
      id: generateUniqueId("log"),
      tenantId: selectedTenantId,
      timestamp: timestampStr,
      username: "m.vance",
      ipAddress: "192.168.12.102",
      action: actionCode,
      module: moduleName,
      details: description
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleLogin = (user: ActiveUser) => {
    setCurrentUser(user);
    setActiveTab("dashboard");
    if (user.tenantId) {
      setSelectedTenantId(user.tenantId);
    }
    addAuditLog("SECURITY", "AUTH_SESSION_INIT", `Successfully established isolated sandbox session for principal ${user.username} with role ${user.role}`);
  };

  const handleLogout = () => {
    if (currentUser) {
      addAuditLog("SECURITY", "AUTH_SESSION_TERM", `Terminated isolated sandbox session for principal ${currentUser.username} (${currentUser.role})`);
    }
    setCurrentUser(null);
    setActiveTab("dashboard");
  };

  // Switchboards
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({
    ocr: true,
    docGen: true,
    voiceChime: true
  });

  const handleToggleFeature = (flagStr: string) => {
    setFeatureFlags(prev => {
      const updated = { ...prev, [flagStr]: !prev[flagStr] };
      addAuditLog("SUPER_ADMIN", "FEATURE_TOGGLE", `Switched feature flag ${flagStr} to ${updated[flagStr]}`);
      return updated;
    });
  };

  // Configurable dynamic RBAC Permissions matrix state
  const [permissionsMatrix, setPermissionsMatrix] = useState<PermissionsMatrix>({
    SUPER_ADMIN: { CREATE_DOCUMENT: true, EDIT_DOCUMENT: true, DELETE_DOCUMENT: true, VIEW_REPORTS: true, CREATE_EMPLOYEE: true, CREATE_BRANCH: true, MANAGE_SUBSCRIPTIONS: true, BYPASS_BIOMETRICS: true },
    COMPANY_ADMIN: { CREATE_DOCUMENT: true, EDIT_DOCUMENT: true, DELETE_DOCUMENT: false, VIEW_REPORTS: true, CREATE_EMPLOYEE: true, CREATE_BRANCH: true, MANAGE_SUBSCRIPTIONS: false, BYPASS_BIOMETRICS: false },
    BRANCH_ADMIN: { CREATE_DOCUMENT: true, EDIT_DOCUMENT: true, DELETE_DOCUMENT: false, VIEW_REPORTS: true, CREATE_EMPLOYEE: false, CREATE_BRANCH: false, MANAGE_SUBSCRIPTIONS: false, BYPASS_BIOMETRICS: false },
    EMPLOYEE: { CREATE_DOCUMENT: true, EDIT_DOCUMENT: true, DELETE_DOCUMENT: false, VIEW_REPORTS: false, CREATE_EMPLOYEE: false, CREATE_BRANCH: false, MANAGE_SUBSCRIPTIONS: false, BYPASS_BIOMETRICS: false },
    CUSTOMER: { CREATE_DOCUMENT: false, EDIT_DOCUMENT: false, DELETE_DOCUMENT: false, VIEW_REPORTS: false, CREATE_EMPLOYEE: false, CREATE_BRANCH: false, MANAGE_SUBSCRIPTIONS: false, BYPASS_BIOMETRICS: false }
  });

  // TELESYNC ANNUNCATOR SPEECH SYNTH ESIC
  const announceTicket = (ticket: QueueTicket, deskNo: number) => {
    // Sync UI calling status
    setQueue(prev => prev.map(t => t.id === ticket.id ? { ...t, status: "calling", calledCounter: deskNo } : t));
    addAuditLog("QUEUE", "CLIENT_CALL", `Broadcasted voice announce call for Ticket ${ticket.ticketNumber} to counter desk ${deskNo}`);

    if (!featureFlags.voiceChime) {
      alert(`Vocal alert chime triggered: Ticket ${ticket.ticketNumber}, please report to counter ${deskNo}!`);
      return;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const speakPhrase = `Ticket number ${ticket.ticketNumber.replace("-", " ")}, please proceed to counter ${deskNo}.`;
      const utterance = new SpeechSynthesisUtterance(speakPhrase);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    } else {
      alert(`Queue Vocal synthesize: Ticket ${ticket.ticketNumber} to counter ${deskNo}`);
    }
  };

  const handleAdvanceTicketStatus = (id: string, nextStatus: QueueTicket["status"]) => {
    setQueue(prev => prev.map(t => {
      if (t.id === id) {
        addAuditLog("QUEUE", "QUEUE_STATUS_ADVANCE", `Advanced ticket ID ${id} to ${nextStatus.toUpperCase()}`);
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  // MULTI-TENANT PROVISIONING OPERATIONS
  const handleAddTenant = (name: string, subdomain: string, plan: Tenant["plan"], email?: string, licenseNumber?: string) => {
    // Enforce unique constraints on companies/tenants
    const duplicate = tenants.find(t => 
      !t.is_deleted && (
        t.subdomain.toLowerCase().trim() === subdomain.toLowerCase().trim() ||
        (email && t.email && t.email.toLowerCase().trim() === email.toLowerCase().trim()) ||
        (licenseNumber && t.license_number && t.license_number.toLowerCase().trim() === licenseNumber.toLowerCase().trim())
      )
    );
    if (duplicate) {
      alert(`⚠️ UNIQUE CONSTRAINT VIOLATION:\n\nAnother company has already claimed this Subdomain, Email address, or License Number.`);
      return;
    }

    const newT: Tenant = {
      id: generateUniqueId("ten"),
      name,
      subdomain,
      status: "active",
      createdAt: new Date().toISOString().substring(0, 10),
      plan,
      dbSize: "2.1 MB",
      cpuUsage: 0.01,
      email,
      license_number: licenseNumber,
      is_deleted: false
    };
    setTenants(prev => [...prev, newT]);
    addAuditLog("SUPER_ADMIN", "PROVISION_TENANT", `Successfully generated isolated tablespace schemas for newly registered SaaS domain: ${subdomain}.notary.com (Email: ${email || "N/A"}, License: ${licenseNumber || "N/A"})`);
  };

  const handleToggleTenantStatus = (id: string) => {
    setTenants(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === "active" ? "suspended" : "active";
        addAuditLog("SUPER_ADMIN", "TENANT_STATUS", `Company tenant ${t.name} state toggled to ${nextStatus}`);
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const handleDeleteTenant = (id: string) => {
    const deleted_at = new Date().toISOString();
    const deleted_by = currentUser?.email || "SUPER_ADMIN";

    // 1. Soft-delete Company/Tenant instead of purging from states, ensuring records are never orphaned
    setTenants(prev => prev.map(t => t.id === id ? { ...t, is_deleted: true, deleted_at, deleted_by, status: "suspended" as const } : t));

    // 2. Cascade soft-delete all related branches belonging to this tenant
    const branchIds = branches.filter(b => b.tenantId === id).map(b => b.id);
    setBranches(prev => prev.map(b => b.tenantId === id ? { ...b, is_deleted: true, deleted_at, deleted_by } : b));

    // 3. Cascade soft-delete all employees belonging to those branches
    setEmployees(prev => prev.map(e => branchIds.includes(e.branchId) ? { ...e, is_deleted: true, deleted_at, deleted_by, status: "suspended" as const } : e));

    // 4. Cascade soft-delete all related appointments, queue tickets, documents, and invoices belonging to this tenant or its branches
    setAppointments(prev => prev.map(ap => (branchIds.includes(ap.branchId) || ap.tenantId === id) ? { ...ap, is_deleted: true } : ap));
    setQueue(prev => prev.map(q => (branchIds.includes(q.branchId || "") || q.tenantId === id) ? { ...q, is_deleted: true } : q));
    setDocuments(prev => prev.map(d => (branchIds.includes(d.branchId || "") || d.tenantId === id) ? { ...d, is_deleted: true, deleted_at, deleted_by } : d));
    setInvoices(prev => prev.map(inv => (branchIds.includes(inv.branchId || "") || inv.tenantId === id) ? { ...inv, is_deleted: true, deleted_at, deleted_by } : inv));

    addAuditLog("SUPER_ADMIN", "DEPROVISION_TENANT", `Successfully soft deprovisioned Company ${id} and robustly cascaded deletions to ${branchIds.length} branches, employees, client records, and documents to prevent orphaned records.`);
  };

  // COMPANY ADMIN: DIRECTORY MANAGEMENT
  const handleAddBranch = (name: string, address: string, phone: string) => {
    const newB: Branch = {
      id: generateUniqueId("br"),
      tenantId: selectedTenantId,
      name,
      address,
      phone,
      countersCount: 2,
      activeEmployees: 1,
      currentQueueLength: 0,
      is_deleted: false
    };
    setBranches(prev => [...prev, newB]);
    addAuditLog("COMPANY_ADMIN", "CREATE_BRANCH", `Registered new physical bureau office: "${name}" within tenant context`);
  };

  const handleEditBranch = (branchId: string, name: string, address: string, phone: string, countersCount: number) => {
    setBranches(prev => prev.map(b => b.id === branchId ? { ...b, name, address, phone, countersCount } : b));
    addAuditLog("COMPANY_ADMIN", "UPDATE_BRANCH", `Modified physical registry office details for Branch: ${name} (${branchId}).`);
  };

  const handleToggleArchiveBranch = (branchId: string) => {
    setBranches(prev => prev.map(b => {
      if (b.id === branchId) {
        const nextArchived = !b.archived;
        addAuditLog("COMPANY_ADMIN", "ARCHIVE_BRANCH", `Branch "${b.name}" was ${nextArchived ? "archived" : "restored from archive"}.`);
        return { ...b, archived: nextArchived };
      }
      return b;
    }));
  };

  const handleDeleteBranch = (branchId: string) => {
    const deleted_at = new Date().toISOString();
    const deleted_by = currentUser?.email || "COMPANY_ADMIN";

    // Soft-delete the branch to retain audit integrity
    setBranches(prev => prev.map(b => b.id === branchId ? { ...b, is_deleted: true, deleted_at, deleted_by } : b));
    
    // Cascade soft-delete employees belonging to that branch
    setEmployees(prev => prev.map(e => e.branchId === branchId ? { ...e, is_deleted: true, deleted_at, deleted_by, status: "suspended" as const } : e));
    
    // Cascade soft-delete branch-related records
    setAppointments(prev => prev.map(a => a.branchId === branchId ? { ...a, is_deleted: true } : a));
    setQueue(prev => prev.map(q => q.branchId === branchId ? { ...q, is_deleted: true } : q));
    setDocuments(prev => prev.map(d => d.branchId === branchId ? { ...d, is_deleted: true, deleted_at, deleted_by } : d));
    setInvoices(prev => prev.map(inv => inv.branchId === branchId ? { ...inv, is_deleted: true, deleted_at, deleted_by } : inv));
    
    addAuditLog("COMPANY_ADMIN", "DELETE_BRANCH", `Soft deleted office branch ${branchId} and cascaded soft-deletions to all clerks and customer files to prevent orphaned records.`);
  };

  const handleAddEmployee = (branchId: string, name: string, email: string, role: Employee["role"]) => {
    // Unique user/employee email constraint validation
    const duplicateEmail = employees.find(e => !e.is_deleted && e.email.toLowerCase().trim() === email.toLowerCase().trim());
    if (duplicateEmail) {
      alert(`⚠️ UNIQUE CONSTRAINT VIOLATION:\n\nAnother employee email matching "${email}" is already registered.`);
      return;
    }

    const newE: Employee = {
      id: generateUniqueId("emp"),
      branchId,
      name,
      email,
      role,
      status: "available",
      assignedCounter: employees.length + 1,
      is_deleted: false
    };
    setEmployees(prev => [...prev, newE]);
    addAuditLog("COMPANY_ADMIN", "ONBOARD_EMPLOYEE", `Onboarded clerk "${name}" with role security authority ROLE_${role}`);
  };

  const handleEditEmployee = (empId: string, name: string, email: string, role: Employee["role"], branchId: string) => {
    // Validate unique employee email on update
    const duplicateEmail = employees.find(e => e.id !== empId && !e.is_deleted && e.email.toLowerCase().trim() === email.toLowerCase().trim());
    if (duplicateEmail) {
      alert(`⚠️ UNIQUE CONSTRAINT VIOLATION:\n\nAnother employee email matching "${email}" is already registered.`);
      return;
    }
    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, name, email, role, branchId } : e));
    addAuditLog("COMPANY_ADMIN", "UPDATE_EMPLOYEE", `Updated records and role permissions for employee identifier: ${name} (${empId}).`);
  };

  const handleDeleteEmployee = (empId: string) => {
    const deleted_at = new Date().toISOString();
    const deleted_by = currentUser?.email || "COMPANY_ADMIN";
    // Soft-delete employee record to protect historic signatures and biometric sessions
    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, is_deleted: true, deleted_at, deleted_by, status: "suspended" as const } : e));
    addAuditLog("COMPANY_ADMIN", "DELETE_EMPLOYEE", `Discharged and soft-deleted employee file ${empId} from database.`);
  };

  const handleToggleArchiveEmployee = (empId: string) => {
    setEmployees(prev => prev.map(e => {
      if (e.id === empId) {
        const nextArchived = !e.archived;
        addAuditLog("COMPANY_ADMIN", "ARCHIVE_EMPLOYEE", `Employee card for ${e.name} was ${nextArchived ? "archived" : "restored"}.`);
        return { ...e, archived: nextArchived };
      }
      return e;
    }));
  };

  const handleResetEmployeePassword = (empId: string) => {
    addAuditLog("SECURITY_OFFICER", "PASSWORD_RESET", `Regenerated administrative security token and forced passcode change on next login workspace session for Employee identifier: ${empId}`);
  };

  const handleToggleEmployeeSuspend = (id: string) => {
    setEmployees(prev => prev.map(e => {
      if (e.id === id) {
        const nextStatus = e.status === "suspended" ? "offline" : "suspended";
        addAuditLog("COMPANY_ADMIN", "EMPLOYEE_SUSPEND", `Toggled suspension parameters for staff member ${e.name} to ${nextStatus}`);
        return { ...e, status: nextStatus };
      }
      return e;
    }));
  };

  const handleToggleEmployeeStatus = (id: string) => {
    setEmployees(prev => prev.map(e => {
      if (e.id === id) {
        const nextStatus = e.status === "available" ? "offline" : "available";
        addAuditLog("COMPANY_ADMIN", "EMPLOYEE_STATUS", `Toggled availability parameters for staff member ${e.name} to ${nextStatus}`);
        return { ...e, status: nextStatus };
      }
      return e;
    }));
  };

  // GLOBAL FINANCE MANAGERS
  const handlePayInvoice = (id: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        addAuditLog("BILLING", "INVOICE_SETTLED_STRIPE", `Successfully processed bank balance settlement of $${inv.amount.toFixed(2)} via Stripe Gateway`);
        return { ...inv, status: "paid" };
      }
      return inv;
    }));
  };

  // INDEPENDENT CLIENT APPOINTMENT BOOKING
  const handleBookAppointment = (branchId: string, name: string, email: string, serviceType: string, time: string) => {
    const newAp: Appointment = {
      id: generateUniqueId("ap"),
      branchId,
      customerName: name,
      customerEmail: email,
      serviceType,
      appointmentTime: time,
      status: "scheduled"
    };
    setAppointments(prev => [...prev, newAp]);

    // Also place a live ticket onto the reception queue
    const ticketNo = `NOT-${100 + queue.length + 1}`;
    const newTicket: QueueTicket = {
      id: generateUniqueId("tick"),
      ticketNumber: ticketNo,
      customerName: name,
      serviceType,
      checkInTime: new Date().toLocaleTimeString().substring(0, 5),
      status: "waiting"
    };
    setQueue(prev => [...prev, newTicket]);
    addAuditLog("CUSTOMER", "BOOK_APPOINTMENT", `Recorded scheduled slot reservation for ${name} at designated bureau branch`);
  };

  // MULTI-MODAL OCR ID PASSPORT PARSERS State
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrData, setOcrData] = useState<any>(null);

  const triggerIdentityOcrScan = async (sampleIndex: number) => {
    setOcrLoading(true);
    addAuditLog("OPERATOR", "OCR_UPLOAD", "Sent base64 identification bytes to Gemini Vision endpoint for secure compliance checks");

    try {
      // Proxying call through Express backend to hide our GEMINI_API_KEY
      const response = await fetch("/api/gemini/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: sampleIndex })
      });
      const result = await response.json();
      setOcrData(result);
      addAuditLog("OPERATOR", "OCR_PARSE_COMPLETE", `Successfully validated visual identity ID. Certified entity: ${result.fullName}`);
    } catch (err) {
      console.error("Vision API failure, fallback simulation executing", err);
      // Fallback robust simulation if service unavailable
      setTimeout(() => {
        const fallbacks = [
          { fullName: "Alexander Westmoreland", documentNumber: "PP9843102", dob: "1983-05-12", nationality: "United States" },
          { fullName: "Klaus Schmidt", documentNumber: "D89420B11", dob: "1991-09-24", nationality: "German Fed" }
        ];
        const res = fallbacks[sampleIndex] || fallbacks[0];
        setOcrData(res);
        addAuditLog("OPERATOR", "OCR_MOCK_PARSE_COMPLETE", `Parsed visual identity coordinates. Certified: ${res.fullName}`);
      }, 1500);
    } finally {
      setOcrLoading(false);
    }
  };

  // DYNAMIC DOCUMENT AI COMPILER SPECIFICS
  const [docTemplate, setDocTemplate] = useState("Deed of Escrow Settlement");
  const [docPrincipal, setDocPrincipal] = useState("Arthur Pendelton");
  const [docAgent, setDocAgent] = useState("Michael Vance");
  const [docJurisdiction, setDocJurisdiction] = useState("State of Illinois [County of Cook]");
  const [docClauses, setDocClauses] = useState("Hold escrow principal amounts in bank trust under statutory rate laws.");
  const [docGenerating, setDocGenerating] = useState(false);
  const [draftedDocContent, setDraftedDocContent] = useState("");
  const [activeCreatedDoc, setActiveCreatedDoc] = useState<NotaryDocument | null>(null);

  const triggerDocumentDraft = async () => {
    setDocGenerating(true);
    addAuditLog("AI_COORDINATOR", "GEMINI_PROMPT_SEND", `Sending structure guidelines to Gemini Model for type: ${docTemplate}`);

    try {
      const response = await fetch("/api/gemini/generate-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: docTemplate,
          principal: docPrincipal,
          agent: docAgent,
          jurisdiction: docJurisdiction,
          clauses: docClauses
        })
      });
      const result = await response.json();
      setDraftedDocContent(result.draft);
      
      const newD: NotaryDocument = {
        id: generateUniqueId("doc"),
        title: `${docTemplate} - ${docPrincipal}`,
        status: "draft",
        parties: [docPrincipal, docAgent],
        content: result.draft,
        createdAt: new Date().toISOString().substring(0, 10),
        hash: ""
      };
      setActiveCreatedDoc(newD);
      addAuditLog("AI_COORDINATOR", "GENERATE_DRAFT_COMPLETE", `Successfully generated official legal language for: ${docTemplate}`);
    } catch (err) {
      console.error("AI Generation failure, fallback executing", err);
      setTimeout(() => {
        const customFallbackDraft = `NOTARY CONTRACT ORIGINAL: ${docTemplate.toUpperCase()}\n\nThis binding document establishes that on this day, the principal party ${docPrincipal} appears before Notary Officer ${docAgent} within the jurisdiction of ${docJurisdiction}.\n\nTERMS AND COVENANTS:\n- Active compliance parameters are maintained under legal framework controls.\n- Scope details: ${docClauses}\n\nSEAL & ACCREDITATION:\nBoth parties affirm the terms on hand, binding signature elements onto the multi-tenant secure hash ledger instantly.\n`;
        setDraftedDocContent(customFallbackDraft);
        
        const newD: NotaryDocument = {
          id: generateUniqueId("doc"),
          title: `${docTemplate} - ${docPrincipal}`,
          status: "draft",
          parties: [docPrincipal, docAgent],
          content: customFallbackDraft,
          createdAt: new Date().toISOString().substring(0, 10),
          hash: ""
        };
        setActiveCreatedDoc(newD);
        addAuditLog("AI_COORDINATOR", "GENERATE_MOCK_DRAFT_COMPLETE", "Draft compiled locally from template matrix");
      }, 1205);
    } finally {
      setDocGenerating(false);
    }
  };

  const handleCommitSignaturesAndNotarize = () => {
    if (!activeCreatedDoc) return;
    
    const uniqueHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const finishedDoc: NotaryDocument = {
      ...activeCreatedDoc,
      status: "completed",
      hash: uniqueHash,
      createdAt: new Date().toISOString().substring(0, 10),
    };

    setDocuments(prev => [finishedDoc, ...prev]);
    
    // Auto-create a ledger invoice for the completed document transaction
    const newInvoice: Invoice = {
      id: generateUniqueId("inv"),
      invoiceNumber: `INV-2026-0${10 + invoices.length + 1}`,
      customerName: docPrincipal,
      amount: 150.00,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      status: "unpaid",
      items: [
        { description: `${docTemplate} Notarization Seal Service`, price: 100 },
        { description: "Biometric Fingerprint Minutiae Stamp Duty", price: 50 }
      ]
    };
    
    setInvoices(prev => [newInvoice, ...prev]);
    setDraftedDocContent("");
    setActiveCreatedDoc(null);
    onClearSignature();
    setFingerprintReady(false);
    
    alert(`Notary transaction committed successfully!\n- Signed deed compiled, watermarked and archived directly\n- Unique blockchain SHA-256 registered\n- Ledger billing invoice ${newInvoice.invoiceNumber} dispatched directly to client billing portal.`);
    addAuditLog("OPERATOR", "COMMIT_LAND_DEED_SEAL", `Finalized notarization flow for document hash: ${uniqueHash.substring(0, 16)}`);
  };

  // BIOMETRIC CANVAS SIGNATURE STATE
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const isDrawing = useRef(false);

  const onStartDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawing.current = true;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.strokeStyle = "#818cf8";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const onDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const onStopDrawing = () => {
    isDrawing.current = false;
  };

  const onClearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // BIOMETRIC LASER RANGE LASER SWEEP FINGERPRINT
  const [fingerprintReady, setFingerprintReady] = useState(false);
  const [capturedFingerHash, setCapturedFingerHash] = useState("");
  const [biometricScanRunning, setBiometricScanRunning] = useState(false);
  const [biometricProgress, setBiometricProgress] = useState(0);

  const onTriggerFingerprintScan = () => {
    setBiometricScanRunning(true);
    setBiometricProgress(0);
    addAuditLog("OPERATOR", "FINGERPRINT_激光_INIT", "Triggered laser minutiae sweep scanner pad for active lobby customer");

    const timer = setInterval(() => {
      setBiometricProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setFingerprintReady(true);
          const randHashObj = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
          setCapturedFingerHash(`FP-MINUTIAE-${randHashObj.substring(0, 24).toUpperCase()}`);
          setBiometricScanRunning(false);
          addAuditLog("OPERATOR", "FINGERPRINT_SUCCESS", "Captured 100% compliant physical biometric coordinates matching statutory database rosters");
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  // ARCHITECT CHAT GEMINI LOGIC
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: "model", content: "Greetings! I am the HubDev AI Notary Legal Assistant. Ask me any questions you have about legal deed formatting, Power of Attorney compliance, stamp duties, or verification checklists." }
  ]);

  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: "user", content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    const term = chatInput;
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: term })
      });
      const result = await response.json();
      setChatMessages(prev => [...prev, { role: "model", content: result.reply }]);
    } catch {
      setTimeout(() => {
        setChatMessages(prev => [...prev, { 
          role: "model", 
          content: `FALLBACK ARCHITECT RESPONSE:\nTo implement multi-tenant Postgres schemas, prefer row-level-security (RLS) policies. For Java, configure AbstractRoutingDataSource using ThreadLocals to route data partitions on every REST interceptor cleanly. Biometric fingerprint minutiae maps should be stored as encrypted JSONB hashes to maintain strict user privacy.` 
        }]);
      }, 1000);
    } finally {
      setChatLoading(false);
    }
  };

  // Render sidebar links based on currentUser's role
  const renderSidebarLinks = () => {
    if (!currentUser) return null;

    const links = {
      SUPER_ADMIN: [
        { id: "dashboard", label: "Platform Console", icon: <Layers className="w-4 h-4 text-blue-600" /> },
        { id: "permissions", label: "Access Rules Catalog", icon: <Database className="w-4 h-4 text-emerald-600" /> },
        { id: "legal-ai", label: "Compliance Expert AI", icon: <Bot className="w-4 h-4 text-indigo-600 font-bold" /> }
      ],
      COMPANY_ADMIN: [
        { id: "dashboard", label: "Corporate Workspace", icon: <Building2 className="w-4 h-4 text-[#0D9488]" /> },
        { id: "legal-ai", label: "Compliance Expert AI", icon: <Bot className="w-4 h-4 text-[#0D9488]" /> }
      ],
      BRANCH_ADMIN: [
        { id: "dashboard", label: "Bureau Desk Admin", icon: <Clock className="w-4 h-4 text-indigo-600" /> },
        { id: "legal-ai", label: "Compliance Expert AI", icon: <Bot className="w-4 h-4 text-indigo-600" /> }
      ],
      EMPLOYEE: [
        { id: "dashboard", label: "Duty Station Desk", icon: <Users className="w-4 h-4 text-amber-600" /> },
        { id: "legal-ai", label: "Compliance Expert AI", icon: <Bot className="w-4 h-4 text-amber-600" /> }
      ],
      CUSTOMER: [
        { id: "dashboard", label: "Secure Client Lobby", icon: <Receipt className="w-4 h-4 text-purple-600" /> },
        { id: "legal-ai", label: "Compliance Expert AI", icon: <Bot className="w-4 h-4 text-purple-600" /> }
      ]
    }[currentUser.role];

    return (
      <nav className="space-y-1.5">
        <p className="text-[9.5px] font-mono text-slate-400 px-2.5 pb-1 uppercase tracking-widest font-bold">Authorized Operations</p>
        {links.map((link) => {
          const isActive = activeTab === link.id;
          return (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2.5 outline-none transition-all cursor-pointer ${
                isActive
                  ? "bg-white border border-slate-205 text-slate-900 font-bold shadow-xs scale-[101%]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {link.icon}
              <span className="font-sans font-semibold">{link.label}</span>
              {isActive && link.id === "dashboard" && (
                <span className="ml-auto w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              )}
            </button>
          );
        })}
      </nav>
    );
  };

  // Render main content area
  const renderMainContent = () => {
    if (!currentUser) return null;

    if (activeTab === "permissions") {
      if (currentUser.role !== "SUPER_ADMIN") {
        return (
          <div className="p-8 text-center bg-rose-50 border border-rose-150 rounded-2xl flex flex-col items-center">
            <ShieldAlert className="w-12 h-12 text-rose-600 animate-bounce mb-3" />
            <h3 className="text-sm font-bold text-slate-900">403: Authorization Vault Breach Blocked</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">Row-level security validation failed. Your credentials ({currentUser.role}) do not permit physical or programmatic access to the Global Access Rules Matrix.</p>
          </div>
        );
      }
      return (
        <PermissionsConfig
          permissionsMatrix={permissionsMatrix}
          onUpdatePermissions={setPermissionsMatrix}
        />
      );
    }

    if (activeTab === "legal-ai") {
      return (
        <div className="space-y-5" id="chat-architect-terminal">
          <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-xl">
            <div className="text-left">
              <h3 className="text-sm font-sans font-bold text-slate-900 flex items-center gap-2">
                <Bot className="text-blue-600 w-5 h-5 animate-pulse" />
                HubDev Notary Compliance Legal Assistant
              </h3>
              <p className="text-[11px] text-slate-500">Ask about professional notary standards, row-level database partitioning, witness mandates, or active certificate audit controls.</p>
            </div>
          </div>

          <div className="bg-white border border-slate-250 p-5 rounded-3xl h-[420px] flex flex-col justify-between shadow-sm">
            <div className="space-y-3 overflow-y-auto max-h-[330px] pr-1 flex-1 text-left">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`p-3.5 rounded-2xl max-w-md text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user" 
                      ? "bg-slate-950 text-white rounded-br-none" 
                      : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none"
                  }`}>
                    {msg.role === "model" && (
                      <span className="text-[9px] font-sans text-[#0D9488] block tracking-wider uppercase font-bold mb-1">HUBDEV AI ASSISTANT:</span>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 flex items-center gap-1.5 rounded-bl-none animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" /> Assistant drafting compliance review...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleChatSend} className="mt-4 pt-4 border-t border-slate-200 flex gap-2 shrink-0">
              <input
                type="text"
                required
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about Power of Attorney rules, witness mandates, or certificate formatting..."
                className="flex-1 bg-slate-50 border border-slate-200 hover:border-slate-350 focus:bg-white text-xs px-3.5 py-3 rounded-xl text-slate-900 outline-none"
              />
              <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 rounded-xl flex items-center gap-1 transition">
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>
          </div>
        </div>
      );
    }

    switch (currentUser.role) {
      case "SUPER_ADMIN":
        return (
          <SuperAdminPortal
            tenants={tenants.filter(t => !t.is_deleted)}
            onAddTenant={handleAddTenant}
            onToggleTenantStatus={handleToggleTenantStatus}
            onDeleteTenant={handleDeleteTenant}
            branches={branches.filter(b => !b.is_deleted)}
            employees={employees.filter(e => !e.is_deleted)}
            appointments={appointments.filter(a => !a.is_deleted)}
            queue={queue.filter(q => !q.is_deleted)}
            documents={documents.filter(d => !d.is_deleted)}
            invoices={invoices.filter(i => !i.is_deleted)}
            auditLogs={auditLogs}
            metrics={metrics}
            featureFlags={featureFlags}
            onToggleFeature={handleToggleFeature}
            onLogout={handleLogout}
            permissionsMatrix={permissionsMatrix}
            onUpdatePermissions={setPermissionsMatrix}
          />
        );

      case "COMPANY_ADMIN":
        return (
          <CompanyAdminPortal
            tenants={tenants.filter(t => !t.is_deleted)}
            selectedTenantId={currentUser.tenantId || "ten-01"}
            onSelectTenant={setSelectedTenantId}
            branches={branches.filter(b => b.tenantId === currentUser.tenantId && !b.is_deleted)}
            onAddBranch={handleAddBranch}
            onEditBranch={handleEditBranch}
            onDeleteBranch={handleDeleteBranch}
            onToggleArchiveBranch={handleToggleArchiveBranch}
            employees={employees.filter(e => {
              const b = branches.find(br => br.id === e.branchId);
              return b ? b.tenantId === currentUser.tenantId && !e.is_deleted && !b.is_deleted : false;
            })}
            onAddEmployee={handleAddEmployee}
            onEditEmployee={handleEditEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onToggleArchiveEmployee={handleToggleArchiveEmployee}
            onToggleEmployeeStatus={handleToggleEmployeeStatus}
            onToggleEmployeeSuspend={handleToggleEmployeeSuspend}
            onResetEmployeePassword={handleResetEmployeePassword}
            invoices={invoices.filter(i => !i.is_deleted)}
            onPayInvoice={handlePayInvoice}
            appointments={appointments.filter(a => {
              const b = branches.find(br => br.id === a.branchId);
              return b ? b.tenantId === currentUser.tenantId && !a.is_deleted && !b.is_deleted : false;
            })}
            queue={queue.filter(q => !q.is_deleted)}
            documents={documents.filter(d => !d.is_deleted)}
            lockTenant={true}
            onLogout={handleLogout}
            auditLogs={auditLogs}
            permissionsMatrix={permissionsMatrix}
            onUpdatePermissions={setPermissionsMatrix}
          />
        );

      case "BRANCH_ADMIN": {
        const assignedBranchId = currentUser.branchId || "br-01";
        return (
          <BranchAdminPortal
            branches={branches.filter(b => b.id === assignedBranchId && !b.is_deleted)}
            employees={employees.filter(e => e.branchId === assignedBranchId && !e.is_deleted)}
            appointments={appointments.filter(a => a.branchId === assignedBranchId && !a.is_deleted)}
            queue={queue.filter(q => q.branchId === assignedBranchId && !q.is_deleted)}
            documents={documents.filter(d => d.branchId === assignedBranchId && !d.is_deleted)}
            onLogout={handleLogout}
          />
        );
      }

      case "EMPLOYEE": {
        return (
          <EmployeePortal
            queue={queue.filter(q => !q.is_deleted)}
            onAnnounceTicket={announceTicket}
            onAdvanceTicketStatus={handleAdvanceTicketStatus}
            ocrLoading={ocrLoading}
            ocrData={ocrData}
            onIdentityOcrScan={triggerIdentityOcrScan}
            docTemplate={docTemplate}
            setDocTemplate={setDocTemplate}
            docPrincipal={docPrincipal}
            setDocPrincipal={setDocPrincipal}
            docAgent={docAgent}
            setDocAgent={setDocAgent}
            docJurisdiction={docJurisdiction}
            setDocJurisdiction={setDocJurisdiction}
            docClauses={docClauses}
            setDocClauses={setDocClauses}
            docGenerating={docGenerating}
            draftedDocContent={draftedDocContent}
            onTriggerDocumentDraft={triggerDocumentDraft}
            activeCreatedDoc={activeCreatedDoc}
            onCommitSignaturesAndNotarize={handleCommitSignaturesAndNotarize}
            fingerprintReady={fingerprintReady}
            capturedFingerHash={capturedFingerHash}
            biometricScanRunning={biometricScanRunning}
            biometricProgress={biometricProgress}
            onTriggerFingerprintScan={onTriggerFingerprintScan}
            canvasRef={canvasRef}
            onStartDrawing={onStartDrawing}
            onDraw={onDraw}
            onStopDrawing={onStopDrawing}
            onClearSignature={onClearSignature}
            hasSignature={hasSignature}
            isAllowedCreateDoc={permissionsMatrix[currentUser.role]?.CREATE_DOCUMENT}
            isAllowedBypassBio={permissionsMatrix[currentUser.role]?.BYPASS_BIOMETRICS}
            onLogout={handleLogout}
          />
        );
      }

      case "CUSTOMER":
        return (
          <CustomerPortal
            branches={branches.filter(b => b.tenantId === currentUser.tenantId)}
            appointments={appointments.filter(a => a.customerName === currentUser.username || a.customerEmail === currentUser.email)}
            onBookAppointment={handleBookAppointment}
            documents={documents.filter(d => d.parties.includes(currentUser.username))}
            invoices={invoices.filter(i => i.customerName === currentUser.username)}
            onPayInvoice={handlePayInvoice}
            onLogout={handleLogout}
          />
        );

      default:
        return null;
    }
  };

  if (!currentUser) {
    return (
      <UnifiedLoginGateway
        tenants={tenants}
        branches={branches}
        employees={employees}
        appointments={appointments}
        documents={documents}
        invoices={invoices}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="bg-slate-55 shadow-xs h-full relative" id="saas-dashboard">
      {renderMainContent()}
    </div>
  );
}
