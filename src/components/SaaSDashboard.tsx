import React, { useState, useEffect, useCallback } from "react";
import {
  Building2, Users, ShieldAlert, Bot,
  Send, RefreshCw, Layers, Database,
  ArrowLeft, ChevronRight, Shield, Lock,
  CheckCircle, AlertCircle, Loader2
} from "lucide-react";

import SuperAdminPortal from "./SuperAdminPortal";
import CompanyAdminPortal from "./CompanyAdminPortal";
import BranchAdminPortal from "./BranchAdminPortal";
import EmployeePortal from "./EmployeePortal";
import CustomerPortal from "./CustomerPortal";
import PermissionsConfig, { PermissionsMatrix } from "./PermissionsConfig";

import { authApi } from "../api/auth.api";
import { tenantsApi, branchesApi, employeesApi } from "../api/tenants.api";
import { setAccessToken, getAccessToken, ApiException } from "../api/client";
import type { Tenant, Branch, Employee } from "../api/tenants.api";

// ─── Active user (resolved from real JWT) ─────────────────────────────────────
export interface ActiveUser {
  id: string;
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "BRANCH_ADMIN" | "EMPLOYEE" | "CUSTOMER";
  username: string;
  email: string;
  tenantId: string | null;
}

// ─── Login form ───────────────────────────────────────────────────────────────
interface LoginFormProps {
  onLogin: (user: ActiveUser) => void;
}

