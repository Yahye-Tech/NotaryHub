import { useState } from "react";
import { 
  Folder, FolderOpen, FileCode, Check, Copy, Shield, Database, Lock, 
  ChevronRight, Network, Layout, Key, Sparkles, Sliders, Play, Terminal
} from "lucide-react";

interface FileNode {
  name: string;
  type: "file" | "folder";
  path: string;
  category: "Routing & Shell" | "Contexts & Auth" | "Active Dashboards" | "Reusable Components" | "Custom Hooks";
  description: string;
  code: string;
  children?: FileNode[];
}

export default function ReactFrontendArchitecture() {
  const [selectedFilePath, setSelectedFilePath] = useState<string>("src/routes/AppRoutes.tsx");
  const [copied, setCopied] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "src": true,
    "src/routes": true,
    "src/layouts": true,
    "src/context": true,
    "src/pages": true,
    "src/pages/dashboard": true,
    "src/pages/documents": true,
    "src/components": true,
    "src/components/common": true,
    "src/hooks": true,
  });

  const handleToggleFolder = (path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const files: FileNode[] = [
    {
      name: "src",
      type: "folder",
      path: "src",
      category: "Routing & Shell",
      description: "React client source directory.",
      code: "",
      children: [
        {
          name: "routes",
          type: "folder",
          path: "src/routes",
          category: "Routing & Shell",
          description: "Path structures, tenant guards, and auth boundaries.",
          code: "",
          children: [
            {
              name: "AppRoutes.tsx",
              type: "file",
              category: "Routing & Shell",
              path: "src/routes/AppRoutes.tsx",
              description: "Configures sub-routes for SaaS, mapping public registers and auth-locked dashboards with tenant domain lookups.",
              code: `import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import TenantDashboardLayout from "../layouts/TenantDashboardLayout";
import Login from "../pages/auth/Login";
import NotaryQueueView from "../pages/dashboard/NotaryQueueView";
import DocumentSealer from "../pages/documents/DocumentSealer";
import TenantRegister from "../pages/tenants/TenantRegister";

/**
 * High-performance App Router with lazy authentication resolution.
 * Automatically enforces both active tenant context and authority guards before loading views.
 */
export default function AppRoutes() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const { currentTenant, isTenantLoading } = useTenant();

  if (isAuthLoading || isTenantLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-450 font-mono">Loading Tenant Environment...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Dynamic onboarding path when a user wants to configure a new subdomain node */}
      <Route path="/register" element={<TenantRegister />} />

      {/* Login workspace for the resolved subdomain environment */}
      <Route 
        path="/login" 
        element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard/queue" replace />} 
      />

      {/* Main SaaS Operating Layout containing nested guards */}
      <Route 
        path="/dashboard" 
        element={isAuthenticated ? <TenantDashboardLayout /> : <Navigate to="/login" replace />}
      >
        {/* Notary Active Desk Reception Line Queue */}
        <Route path="queue" element={<NotaryQueueView />} />
        
        {/* Interactive Document stamp workflow and sealing desk */}
        <Route path="documents/seal/:id" element={<DocumentSealer />} />

        {/* Fallback to sub-route layout root */}
        <Route path="" element={<Navigate to="queue" replace />} />
      </Route>

      {/* Direct wildcard routing matching tenant domain conditions */}
      <Route path="*" element={<Navigate to="/dashboard/queue" replace />} />
    </Routes>
  );
}`
            }
          ]
        },
        {
          name: "layouts",
          type: "folder",
          path: "src/layouts",
          category: "Routing & Shell",
          description: "Visual frames containing navigation sidebars and active profile widgets.",
          code: "",
          children: [
            {
              name: "TenantDashboardLayout.tsx",
              type: "file",
              category: "Routing & Shell",
              path: "src/layouts/TenantDashboardLayout.tsx",
              description: "Wraps operating views, presenting a corporate desk dashboard customized to the tenant's exact visual theme and subscription status.",
              code: `import { Outlet, Link, useLocation } from "react-router-dom";
import { useTenant } from "../context/TenantContext";
import { useAuth } from "../context/AuthContext";
import { 
  Users, FileSignature, LogOut, ShieldAlert, Award, Grid, HelpCircle
} from "lucide-react";

/**
 * Responsive Desktop shell serving authenticated notary personnel.
 * Adapts brand assets, company names, and active licenses to match custom browser subdomains.
 */
export default function TenantDashboardLayout() {
  const { currentTenant } = useTenant();
  const { currentUser, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: "Active Service Queue", path: "/dashboard/queue", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <div className="flex flex-1">
        
        {/* Elegant Dashboard Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-950 p-5 flex flex-col justify-between hidden md:flex">
          <div className="space-y-6">
            
            {/* SaaS Client Branding header */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850">
              <p className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">Active Workspace</p>
              <h2 className="text-white text-sm font-semibold truncate mt-1">
                {currentTenant?.name || "Notary Office Desk"}
              </h2>
              <span className="inline-flex items-center gap-1.5 text-[9px] text-cyan-400 font-mono mt-2 bg-cyan-950/40 border border-cyan-800/35 px-2 py-0.5 rounded-full uppercase">
                <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                {currentTenant?.tier} Edition
              </span>
            </div>

            {/* Main Navigation Links */}
            <nav className="space-y-1">
              {navigation.map(item => {
                const isActive = location.pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={\`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all \${
                      isActive 
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 font-semibold" 
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                    }\`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User profile with active notary credentials badge */}
          <div className="space-y-4 pt-4 border-t border-slate-850">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center font-bold text-xs uppercase text-white shadow">
                {currentUser?.fullName?.charAt(0) || "N"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{currentUser?.fullName}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{currentUser?.role?.name}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-mono border border-slate-800 hover:border-red-900 hover:text-red-300 text-slate-400 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out Session</span>
            </button>
          </div>
        </aside>

        {/* Dynamic content canvas */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
          {/* Top header navigation overlay for responsive views */}
          <header className="h-14 bg-slate-900 border-b border-slate-950 flex md:hidden items-center justify-between px-6">
            <h1 className="text-xs font-bold font-mono tracking-tight text-white uppercase truncate">
              {currentTenant?.name} Dashboard
            </h1>
          </header>

          <div className="p-6 md:p-8 flex-1">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}`
            }
          ]
        },
        {
          name: "context",
          type: "folder",
          path: "src/context",
          category: "Contexts & Auth",
          description: "Global context files keeping state persistent inside single-page sessions.",
          code: "",
          children: [
            {
              name: "TenantContext.tsx",
              type: "file",
              category: "Contexts & Auth",
              path: "src/context/TenantContext.tsx",
              description: "Detects the subdomain dynamically from browser locations and queries metadata limits from the SaaS server.",
              code: `import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

export interface TenantConfig {
  id: string;
  name: string;
  subdomain: string;
  tier: "basic" | "professional" | "enterprise";
  status: "active" | "suspended" | "trial_expired";
  dbSchema: string;
}

interface TenantContextProps {
  currentTenant: TenantConfig | null;
  isTenantLoading: boolean;
  tenantError: string | null;
  resolveSubdomain: () => string;
}

const TenantContext = createContext<TenantContextProps | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<TenantConfig | null>(null);
  const [isTenantLoading, setIsTenantLoading] = useState<boolean>(true);
  const [tenantError, setTenantError] = useState<string | null>(null);

  /**
   * Translates active host prefixes (e.g., 'california.notarysaas.com') 
   * into precise database routing strings.
   */
  const resolveSubdomain = (): string => {
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    
    // Fallback sandbox test environment subdomain identifier
    if (parts.length <= 1 || parts[0] === "localhost" || parts[0].includes("run")) {
      return "california-notaries"; 
    }
    return parts[0].toLowerCase();
  };

  useEffect(() => {
    const fetchTenantConfiguration = async () => {
      const subdomain = resolveSubdomain();
      try {
        setIsTenantLoading(true);
        // Call internal security middleware checking register configurations
        const response = await axios.get(\`/api/tenants/resolve/\${subdomain}\`);
        setCurrentTenant(response.data);
        setTenantError(null);
      } catch (err: any) {
        setTenantError(err.response?.data?.error || "Workspace subdomain not registered");
        setCurrentTenant(null);
      } finally {
        setIsTenantLoading(false);
      }
    };

    fetchTenantConfiguration();
  }, []);

  return (
    <TenantContext.Provider value={{ currentTenant, isTenantLoading, tenantError, resolveSubdomain }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenant must be consumed inside a TenantProvider");
  return context;
};`
            },
            {
              name: "AuthContext.tsx",
              type: "file",
              category: "Contexts & Auth",
              path: "src/context/AuthContext.tsx",
              description: "Maintains session tokens inside storage and implements role checks dynamically.",
              code: `import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

export interface Permission {
  id: string;
  code: string;
  name: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  commissionNumber?: string;
  status: string;
  role: Role;
}

interface AuthContextProps {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hasPermission: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkActiveSession = () => {
      const storedToken = localStorage.getItem("saas_jwt_token");
      const storedUser = localStorage.getItem("saas_user_profile");

      if (storedToken && storedUser) {
        setCurrentUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        axios.defaults.headers.common["Authorization"] = \`Bearer \${storedToken}\`;
      }
      setIsAuthLoading(false);
    };

    checkActiveSession();
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem("saas_jwt_token", token);
    localStorage.setItem("saas_user_profile", JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
    axios.defaults.headers.common["Authorization"] = \`Bearer \${token}\`;
  };

  const logout = () => {
    localStorage.removeItem("saas_jwt_token");
    localStorage.removeItem("saas_user_profile");
    setCurrentUser(null);
    setIsAuthenticated(false);
    delete axios.defaults.headers.common["Authorization"];
  };

  /**
   * High-security dynamic RBAC shield.
   * Matches granular permission codes (e.g. 'document:seal') to allow individual UI actions.
   */
  const hasPermission = (code: string): boolean => {
    if (!currentUser || !currentUser.role) return false;
    
    // Admin override has permission automatically
    if (currentUser.role.code === "branch_admin" || currentUser.role.code === "super_admin") {
      return true;
    }
    
    return currentUser.role.permissions.some(p => p.code === code);
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated, isAuthLoading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be consumed inside an AuthProvider");
  return context;
};`
            }
          ]
        },
        {
          name: "pages",
          type: "folder",
          path: "src/pages",
          category: "Active Dashboards",
          description: "Visual route page screens designed for specific actions.",
          code: "",
          children: [
            {
              name: "dashboard",
              type: "folder",
              path: "src/pages/dashboard",
              category: "Active Dashboards",
              description: "Active status boards monitoring live data lines.",
              code: "",
              children: [
                {
                  name: "NotaryQueueView.tsx",
                  type: "file",
                  category: "Active Dashboards",
                  path: "src/pages/dashboard/NotaryQueueView.tsx",
                  description: "Renders the reception lines that notary staff monitor, showing waiting clients and desk assignments.",
                  code: `import { useState, useEffect } from "react";
import axios from "axios";
import { UserCheck, RefreshCw, AlertCircle, PlayCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export interface QueueTicket {
  id: string;
  ticketNumber: string; // e.g. NOT-102
  serviceType: string;
  status: "waiting" | "calling" | "serving" | "completed";
  calledAt?: string;
  servedBy?: string;
}

export default function NotaryQueueView() {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchActiveQueue = async () => {
    try {
      setIsRefreshing(true);
      const response = await axios.get("/api/notary/queue/active");
      setTickets(response.data);
    } catch (err) {
      console.error("Failed to load active line tickets", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActiveQueue();
    // Real-time server polling interval set to 5000ms
    const interval = setInterval(fetchActiveQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCallClient = async (id: string) => {
    try {
      await axios.post(\`/api/notary/queue/\${id}/call\`);
      fetchActiveQueue();
    } catch (err) {
      alert("Error call operations failed");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Action banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-sans font-bold text-white tracking-tight">Active Service Desk Queue</h2>
          <p className="text-xs text-slate-400 mt-1">Manage waiting visitors and process document registrations.</p>
        </div>
        <button
          onClick={fetchActiveQueue}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono hover:bg-slate-900 transition-all text-slate-300 disabled:opacity-50"
        >
          <RefreshCw className={\`w-3.5 h-3.5 \${isRefreshing ? "animate-spin text-indigo-400" : ""}\`} />
          <span>Force Refresh</span>
        </button>
      </div>

      {/* Main tickets metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl">
          <p className="text-[10px] font-mono text-slate-500 uppercase">Waiting Patrons</p>
          <h3 className="text-2xl font-bold font-mono text-white mt-1">
            {tickets.filter(t => t.status === "waiting").length}
          </h3>
        </div>
        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl">
          <p className="text-[10px] font-mono text-slate-500 uppercase">Calling Desks</p>
          <h3 className="text-2xl font-bold font-mono text-indigo-400 mt-1">
            {tickets.filter(t => t.status === "calling").length}
          </h3>
        </div>
        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl">
          <p className="text-[10px] font-mono text-slate-500 uppercase">Sealed Today</p>
          <h3 className="text-2xl font-bold font-mono text-emerald-400 mt-1">14</h3>
        </div>
      </div>

      {/* Responsive Line table */}
      <div className="bg-slate-900 border border-slate-850 rounded-xl overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-slate-950 flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Queue Position</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse"></span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs font-mono">
            Reading security queue ticket records...
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No active clients registered in the waiting queue.
          </div>
        ) : (
          <div className="divide-y divide-slate-950">
            {tickets.map(ticket => (
              <div key={ticket.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-850/50 transition">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-950 font-mono font-bold text-sm text-indigo-400 flex items-center justify-center rounded-lg border border-slate-850 shadow-inner">
                    {ticket.ticketNumber}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white uppercase">{ticket.serviceType}</h4>
                    <span className={\`inline-flex items-center gap-1 text-[9px] font-mono py-0.5 rounded-full mt-1.5 uppercase \${
                      ticket.status === "waiting" 
                        ? "text-slate-400" 
                        : ticket.status === "calling" 
                        ? "text-indigo-400 animate-pulse" 
                        : "text-emerald-400 font-bold"
                    }\`}>
                      ● {ticket.status}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {ticket.status === "waiting" ? (
                    <button
                      onClick={() => handleCallClient(ticket.id)}
                      className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 font-mono text-[10px] text-white px-3 py-1.5 rounded-md shadow font-semibold transition"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Process and Call</span>
                    </button>
                  ) : (
                    <Link
                      to={\`/dashboard/documents/seal/\${ticket.id}\`}
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 font-mono text-[10px] text-white px-3 py-1.5 rounded-md shadow font-semibold transition"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Open Sealing Desk</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}`
                }
              ]
            },
            {
              name: "documents",
              type: "folder",
              path: "src/pages/documents",
              category: "Active Dashboards",
              description: "Interactive tools ensuring real-world legally binding actions.",
              code: "",
              children: [
                {
                  name: "DocumentSealer.tsx",
                  type: "file",
                  category: "Active Dashboards",
                  path: "src/pages/documents/DocumentSealer.tsx",
                  description: "Displays PDF/Markdown interfaces, rendering a dynamic signature pane for user execution and sealing.",
                  code: `import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SignaturePad from "../../components/common/SignaturePad";
import { Award, FileText, CheckCircle, Shield, RotateCcw } from "lucide-react";
import axios from "axios";

export default function DocumentSealer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [stampSerial, setStampSerial] = useState<string>("US-COMM-9812-CAL");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [sealedRecord, setSealedRecord] = useState<any | null>(null);

  const handleSignCapture = (vectorPathJson: string) => {
    setSignatureData(vectorPathJson);
  };

  const handleSealConfirm = async () => {
    if (!signatureData) {
      alert("Please capture physical digital trace signatures on the touchpad workspace.");
      return;
    }

    try {
      setIsSubmitting(true);
      // Calls Spring Boot backend secure controller
      const payload = {
        signaturePathJson: signatureData,
        ipAddress: "192.168.1.34",
        certificateSerial: stampSerial
      };

      const response = await axios.post(\`/api/notary/documents/\${id}/seal\`, payload);
      setSealedRecord(response.data);
    } catch (err: any) {
      alert("AOP Aspect intercept validation exception thrown by the backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto items-stretch">
      
      {/* File Details pane (Col 7) */}
      <div className="lg:col-span-7 space-y-6 flex flex-col">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="text-indigo-400 w-5 h-5" />
          Tamper-Evident Sign Board
        </h3>

        <div className="bg-slate-900 border border-slate-850 p-6 rounded-xl flex-1 flex flex-col justify-between prose max-w-none text-slate-300">
          <div>
            <h4 className="text-white text-base font-semibold border-b border-slate-850 pb-3 mb-4">
              AFFIDAVIT OF PROPERTY TITLE DISABILITY
            </h4>
            <p className="text-xs leading-relaxed text-slate-400">
              Pursuant to the California State Code Section 8224, I here declare under perjury 
              of laws and statutory regulation certificates that the estate inventory detailed above 
              represented transparent, legally non-ambiguous property valuations. No outstanding 
              mortgages or liquid collection liens currently exist upon partition boundaries.
            </p>
            
            <div className="mt-8 border border-slate-950 p-4 rounded bg-slate-950/40 text-[11px] font-mono">
              <span className="text-slate-500 font-bold uppercase block mb-1">Covenant Rules</span>
              <p className="text-slate-450 leading-loose">
                - Dynamic ID verification recorded : SUCCESSFUL<br />
                - Biometric verification matching threshold : 99.4%
              </p>
            </div>
          </div>

          {sealedRecord && (
            <div className="mt-6 border border-emerald-900 bg-emerald-950/20 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle className="w-4 h-4" />
                <span>STATE DOCUMENT SEAL LOCKED</span>
              </div>
              <p className="text-[10px] font-mono text-emerald-300 select-all truncate">
                Ledger Chain SHA-256 Hash: {sealedRecord.ledgerHash}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Signature & Seal controls (Col 5) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Interactive E-Signature Pad */}
        <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 shadow-lg flex flex-col">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wide font-bold mb-4">
            Interactive Notary Sign-Board
          </p>
          
          <SignaturePad onCapture={handleSignCapture} />

          {/* Electronic Seal Cert field inputs */}
          <div className="mt-5 space-y-3">
            <label className="text-[10px] font-mono text-slate-500 uppercase block font-bold">
              Commission License Serial
            </label>
            <input
              type="text"
              value={stampSerial}
              onChange={(e) => setStampSerial(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500/80 rounded-lg p-2.5 text-xs text-white outline-none transition font-mono"
            />
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSealConfirm}
              disabled={isSubmitting || !signatureData}
              className="flex-1 select-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs text-white font-semibold py-2.5 px-4 rounded-lg shadow-lg active:scale-98 transition-all"
            >
              <Shield className="w-4 h-4" />
              <span>Apply Cryptographic Stamp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}`
                }
              ]
            }
          ]
        },
        {
          name: "components",
          type: "folder",
          path: "src/components",
          category: "Reusable Components",
          description: "Global common UI assets which are reused extensively.",
          code: "",
          children: [
            {
              name: "common",
              type: "folder",
              path: "src/components/common",
              category: "Reusable Components",
              description: "Reusable form controls and canvas components.",
              code: "",
              children: [
                {
                  name: "SignaturePad.tsx",
                  type: "file",
                  category: "Reusable Components",
                  path: "src/components/common/SignaturePad.tsx",
                  description: "Features HTML5 multi-touch drawing context, saving the strokes JSON coordinates for secure validation.",
                  code: `import { useRef, useState, useEffect } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";

interface SignaturePadProps {
  onCapture: (vectorPathJson: string) => void;
}

/**
 * Legally compliant React trace drawing pad using Canvas contexts.
 * Extracts relative pixel vectors path matrix to guarantee transaction non-repudiation.
 */
export default function SignaturePad({ onCapture }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#818cf8"; // Indigo color
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
      }
    }
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      setPoints([]);
    }
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
    setPoints([{ x, y }]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
    const newPoints = [...points, { x, y }];
    setPoints(newPoints);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Convert coordinate vectors to JSON and dispatch up
    const jsonPath = JSON.stringify(points);
    onCapture(jsonPath);
  };

  return (
    <div className="space-y-3">
      <div className="bg-slate-950 border border-slate-850 rounded-lg overflow-hidden relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={180}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full bg-slate-950 cursor-crosshair block"
        />
        
        <div className="absolute right-3.5 bottom-3.5 flex gap-2">
          <button
            onClick={clearCanvas}
            className="p-1.5 rounded-md bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex gap-1.5 text-[9px] text-slate-500 font-mono items-start">
        <AlertTriangle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <p>Drawing coordinates trace validated and recorded automatically to prevent horizontal spoofing activities.</p>
      </div>
    </div>
  );
}`
                }
              ]
            }
          ]
        },
        {
          name: "hooks",
          type: "folder",
          path: "src/hooks",
          category: "Custom Hooks",
          description: "Utility abstractions fetching backend databases safely.",
          code: "",
          children: [
            {
              name: "useApi.ts",
              type: "file",
              category: "Custom Hooks",
              path: "src/hooks/useApi.ts",
              description: "Abstracts HTTP transactions, dynamically appending security bearer tokens and matching X-Tenant-Context details.",
              code: `import { useState, useCallback } from "react";
import axios, { AxiosRequestConfig } from "axios";
import { useTenant } from "../context/TenantContext";

/**
 * Custom api caller abstraction layer that manages headers and error mappings.
 */
export function useApi() {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState<boolean>(false);
  const [errorString, setErrorString] = useState<string | null>(null);

  const request = useCallback(async (
    url: string, 
    options: AxiosRequestConfig = {}
  ) => {
    setLoading(true);
    setErrorString(null);

    // Dynamic headers interception
    const config: AxiosRequestConfig = {
      ...options,
      headers: {
        ...options.headers,
        // Always pass tenant ID context to protect schema isolation
        "X-Tenant-ID": currentTenant?.id || "public"
      }
    };

    try {
      const response = await axios(url, config);
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.error || "Network transaction failure";
      setErrorString(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [currentTenant]);

  return { request, loading, error: errorString };
}`
            }
          ]
        }
      ]
    }
  ];

  const handleCopyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const findNodeByPath = (nodes: FileNode[], path: string): FileNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findNodeByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNode = findNodeByPath(files, selectedFilePath) || files[0].children![0].children![0];

  const renderTree = (nodes: FileNode[]) => {
    return nodes.map(node => {
      const isExpanded = expandedFolders[node.path];
      const hasChildren = node.children && node.children.length > 0;
      
      if (activeCategory !== "All") {
        if (node.type === "file" && node.category !== activeCategory) {
          return null;
        }
        if (node.type === "folder") {
          const visibleChildren = node.children?.filter(c => {
            if (c.type === "file") return c.category === activeCategory;
            const matchDeep = (n: FileNode): boolean => {
              if (n.type === "file") return n.category === activeCategory;
              return n.children?.some(matchDeep) || false;
            };
            return matchDeep(c);
          });
          if (!visibleChildren || visibleChildren.length === 0) return null;
        }
      }

      return (
        <div key={node.path} className="pl-3.5">
          <div 
            onClick={() => {
              if (node.type === "folder") {
                handleToggleFolder(node.path);
              } else {
                setSelectedFilePath(node.path);
                setCopied(false);
              }
            }}
            className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-xs cursor-pointer select-none transition-all ${
              node.type === "file" && selectedFilePath === node.path
                ? "bg-indigo-500/15 border-l-2 border-indigo-400 text-indigo-200 font-medium"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            {node.type === "folder" ? (
              <>
                <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-indigo-405 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-indigo-500 shrink-0" />
                )}
                <span className="font-mono text-slate-300">{node.name}</span>
              </>
            ) : (
              <>
                <FileCode className="w-4 h-4 text-cyan-400 pl-0.5 shrink-0" />
                <span className="font-mono">{node.name}</span>
                <span className="text-[9px] px-1 bg-slate-950 text-slate-500 rounded font-sans ml-auto scale-90">{node.category}</span>
              </>
            )}
          </div>
          
          {node.type === "folder" && isExpanded && node.children && (
            <div className="border-l border-slate-900 ml-2 mt-0.5">
              {renderTree(node.children)}
            </div>
          )}
        </div>
      );
    });
  };

  const categories = ["All", "Routing & Shell", "Contexts & Auth", "Active Dashboards", "Reusable Components", "Custom Hooks"];

  return (
    <div className="bg-slate-955 border border-slate-900 rounded-2xl p-6 text-slate-100 shadow-xl overflow-hidden h-full flex flex-col animate-fade-in" id="react-architecture">
      
      {/* Visual Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-sans font-semibold tracking-tight text-white flex items-center gap-2">
            <Layout className="text-indigo-400 w-5.5 h-5.5" />
            React Frontend Blueprint
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Browse corporate-grade React client files managing JWT Auth providers, custom Canvas signature capturing, subdomains tenant lookups, and API locks.
          </p>
        </div>

        {/* Custom Stats */}
        <div className="flex gap-2 text-[10px] font-mono text-slate-500 bg-slate-900/40 p-2 rounded-lg border border-slate-900">
          <div className="px-1.5 border-r border-slate-800"><span className="text-cyan-400">Context</span> State</div>
          <div className="px-1.5 border-r border-slate-800"><span className="text-indigo-400">HTML5</span> Canvas</div>
          <div className="px-1.5"><span className="text-emerald-400">X-Tenant-ID</span> Header</div>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5 pb-4 border-b border-slate-905 mb-6">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-[10px] font-mono transition-all outline-none ${
              activeCategory === cat
                ? "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-semibold"
                : "bg-slate-900/50 border border-transparent text-slate-500 hover:text-slate-350"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* File Explorer Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-0">
        
        {/* Packagers Explorer Tree (Col Span 4) */}
        <div className="lg:col-span-4 bg-slate-950/40 border border-slate-900 rounded-xl p-3 flex flex-col overflow-y-auto max-h-[550px]" id="packages-tree">
          <p className="text-[9px] font-mono text-slate-500 px-3 py-1.5 uppercase tracking-wider font-semibold border-b border-slate-900/80 mb-2">
            Workspace Shell Packages
          </p>
          <div className="space-y-0.5 select-none">{renderTree(files)}</div>
        </div>

        {/* Dynamic code editor viewer (Col Span 8) */}
        <div className="lg:col-span-8 flex flex-col bg-slate-950/60 border border-slate-900 rounded-xl overflow-hidden max-h-[550px]">
          
          {/* Active file metadata panel */}
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-950 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.3)] animate-pulse"></span>
              <p className="text-xs font-mono text-slate-200 tracking-tight truncate max-w-xs md:max-w-md">
                {selectedNode && selectedNode.path}
              </p>
            </div>
            {selectedNode && selectedNode.type === "file" && (
              <button
                onClick={() => handleCopyCode(selectedNode.code)}
                className="text-xs bg-slate-950 hover:bg-slate-800 active:bg-slate-950 border border-slate-800 hover:border-slate-700 font-medium text-slate-300 px-3 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all outline-none"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-450" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Document Code</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Description of active view specs */}
          <div className="bg-indigo-950/15 border-b border-slate-950 px-4 py-1.5 text-[10px] text-indigo-200 font-sans flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <b className="text-white">Design and Mechanism: </b> {selectedNode && selectedNode.description}
            </p>
          </div>

          {/* Core Code Blocks workspace */}
          <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-300 select-text leading-relaxed">
            {selectedNode && selectedNode.type === "file" ? (
              <pre className="whitespace-pre break-all">{selectedNode.code}</pre>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-550 italic text-xs">
                Select a code spec file inside packages tree to view its React template architecture.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