function LoginForm({ onLogin }: LoginFormProps) {
  const [mode, setMode] = useState<"landing" | "tenant" | "super-admin">("landing");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needs2fa, setNeeds2fa] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await authApi.login(email, password, needs2fa ? totpCode : undefined);

      if (res.requires2fa) {
        setNeeds2fa(true);
        setLoading(false);
        return;
      }

      setAccessToken(res.accessToken);
      setSuccess(true);

      setTimeout(() => {
        onLogin({
          id:       res.user.id,
          role:     res.user.role as ActiveUser["role"],
          username: res.user.fullName,
          email:    res.user.email,
          tenantId: res.user.tenantId,
        });
      }, 500);
    } catch (err) {
      if (err instanceof ApiException) {
        const msgs: Record<string, string> = {
          INVALID_CREDENTIALS: "Incorrect email or password.",
          EMAIL_NOT_VERIFIED:  "Please verify your email before logging in.",
          ACCOUNT_LOCKED:      err.message,
          ACCOUNT_SUSPENDED:   "Your account has been suspended. Contact support.",
          TOTP_INVALID:        "Invalid 2FA code. Try again.",
        };
        setError(msgs[err.code] ?? err.message);
      } else {
        setError("Login failed. Please try again.");
      }
      setLoading(false);
    }
  };

  // ── Landing ──────────────────────────────────────────────────────────────────
  if (mode === "landing") {
    return (
      <div className="flex-1 w-full flex flex-col justify-center items-center py-12 px-4">
        <div className="w-full max-w-4xl space-y-8 text-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-500 font-medium mb-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
              NotaryHub Platform v1.0
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              NotaryHub Operations
            </h1>
            <p className="text-slate-500 text-sm max-w-lg mx-auto mt-2 leading-relaxed">
              Secure workspace for legal notarisation offices, branches, and clients.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => { setMode("tenant"); setError(null); }}
              className="group text-left bg-white border border-slate-200 hover:border-blue-500 rounded-3xl p-8 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Company & Staff Portal
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    For company admins, branch supervisors, notary officers, and customers.
                  </p>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-1.5 text-xs text-blue-600 font-bold group-hover:translate-x-1 duration-200">
                <span>Sign In</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            <button
              onClick={() => { setMode("super-admin"); setError(null); }}
              className="group text-left bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/10 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                    Platform Administration
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Restricted to platform owners. Manage tenants, billing, and infrastructure.
                  </p>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-1.5 text-xs text-amber-400 font-bold group-hover:translate-x-1 duration-200">
                <span className="font-mono tracking-wider">ADMIN CONSOLE</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Sign-in form (shared for both modes) ─────────────────────────────────────
  const isSuperAdmin = mode === "super-admin";

  return (
    <div className="flex-1 w-full flex flex-col justify-center items-center py-12 px-4">
      <div className={`w-full max-w-md rounded-3xl shadow-xl overflow-hidden ${
        isSuperAdmin
          ? "bg-slate-950 border border-slate-800"
          : "bg-white border border-slate-200"
      }`}>
        <div className={`p-8 ${isSuperAdmin ? "text-white" : "text-slate-900"}`}>

          {/* Header */}
          <div className="text-center mb-8">
            <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
              isSuperAdmin
                ? "bg-amber-500/10 border border-amber-500/20"
                : "bg-blue-50"
            }`}>
              {isSuperAdmin
                ? <Shield className="w-7 h-7 text-amber-500" />
                : <Building2 className="w-7 h-7 text-blue-600" />
              }
            </div>
            <h2 className="text-xl font-bold">
              {isSuperAdmin ? "Platform Administration" : "Sign In"}
            </h2>
            <p className={`text-xs mt-1 ${isSuperAdmin ? "text-slate-400" : "text-slate-500"}`}>
              {isSuperAdmin
                ? "Enter your platform administrator credentials"
                : "Enter your email and password to continue"
              }
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className={`flex items-start gap-2 text-xs p-3.5 rounded-xl mb-5 ${
              isSuperAdmin
                ? "bg-rose-950/40 border border-rose-800/60 text-rose-300"
                : "bg-rose-50 border border-rose-200 text-rose-700"
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm py-8">
              <CheckCircle className="w-5 h-5" />
              <span>Authenticated — redirecting…</span>
            </div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${isSuperAdmin ? "text-slate-400" : "text-slate-600"}`}>
                  Email Address
                </label>
                <div className="relative">
                  <Users className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    isSuperAdmin ? "text-slate-500" : "text-slate-400"
                  }`} />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={isSuperAdmin ? "admin@notaryhub.local" : "you@company.com"}
                    className={`w-full pl-10 pr-4 py-3 text-sm rounded-xl outline-none transition border ${
                      isSuperAdmin
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-amber-500/60"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:bg-white"
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              {!needs2fa && (
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold ${isSuperAdmin ? "text-slate-400" : "text-slate-600"}`}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      isSuperAdmin ? "text-slate-500" : "text-slate-400"
                    }`} />
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-4 py-3 text-sm rounded-xl outline-none transition border ${
                        isSuperAdmin
                          ? "bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-amber-500/60"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:bg-white"
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* 2FA code */}
              {needs2fa && (
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold ${isSuperAdmin ? "text-slate-400" : "text-slate-600"}`}>
                    2FA Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    autoFocus
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className={`w-full px-4 py-3 text-sm rounded-xl outline-none transition border text-center tracking-widest font-mono ${
                      isSuperAdmin
                        ? "bg-slate-900 border-slate-700 text-white focus:border-amber-500/60"
                        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-400 focus:bg-white"
                    }`}
                  />
                  <p className={`text-xs ${isSuperAdmin ? "text-slate-500" : "text-slate-400"}`}>
                    Enter the 6-digit code from your authenticator app.
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-60 ${
                  isSuperAdmin
                    ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                  : needs2fa ? "Verify Code" : "Sign In"
                }
              </button>
            </form>
          )}

          {/* Back */}
          <button
            type="button"
            onClick={() => { setMode("landing"); setError(null); setNeeds2fa(false); }}
            className={`mt-6 flex items-center gap-1.5 text-xs transition ${
              isSuperAdmin
                ? "text-slate-500 hover:text-slate-300"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to portal selection
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function SaaSDashboard() {
  const [currentUser, setCurrentUser]   = useState<ActiveUser | null>(null);
  const [activeTab, setActiveTab]       = useState<string>("dashboard");
  const [bootstrapping, setBootstrapping] = useState(true);

  // Real data from API — no localStorage
  const [tenants, setTenants]     = useState<Tenant[]>([]);
  const [branches, setBranches]   = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [chatLoading, setChatLoading]   = useState(false);
  const [chatInput, setChatInput]       = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      role: "model",
      content:
        "Hello! I'm the NotaryHub AI Legal Assistant. Ask me about deed formatting, Power of Attorney compliance, witness requirements, or notarisation procedures.",
    },
  ]);

  const [permissionsMatrix, setPermissionsMatrix] = useState<PermissionsMatrix>({
    SUPER_ADMIN:   { CREATE_DOCUMENT: true,  EDIT_DOCUMENT: true,  DELETE_DOCUMENT: true,  VIEW_REPORTS: true,  CREATE_EMPLOYEE: true,  CREATE_BRANCH: true,  MANAGE_SUBSCRIPTIONS: true,  BYPASS_BIOMETRICS: true  },
    COMPANY_ADMIN: { CREATE_DOCUMENT: true,  EDIT_DOCUMENT: true,  DELETE_DOCUMENT: false, VIEW_REPORTS: true,  CREATE_EMPLOYEE: true,  CREATE_BRANCH: true,  MANAGE_SUBSCRIPTIONS: false, BYPASS_BIOMETRICS: false },
    BRANCH_ADMIN:  { CREATE_DOCUMENT: true,  EDIT_DOCUMENT: true,  DELETE_DOCUMENT: false, VIEW_REPORTS: true,  CREATE_EMPLOYEE: false, CREATE_BRANCH: false, MANAGE_SUBSCRIPTIONS: false, BYPASS_BIOMETRICS: false },
    EMPLOYEE:      { CREATE_DOCUMENT: true,  EDIT_DOCUMENT: true,  DELETE_DOCUMENT: false, VIEW_REPORTS: false, CREATE_EMPLOYEE: false, CREATE_BRANCH: false, MANAGE_SUBSCRIPTIONS: false, BYPASS_BIOMETRICS: false },
    CUSTOMER:      { CREATE_DOCUMENT: false, EDIT_DOCUMENT: false, DELETE_DOCUMENT: false, VIEW_REPORTS: false, CREATE_EMPLOYEE: false, CREATE_BRANCH: false, MANAGE_SUBSCRIPTIONS: false, BYPASS_BIOMETRICS: false },
  });

  // ── On mount: check if a valid session already exists ─────────────────────
  useEffect(() => {
    (async () => {
      try {
        // Try to refresh the access token from httpOnly cookie
        const refreshRes = await authApi.refresh();
        setAccessToken(refreshRes.accessToken);

        // Fetch current user
        const me = await authApi.me();
        setCurrentUser({
          id:       me.id,
          role:     me.role as ActiveUser["role"],
          username: me.fullName,
          email:    me.email,
          tenantId: me.tenantId,
        });
      } catch {
        // No valid session — show login
      } finally {
        setBootstrapping(false);
      }
    })();
  }, []);

  // ── Load data when user logs in ───────────────────────────────────────────
  const loadDataForUser = useCallback(async (user: ActiveUser) => {
    try {
      if (user.role === "SUPER_ADMIN") {
        const res = await tenantsApi.list();
        setTenants(res.tenants);
        // Load all branches for all tenants
        const allBranches = await Promise.all(
          res.tenants.map(t => branchesApi.list(t.id).then(r => r.branches))
        );
        setBranches(allBranches.flat());
      } else if (user.tenantId) {
        const [tenantRes, branchRes, empRes] = await Promise.all([
          tenantsApi.get(user.tenantId),
          branchesApi.list(user.tenantId),
          employeesApi.listByTenant(user.tenantId),
        ]);
        setTenants([tenantRes.tenant]);
        setBranches(branchRes.branches);
        setEmployees(empRes.employees);
      }
    } catch (err) {
      console.error("[Dashboard] Failed to load data:", err);
    }
  }, []);

  const handleLogin = useCallback(async (user: ActiveUser) => {
    setCurrentUser(user);
    setActiveTab("dashboard");
    await loadDataForUser(user);
  }, [loadDataForUser]);

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors on logout
    }
    setAccessToken(null);
    setCurrentUser(null);
    setActiveTab("dashboard");
    setTenants([]);
    setBranches([]);
    setEmployees([]);
  }, []);

  // ── Tenant CRUD (SUPER_ADMIN) ─────────────────────────────────────────────
  const handleAddTenant = useCallback(async (
    name: string, subdomain: string, plan: Tenant["plan"], email?: string, licenseNumber?: string
  ) => {
    const res = await tenantsApi.create({ name, subdomain, plan, email, licenseNumber });
    setTenants(prev => [...prev, res.tenant]);
  }, []);

  const handleToggleTenantStatus = useCallback(async (id: string) => {
    const tenant = tenants.find(t => t.id === id);
    if (!tenant) return;
    const newStatus = tenant.status === "active" ? "suspended" : "active";
    const res = await tenantsApi.update(id, { status: newStatus });
    setTenants(prev => prev.map(t => t.id === id ? res.tenant : t));
  }, [tenants]);

  const handleDeleteTenant = useCallback(async (id: string) => {
    await tenantsApi.delete(id);
    setTenants(prev => prev.filter(t => t.id !== id));
    setBranches(prev => prev.filter(b => b.tenant_id !== id));
    setEmployees(prev => prev.filter(e => e.tenant_id !== id));
  }, []);

  // ── Branch CRUD ───────────────────────────────────────────────────────────
  const handleAddBranch = useCallback(async (name: string, address: string, phone: string) => {
    if (!currentUser?.tenantId) return;
    const res = await branchesApi.create(currentUser.tenantId, { name, address, phone });
    setBranches(prev => [...prev, res.branch]);
  }, [currentUser]);

  const handleEditBranch = useCallback(async (
    branchId: string, name: string, address: string, phone: string, countersCount: number
  ) => {
    if (!currentUser?.tenantId) return;
    const res = await branchesApi.update(currentUser.tenantId, branchId, {
      name, address, phone, countersCount,
    });
    setBranches(prev => prev.map(b => b.id === branchId ? res.branch : b));
  }, [currentUser]);

  const handleDeleteBranch = useCallback(async (branchId: string) => {
    if (!currentUser?.tenantId) return;
    await branchesApi.delete(currentUser.tenantId, branchId);
    setBranches(prev => prev.filter(b => b.id !== branchId));
    setEmployees(prev => prev.filter(e => e.branch_id !== branchId));
  }, [currentUser]);

  // ── Employee CRUD ─────────────────────────────────────────────────────────
  const handleAddEmployee = useCallback(async (
    branchId: string, name: string, email: string, role: Employee["job_role"], password: string
  ) => {
    if (!currentUser?.tenantId) return;
    const res = await employeesApi.create(currentUser.tenantId, branchId, {
      email, password, fullName: name, jobRole: role,
    });
    setEmployees(prev => [...prev, res.employee]);
  }, [currentUser]);

  const handleEditEmployee = useCallback(async (
    empId: string, name: string, _email: string, role: Employee["job_role"], branchId: string
  ) => {
    if (!currentUser?.tenantId) return;
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const res = await employeesApi.update(currentUser.tenantId, emp.branch_id, empId, {
      fullName: name, jobRole: role, branchId,
    });
    setEmployees(prev => prev.map(e => e.id === empId ? res.employee : e));
  }, [currentUser, employees]);

  const handleDeleteEmployee = useCallback(async (empId: string) => {
    if (!currentUser?.tenantId) return;
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    await employeesApi.delete(currentUser.tenantId, emp.branch_id, empId);
    setEmployees(prev => prev.filter(e => e.id !== empId));
  }, [currentUser, employees]);

  const handleToggleEmployeeStatus = useCallback(async (empId: string) => {
    if (!currentUser?.tenantId) return;
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const newStatus: Employee["status"] = emp.status === "active" ? "offline" : "active";
    const res = await employeesApi.setStatus(
      currentUser.tenantId, emp.branch_id, empId, newStatus
    );
    setEmployees(prev => prev.map(e => e.id === empId ? res.employee : e));
  }, [currentUser, employees]);

  const handleToggleEmployeeSuspend = useCallback(async (empId: string) => {
    if (!currentUser?.tenantId) return;
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const newStatus: Employee["status"] = emp.status === "suspended" ? "active" : "suspended";
    const res = await employeesApi.setStatus(
      currentUser.tenantId, emp.branch_id, empId, newStatus
    );
    setEmployees(prev => prev.map(e => e.id === empId ? res.employee : e));
  }, [currentUser, employees]);

  const handleResetEmployeePassword = useCallback(async (empId: string) => {
    if (!currentUser?.tenantId) return;
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const newPassword = prompt("Enter new password for employee (min 8 chars, must include uppercase, number, special char):");
    if (!newPassword) return;
    await employeesApi.resetPassword(
      currentUser.tenantId, emp.branch_id, empId, newPassword
    );
    alert("Password reset successfully.");
  }, [currentUser, employees]);

  // ── AI Chat ───────────────────────────────────────────────────────────────
  const handleChatSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: "user", content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    const term = chatInput;
    setChatInput("");
    setChatLoading(true);

    try {
      const token = getAccessToken();
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ messages: [...chatMessages, userMsg] }),
      });
      const result = await response.json();
      if (result.success) {
        setChatMessages(prev => [...prev, { role: "model", content: result.reply }]);
      } else {
        setChatMessages(prev => [
          ...prev,
          { role: "model", content: "Sorry, the AI assistant is unavailable. Please check that a Gemini API key is configured." },
        ]);
      }
    } catch {
      setChatMessages(prev => [
        ...prev,
        { role: "model", content: "Connection error. Please try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatMessages]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (bootstrapping) {
    return (
      <div className="flex-1 w-full flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading NotaryHub…</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // ── Sidebar links by role ─────────────────────────────────────────────────
  const sidebarLinks: Record<string, { id: string; label: string; icon: React.ReactNode }[]> = {
    SUPER_ADMIN: [
      { id: "dashboard",   label: "Platform Console",   icon: <Layers className="w-4 h-4 text-blue-600" /> },
      { id: "permissions", label: "Access Rules",        icon: <Database className="w-4 h-4 text-emerald-600" /> },
      { id: "legal-ai",    label: "AI Assistant",        icon: <Bot className="w-4 h-4 text-indigo-600" /> },
    ],
    COMPANY_ADMIN: [
      { id: "dashboard",   label: "Corporate Workspace", icon: <Building2 className="w-4 h-4 text-teal-600" /> },
      { id: "legal-ai",    label: "AI Assistant",        icon: <Bot className="w-4 h-4 text-teal-600" /> },
    ],
    BRANCH_ADMIN: [
      { id: "dashboard",   label: "Branch Admin",        icon: <Building2 className="w-4 h-4 text-indigo-600" /> },
      { id: "legal-ai",    label: "AI Assistant",        icon: <Bot className="w-4 h-4 text-indigo-600" /> },
    ],
    EMPLOYEE: [
      { id: "dashboard",   label: "Duty Station",        icon: <Users className="w-4 h-4 text-amber-600" /> },
      { id: "legal-ai",    label: "AI Assistant",        icon: <Bot className="w-4 h-4 text-amber-600" /> },
    ],
    CUSTOMER: [
      { id: "dashboard",   label: "Client Lobby",        icon: <Building2 className="w-4 h-4 text-purple-600" /> },
      { id: "legal-ai",    label: "AI Assistant",        icon: <Bot className="w-4 h-4 text-purple-600" /> },
    ],
  };

  const links = sidebarLinks[currentUser.role] ?? [];

  // ── Main content ──────────────────────────────────────────────────────────
  const renderContent = () => {
    if (activeTab === "permissions" && currentUser.role === "SUPER_ADMIN") {
      return (
        <PermissionsConfig
          permissionsMatrix={permissionsMatrix}
          onUpdatePermissions={setPermissionsMatrix}
        />
      );
    }

    if (activeTab === "legal-ai") {
      return (
        <div className="space-y-5">
          <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex items-start gap-3">
            <Bot className="w-5 h-5 text-blue-600 mt-0.5 shrink-0 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">NotaryHub AI Legal Assistant</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ask about notary procedures, deed formatting, Power of Attorney, or compliance requirements.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 h-[420px] flex flex-col shadow-sm">
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-left">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`p-3.5 rounded-2xl max-w-md text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-slate-950 text-white rounded-br-none"
                      : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none"
                  }`}>
                    {msg.role === "model" && (
                      <span className="text-[9px] text-teal-600 block tracking-wider uppercase font-bold mb-1">
                        AI ASSISTANT:
                      </span>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 flex items-center gap-1.5 rounded-bl-none animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    Generating response…
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleChatSend} className="mt-4 pt-4 border-t border-slate-200 flex gap-2 shrink-0">
              <input
                type="text"
                required
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask about notary law, procedures, or document requirements…"
                className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-300 text-xs px-3.5 py-3 rounded-xl text-slate-900 outline-none transition"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs px-5 rounded-xl flex items-center gap-1 transition"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>
          </div>
        </div>
      );
    }

    // Role-based portal
    switch (currentUser.role) {
      case "SUPER_ADMIN":
        return (
          <SuperAdminPortal
            tenants={tenants}
            onAddTenant={handleAddTenant}
            onToggleTenantStatus={handleToggleTenantStatus}
            onDeleteTenant={handleDeleteTenant}
            branches={branches}
            employees={employees}
            appointments={[]}
            queue={[]}
            documents={[]}
            invoices={[]}
            auditLogs={[]}
            metrics={[]}
            featureFlags={{ ocr: true, docGen: true, voiceChime: true }}
            onToggleFeature={() => {}}
            onLogout={handleLogout}
            permissionsMatrix={permissionsMatrix}
            onUpdatePermissions={setPermissionsMatrix}
          />
        );

      case "COMPANY_ADMIN":
        return (
          <CompanyAdminPortal
            tenants={tenants}
            selectedTenantId={currentUser.tenantId ?? ""}
            onSelectTenant={() => {}}
            branches={branches.filter(b => b.tenant_id === currentUser.tenantId)}
            onAddBranch={handleAddBranch}
            onEditBranch={handleEditBranch}
            onDeleteBranch={handleDeleteBranch}
            onToggleArchiveBranch={() => {}}
            employees={employees.filter(e => e.tenant_id === currentUser.tenantId)}
            onAddEmployee={handleAddEmployee}
            onEditEmployee={handleEditEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onToggleArchiveEmployee={() => {}}
            onToggleEmployeeStatus={handleToggleEmployeeStatus}
            onToggleEmployeeSuspend={handleToggleEmployeeSuspend}
            onResetEmployeePassword={handleResetEmployeePassword}
            invoices={[]}
            onPayInvoice={() => {}}
            appointments={[]}
            queue={[]}
            documents={[]}
            lockTenant={true}
            onLogout={handleLogout}
            auditLogs={[]}
            permissionsMatrix={permissionsMatrix}
            onUpdatePermissions={setPermissionsMatrix}
          />
        );

      case "BRANCH_ADMIN": {
        const myBranch = branches.find(b =>
          employees.some(e => e.user_id === currentUser.id && e.branch_id === b.id)
        );
        return (
          <BranchAdminPortal
            branches={myBranch ? [myBranch] : []}
            employees={employees.filter(e => e.branch_id === myBranch?.id)}
            appointments={[]}
            queue={[]}
            documents={[]}
            onLogout={handleLogout}
          />
        );
      }

      case "EMPLOYEE":
        return (
          <EmployeePortal
            queue={[]}
            onAnnounceTicket={() => {}}
            onAdvanceTicketStatus={() => {}}
            ocrLoading={false}
            ocrData={null}
            onIdentityOcrScan={() => {}}
            docTemplate=""
            setDocTemplate={() => {}}
            docPrincipal=""
            setDocPrincipal={() => {}}
            docAgent={currentUser.username}
            setDocAgent={() => {}}
            docJurisdiction=""
            setDocJurisdiction={() => {}}
            docClauses=""
            setDocClauses={() => {}}
            docGenerating={false}
            draftedDocContent=""
            onTriggerDocumentDraft={() => {}}
            activeCreatedDoc={null}
            onCommitSignaturesAndNotarize={() => {}}
            fingerprintReady={false}
            capturedFingerHash=""
            biometricScanRunning={false}
            biometricProgress={0}
            onTriggerFingerprintScan={() => {}}
            canvasRef={{ current: null }}
            onStartDrawing={() => {}}
            onDraw={() => {}}
            onStopDrawing={() => {}}
            onClearSignature={() => {}}
            hasSignature={false}
            isAllowedCreateDoc={permissionsMatrix.EMPLOYEE?.CREATE_DOCUMENT}
            isAllowedBypassBio={permissionsMatrix.EMPLOYEE?.BYPASS_BIOMETRICS}
            onLogout={handleLogout}
          />
        );

      case "CUSTOMER":
        return (
          <CustomerPortal
            branches={branches.filter(b => b.tenant_id === currentUser.tenantId)}
            appointments={[]}
            onBookAppointment={() => {}}
            documents={[]}
            invoices={[]}
            onPayInvoice={() => {}}
            onLogout={handleLogout}
          />
        );

      default:
        return (
          <div className="p-8 text-center">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <p className="text-sm text-slate-600">Unknown role. Please log out and try again.</p>
          </div>
        );
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-slate-900 text-sm">NotaryHub</span>
          <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-full">
            {currentUser.role}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:block">{currentUser.email}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-500 hover:text-rose-600 transition font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-[calc(100vh-53px)]">
        {/* Sidebar */}
        <div className="w-52 shrink-0 bg-white border-r border-slate-200 p-3 hidden sm:block">
          <p className="text-[9.5px] font-mono text-slate-400 px-2.5 pb-2 pt-1 uppercase tracking-widest font-bold">
            Navigation
          </p>
          <nav className="space-y-1">
            {links.map(link => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center gap-2.5 transition-all ${
                    isActive
                      ? "bg-slate-100 text-slate-900 font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                  {isActive && link.id === "dashboard" && (
                    <span className="ml-auto w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
