import React, { useState, useEffect } from "react";
import { 
  Building2, Users, FileText, Calendar, CreditCard, 
  Settings, RefreshCw, Sparkles, Sliders, Check, 
  HelpCircle, ChevronRight, Bell, Search, Bot, 
  FileSpreadsheet, 
  LayoutDashboard, UserCheck, LogOut, Menu, X,
  Trash2, Edit, Edit3, Archive, KeyRound, Play, Plus, Clock, Shield, Sun, Moon
} from "lucide-react";
import { EmployeeForm, BranchForm, Modal, type EmployeeFormData, type BranchFormData } from "./FormComponents";
import { Tenant, Branch, Employee, QueueTicket, NotaryDocument, AuditLog } from "../types";
import PermissionsConfig, { type PermissionsMatrix } from "./PermissionsConfig";

// Import custom extracted sub-components
import CompanyAdminDashboard from "./company/CompanyAdminDashboard";
import CompanyAdminCustomers from "./company/CompanyAdminCustomers";
import CompanyAdminDocuments from "./company/CompanyAdminDocuments";
import CompanyAdminAppointments from "./company/CompanyAdminAppointments";
import CompanyAdminBilling from "./company/CompanyAdminBilling";
import CompanyBranchesTab from "./company/CompanyBranchesTab";
import CompanyEmployeesTab from "./company/CompanyEmployeesTab";
import { settingsApi, auditApi, type AuditLogEntry } from "../api/settings.api";
import { notificationsApi } from "../api/notifications.api";
import { ApiException, getAccessToken } from "../api/client";
import { usePortalTheme } from "../hooks/usePortalTheme";

interface CompanyAdminPortalProps {
  tenants: Tenant[];
  selectedTenantId: string;
  onSelectTenant: (id: string) => void;
  branches: Branch[];
  onAddBranch: (name: string, address: string, phone: string) => void;
  onEditBranch: (branchId: string, name: string, address: string, phone: string, countersCount: number) => void;
  onDeleteBranch: (branchId: string) => void;
  onToggleArchiveBranch: (branchId: string) => void;
  employees: Employee[];
  onAddEmployee: (branchId: string, name: string, email: string, role: Employee["job_role"], password: string) => void;
  onEditEmployee: (empId: string, name: string, email: string, role: Employee["job_role"], branchId: string) => void;
  onDeleteEmployee: (empId: string) => void;
  onToggleEmployeeStatus: (id: string) => void;
  onToggleEmployeeSuspend: (id: string) => void;
  onResetEmployeePassword: (id: string) => void;
  appointments: never[];
  queue: QueueTicket[];
  documents: NotaryDocument[];
  userRole?: string;
  lockTenant?: boolean;
  onLogout: () => void;
  // Dynamic role controls
  permissionsMatrix?: PermissionsMatrix;
  onUpdatePermissions?: (matrix: PermissionsMatrix) => void;
  // Audit Logs
  auditLogs?: AuditLog[];
}

export default function CompanyAdminPortal({
  tenants,
  selectedTenantId,
  onSelectTenant,
  branches,
  onAddBranch,
  onEditBranch,
  onDeleteBranch,
  onToggleArchiveBranch,
  employees,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onToggleEmployeeStatus,
  onToggleEmployeeSuspend,
  onResetEmployeePassword,
  appointments,
  queue,
  documents,
  userRole = "COMPANY_ADMIN",
  lockTenant = false,
  onLogout,
  permissionsMatrix,
  onUpdatePermissions,
  auditLogs = []
}: CompanyAdminPortalProps) {
  
  const activeTenant = tenants.find(t => t.id === selectedTenantId) || tenants[0] || { id: "ten-default", name: "Standard Workspace Profile", subdomain: "default-vault", status: "active", createdAt: "2026-06-12", plan: "Enterprise", dbSize: "0.1 MB", cpuUsage: 0.00 };
  
  // Minimalist multi-tab selector
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isDarkMode, setIsDarkMode] = usePortalTheme("portal-theme-company-admin");

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  
  // Right AI Assistant sidebar state
  const [showRightPanel, setShowRightPanel] = useState(false);

  // Notifications dropdown — populated from the real notifications system
  const [showNotificationList, setShowNotificationList] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; text: string; time: string; read: boolean }[]>([]);

  useEffect(() => {
    const loadNotifications = () => {
      notificationsApi.list({ limit: 10 })
        .then(res => {
          setNotifications(res.notifications.map(n => ({
            id: n.id,
            text: `${n.title} — ${n.body}`,
            time: new Date(n.created_at).toLocaleString(),
            read: n.is_read,
          })));
        })
        .catch(() => setNotifications([]));
    };
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Brand customize states
  const [primaryColor, setPrimaryColor] = useState("#2563EB");
  const [companyName, setCompanyName] = useState(activeTenant.name);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [complianceAuditLogs, setComplianceAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Form states inside portal
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");

  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empRole, setEmpRole] = useState<Employee["job_role"]>("NOTARY_OFFICER");
  const [empSpecificRole, setEmpSpecificRole] = useState<string>("Notary Officer");
  const [empBranchId, setEmpBranchId] = useState(branches[0]?.id ?? "");

  // Edit Modals and Form States
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editBranchName, setEditBranchName] = useState("");
  const [editBranchAddress, setEditBranchAddress] = useState("");
  const [editBranchPhone, setEditBranchPhone] = useState("");
  const [editBranchDesks, setEditBranchDesks] = useState(2);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editEmpName, setEditEmpName] = useState("");
  const [editEmpEmail, setEditEmpEmail] = useState("");
  const [editEmpRole, setEditEmpRole] = useState<Employee["job_role"]>("NOTARY_OFFICER");
  const [editEmpBranchId, setEditEmpBranchId] = useState("");

  // Veritas AI Chat State
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: "model", content: "Welcome, Administrator. I am the Veritas Compliance AI assistant. I can help analyze company transaction metrics, compile billing balance drafts, audit branch load patterns, or detail local deed frameworks. Ask me anything!" }
  ]);

  // Local collection clones for local operations if needed
  const [localBranches, setLocalBranches] = useState<Branch[]>(branches);
  const activeTenantBranches = localBranches.filter(b => b.tenant_id === activeTenant.id);
  const [localEmployees, setLocalEmployees] = useState<Employee[]>(employees);

  const [branchDeleteConfirmId, setBranchDeleteConfirmId] = useState<string | null>(null);
  const [employeeDeleteConfirmId, setEmployeeDeleteConfirmId] = useState<string | null>(null);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState<Employee | null>(null);
  const [showEditBranchModal, setShowEditBranchModal] = useState<Branch | null>(null);

  // Real-time synchronization of local clones to source parent database props to ensure instant UI automatic refreshes!
  useEffect(() => {
    setLocalBranches(branches);
  }, [branches]);

  useEffect(() => {
    setLocalEmployees(employees);
    if (employees.length > 0 && !empBranchId) {
      setEmpBranchId(branches[0]?.id ?? "");
    }
  }, [employees, branches]);

  // Hook to keep empBranchId in sync with the active tenant branches
  useEffect(() => {
    if (activeTenantBranches.length > 0) {
      const isCurrentValid = activeTenantBranches.some(b => b.id === empBranchId);
      if (!isCurrentValid) {
        setEmpBranchId(activeTenantBranches[0].id);
      }
    } else {
      setEmpBranchId("");
    }
  }, [selectedTenantId, branches, activeTenantBranches]);

  const handleBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !branchAddress.trim()) return;
    onAddBranch(branchName, branchAddress, branchPhone);
    alert(`Success!\n\nRegistered physical bureau office "${branchName}" into the company system database.`);
    setBranchName("");
    setBranchAddress("");
    setBranchPhone("");
  };

  const handleEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empEmail.trim()) {
      alert("Please fill out Name and Email credentials.");
      return;
    }
    if (!empBranchId || empBranchId === "") {
      alert("No active branch is selected or available under this company registry. Please register a physical branch under the 'Branches' tab first before onboarding staff.");
      return;
    }
    onAddEmployee(empBranchId, empName, empEmail, empRole, empPassword);
    alert(`Success!\n\nOnboarded staff clerk "${empName}".`);
    setEmpName("");
    setEmpEmail("");
    setEmpPassword("");
    setEmpPhone("");
    setIsOnboardModalOpen(false);
  };

  const handleToggleEmployeeStatusLocal = (id: string) => {
    onToggleEmployeeStatus(id);
    alert("Updated staff availability status.");
  };

  const handleToggleEmployeeSuspendLocal = (id: string) => {
    onToggleEmployeeSuspend(id);
    alert("Toggled security suspension lock status for clerk.");
  };

  const handleResetEmployeePasswordLocal = (id: string, name: string) => {
    onResetEmployeePassword(id);
    alert(`🔐 Security Token Regenerated for Clerk ${name}.\nA secure administrative reset sequence was recorded in compliance audit trails.`);
  };

  const handleBranchEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;
    onEditBranch(editingBranch.id, editBranchName, editBranchAddress, editBranchPhone, Number(editBranchDesks));
    setEditingBranch(null);
    alert("✓ Bureau details updated securely on the SaaS cloud database.");
  };

  const handleEmployeeEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    onEditEmployee(editingEmployee.id, editEmpName, editEmpEmail, editEmpRole, editEmpBranchId);
    setEditingEmployee(null);
    alert("✓ Staff registration dossier revised successfully.");
  };

  const handleToggleArchiveBranchLocal = async (bId: string) => {
    try {
      await onToggleArchiveBranch(bId);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to update branch archive status.");
    }
  };

  const handleDeleteBranchLocal = (bId: string, name: string) => {
    onDeleteBranch(bId);
  };

  const handleDeleteEmployeeLocal = (empId: string, name: string) => {
    onDeleteEmployee(empId);
  };

  // Chat request dispatch to model proxy server
  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const term = chatInput;
    setChatMessages(prev => [...prev, { role: "user", content: term }]);
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
        body: JSON.stringify({ messages: [{ role: "user", content: term }] })
      });
      const result = await response.json();
      if (result.success && result.reply) {
        setChatMessages(prev => [...prev, { role: "model", content: result.reply }]);
      } else {
        setChatMessages(prev => [...prev, {
          role: "model",
          content: "I couldn't reach the AI assistant just now. Please try again in a moment."
        }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: "model",
        content: "I couldn't reach the AI assistant just now. Please try again in a moment."
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCSVExport = () => {
    if (displayAuditLogs.length === 0) {
      alert("No audit log data available to export yet.");
      return;
    }
    const header = ["Timestamp", "Action", "Resource Type", "Resource", "User ID", "Branch ID", "IP Address"];
    const rows = displayAuditLogs.map(log => [
      log.created_at,
      log.action,
      log.resource_type ?? "",
      log.resource_label ?? log.resource_id ?? "",
      log.user_id ?? "",
      log.branch_id ?? "",
      log.ip_address ?? "",
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notary_audit_export_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!selectedTenantId) return;
    setCompanyName(activeTenant.name);
    settingsApi.get().then(res => {
      if (res.profile.primary_color) setPrimaryColor(res.profile.primary_color);
      if (res.profile.contact_name) setCompanyName(res.profile.contact_name);
    }).catch(() => {});
  }, [selectedTenantId, activeTenant.name]);

  useEffect(() => {
    if (activeTab !== "reports") return;
    setAuditLoading(true);
    auditApi.list({ limit: 50 })
      .then(res => setComplianceAuditLogs(res.logs))
      .catch(() => setComplianceAuditLogs([]))
      .finally(() => setAuditLoading(false));
  }, [activeTab, selectedTenantId]);

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      await settingsApi.update({ primaryColor, contactName: companyName });
      alert("Company settings saved successfully.");
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to save settings.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const displayAuditLogs = complianceAuditLogs.length > 0
    ? complianceAuditLogs.map(log => ({
        id: log.id,
        user_id: log.user_id,
        tenant_id: log.tenant_id,
        branch_id: log.branch_id,
        action: log.action,
        resource_type: log.resource_type ?? "auth",
        resource_id: log.resource_id,
        resource_label: log.resource_label,
        old_values: null,
        new_values: null,
        meta: log.actor_name ? { username: log.actor_name } : null,
        ip_address: log.ip_address,
        user_agent: null,
        created_at: log.created_at,
      }))
    : auditLogs;

  return (
    <div className={`flex flex-col md:flex-row bg-[#F8FAFC] rounded-xl overflow-hidden text-slate-800 font-sans border border-slate-200 shadow-sm min-h-[690px] relative dark-portal-wrapper ${isDarkMode ? "dark" : ""}`} id="company-admin-portal-root">
      
      {/* Mobile Header Bar with Hamburger for Company Admin */}
      <div className="md:hidden w-full bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-xs z-30">
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
            <Building2 className="w-5 h-5 text-indigo-650" />
            <div className="text-left animate-fade-in">
              <h1 className="text-xs font-bold text-slate-900 uppercase tracking-tight font-sans">Company Admin</h1>
              <span className="text-[10px] text-slate-500 truncate max-w-[150px] block">{companyName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-45 md:hidden transition-all duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 🧭 LEFT SIDEBAR NAV - Desktop and Mobile adaptive */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 p-4 shrink-0 flex flex-col justify-between transform transition-transform duration-300 md:relative md:transform-none md:inset-auto md:w-52 md:border-r md:border-b-0 md:bg-white ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`} 
        id="portal-left-sidebar"
      >
        <div className="space-y-4">
          
          <div className="p-1 flex items-center justify-between border-b border-slate-100 pb-3 md:border-none md:pb-0">
            <div className="md:block hidden">
              <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-400 block">PORTAL CONTROL</span>
              <h2 className="text-xs font-bold text-slate-900 mt-1 uppercase tracking-tight flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-700" />
                Company Admin
              </h2>
            </div>
            {/* Close button on mobile sidebar drawer */}
            <button 
              type="button" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-md transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Consolidated Desktop/Mobile vertical nav list */}
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }}
              style={activeTab === "dashboard" ? { backgroundColor: `${primaryColor}12`, color: primaryColor, borderLeftColor: primaryColor } : {}}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center gap-2.5 outline-none transition font-semibold border-l-4 border-l-transparent cursor-pointer select-none ${
                activeTab === "dashboard"
                  ? ""
                  : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </button>

            <button
              onClick={() => { setActiveTab("branches"); setIsMobileMenuOpen(false); }}
              style={activeTab === "branches" ? { backgroundColor: `${primaryColor}12`, color: primaryColor, borderLeftColor: primaryColor } : {}}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center gap-2.5 outline-none transition font-semibold border-l-4 border-l-transparent cursor-pointer select-none ${
                activeTab === "branches"
                  ? ""
                  : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Branches
            </button>

            <button
              onClick={() => { setActiveTab("employees"); setIsMobileMenuOpen(false); }}
              style={activeTab === "employees" ? { backgroundColor: `${primaryColor}12`, color: primaryColor, borderLeftColor: primaryColor } : {}}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center gap-2.5 outline-none transition font-semibold border-l-4 border-l-transparent cursor-pointer select-none ${
                activeTab === "employees"
                  ? ""
                  : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Employees
            </button>

            <button
              onClick={() => { setActiveTab("customers"); setIsMobileMenuOpen(false); }}
              style={activeTab === "customers" ? { backgroundColor: `${primaryColor}12`, color: primaryColor, borderLeftColor: primaryColor } : {}}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center gap-2.5 outline-none transition font-semibold border-l-4 border-l-transparent cursor-pointer select-none ${
                activeTab === "customers"
                  ? ""
                  : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Customers
            </button>

            <button
              onClick={() => { setActiveTab("documents"); setIsMobileMenuOpen(false); }}
              style={activeTab === "documents" ? { backgroundColor: `${primaryColor}12`, color: primaryColor, borderLeftColor: primaryColor } : {}}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center gap-2.5 outline-none transition font-semibold border-l-4 border-l-transparent cursor-pointer select-none ${
                activeTab === "documents"
                  ? ""
                  : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Documents
            </button>

            <button
              onClick={() => { setActiveTab("appointments"); setIsMobileMenuOpen(false); }}
              style={activeTab === "appointments" ? { backgroundColor: `${primaryColor}12`, color: primaryColor, borderLeftColor: primaryColor } : {}}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center gap-2.5 outline-none transition font-semibold border-l-4 border-l-transparent cursor-pointer select-none ${
                activeTab === "appointments"
                  ? ""
                  : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Appointments
            </button>

            <button
              onClick={() => { setActiveTab("billing"); setIsMobileMenuOpen(false); }}
              style={activeTab === "billing" ? { backgroundColor: `${primaryColor}12`, color: primaryColor, borderLeftColor: primaryColor } : {}}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center gap-2.5 outline-none transition font-semibold border-l-4 border-l-transparent cursor-pointer select-none ${
                activeTab === "billing"
                  ? ""
                  : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Billing & Revenue
            </button>

            <button
              onClick={() => { setActiveTab("reports"); setIsMobileMenuOpen(false); }}
              style={activeTab === "reports" ? { backgroundColor: `${primaryColor}12`, color: primaryColor, borderLeftColor: primaryColor } : {}}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center gap-2.5 outline-none transition font-semibold border-l-4 border-l-transparent cursor-pointer select-none ${
                activeTab === "reports"
                  ? ""
                  : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Reports Logs
            </button>

            <button
              onClick={() => { setActiveTab("settings"); setIsMobileMenuOpen(false); }}
              style={activeTab === "settings" ? { backgroundColor: `${primaryColor}12`, color: primaryColor, borderLeftColor: primaryColor } : {}}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center gap-2.5 outline-none transition font-semibold border-l-4 border-l-transparent cursor-pointer select-none ${
                activeTab === "settings"
                  ? ""
                  : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
          </nav>
        </div>

        {/* Desktop Admin Environment Details & Custom Log Out */}
        <div className="pt-3 border-t border-slate-200 hidden md:flex flex-col gap-2.5 text-[10px] text-slate-400 font-sans">
          <div>
            <span>Active Company:</span>
            <strong className="text-slate-700 font-bold truncate leading-tight block">{companyName}</strong>
          </div>
          <button
            onClick={onLogout}
            className="w-full mt-1.5 py-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-sans font-bold flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Portal</span>
          </button>
        </div>
      </aside>

      {/* CENTER WORKSPACE SECTION */}
      <div className="flex-1 p-4 md:p-6 flex flex-col justify-start min-w-0">
        
        {/* TOP BAR / Header Area - with dynamic branch selectors, notifications, and AI toggle */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-slate-200 gap-4" id="portal-top-header">
          <div>
            <h1 className="text-xl font-bold font-sans text-slate-950">Welcome back, {companyName}</h1>
            <p className="text-xs text-slate-500 font-sans mt-0.5">Here’s your company performance overview across all active bureaus</p>
          </div>

          <div className="flex gap-2.5 items-center justify-between sm:justify-end w-full sm:w-auto relative">
            
            {/* Theme Toggle Mode */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 transition outline-none cursor-pointer flex items-center justify-center shadow-xs"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-650" />}
            </button>

            {/* Veritas AI copilot Toggle */}
            <button
              onClick={() => setShowRightPanel((prev) => !prev)}
              style={showRightPanel ? { backgroundColor: `${primaryColor}15`, borderColor: primaryColor, color: primaryColor } : {}}
              className={`p-2 rounded-lg border transition relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold select-none cursor-pointer shadow-sm ${
                showRightPanel 
                  ? "font-bold" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Bot className={`w-3.5 h-3.5 ${showRightPanel ? "animate-pulse" : ""}`} />
              <span>{showRightPanel ? "Hide Copilot" : "Veritas AI"}</span>
            </button>

            {/* Notification Badge */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationList(!showNotificationList)}
                className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg outline-none cursor-pointer relative shadow-sm flex items-center justify-center transition"
                title={`${notifications.length} alerts pending`}
                id="bell-notif-button"
              >
                <Bell className="w-4 h-4 text-slate-650" />
                {notifications.length > 0 && (
                  <span className="bg-rose-500 text-white font-mono font-black text-[8.5px] h-4 w-4 rounded-full absolute -top-1.5 -right-1.5 flex items-center justify-center animate-bounce shadow-sm">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotificationList && (
                <div 
                  className="fixed lg:absolute left-4 right-4 sm:left-auto sm:right-0 top-20 sm:top-12 w-auto sm:w-[350px] max-w-full bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150 border-t-4 border-t-indigo-650"
                  id="notif-dropdown-pane"
                >
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 font-bold px-1 text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-450">Active Alerts</span>
                      <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-black">{notifications.length}</span>
                    </div>
                    {notifications.length > 0 && (
                      <button 
                        onClick={async () => {
                          try { await notificationsApi.markAllRead(); } catch { /* non-fatal */ }
                          setNotifications([]);
                        }}
                        className="text-[10.5px] text-indigo-600 hover:text-indigo-750 hover:underline font-bold outline-none cursor-pointer transition"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {notifications.map(n => (
                      <div key={n.id} className="p-3 bg-slate-50/75 border border-slate-105 rounded-xl hover:bg-slate-50 transition relative group flex gap-2.5 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className="text-slate-800 text-[11px] font-sans leading-relaxed break-words whitespace-normal font-medium">
                            {n.text}
                          </p>
                          <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-slate-350" /> {n.time}
                          </span>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="text-center py-8 space-y-2">
                        <p className="text-slate-400 italic text-[11px]">No alerts recorded today.</p>
                        <p className="text-[10px] text-slate-400">Our satellite link is fully synced and stable.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {lockTenant ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span>Tenant: {activeTenant.name}</span>
              </div>
            ) : (
              <select
                value={selectedTenantId}
                onChange={(e) => onSelectTenant(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3.5 py-1.5 text-xs text-slate-700 outline-none font-bold shadow-sm cursor-pointer"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>
        </header>

        {/* ACTIVE PORTAL TAB DISPATCH */}
        <main className="flex-1 min-h-0">
          
          {activeTab === "dashboard" && (
            <CompanyAdminDashboard
              userRole={userRole}
              branches={activeTenantBranches}
              employees={localEmployees}
              documents={documents}
              appointments={appointments}
              onNavigateToTab={(tab) => {
                if (tab === "billing") setActiveTab("billing");
                if (tab === "branches") setActiveTab("branches");
                if (tab === "employees") setActiveTab("employees");
                if (tab === "documents") setActiveTab("documents");
              }}
            />
          )}

          {activeTab === "branches" && (
            <CompanyBranchesTab
              activeTenantBranches={activeTenantBranches}
              branchName={branchName}
              branchAddress={branchAddress}
              branchPhone={branchPhone}
              setBranchName={setBranchName}
              setBranchAddress={setBranchAddress}
              setBranchPhone={setBranchPhone}
              handleBranchSubmit={handleBranchSubmit}
              handleToggleArchiveBranchLocal={handleToggleArchiveBranchLocal}
              handleDeleteBranchLocal={handleDeleteBranchLocal}
              editingBranch={editingBranch}
              setEditingBranch={setEditingBranch}
              editBranchName={editBranchName}
              editBranchAddress={editBranchAddress}
              editBranchPhone={editBranchPhone}
              editBranchDesks={editBranchDesks}
              setEditBranchName={setEditBranchName}
              setEditBranchAddress={setEditBranchAddress}
              setEditBranchPhone={setEditBranchPhone}
              setEditBranchDesks={setEditBranchDesks}
              handleBranchEditSubmit={handleBranchEditSubmit}
              branchDeleteConfirmId={branchDeleteConfirmId}
              setBranchDeleteConfirmId={setBranchDeleteConfirmId}
            />
          )}
          {activeTab === "employees" && (
            <CompanyEmployeesTab
              localEmployees={localEmployees}
              localBranches={localBranches}
              activeTenantBranches={activeTenantBranches}
              empName={empName}
              empEmail={empEmail}
              empPassword={empPassword}
              empPhone={empPhone}
              empRole={empRole}
              empSpecificRole={empSpecificRole}
              empBranchId={empBranchId}
              setEmpName={setEmpName}
              setEmpEmail={setEmpEmail}
              setEmpPassword={setEmpPassword}
              setEmpPhone={setEmpPhone}
              setEmpRole={setEmpRole}
              setEmpSpecificRole={setEmpSpecificRole}
              setEmpBranchId={setEmpBranchId}
              handleEmployeeSubmit={handleEmployeeSubmit}
              handleToggleEmployeeSuspendLocal={handleToggleEmployeeSuspendLocal}
              handleResetEmployeePasswordLocal={handleResetEmployeePasswordLocal}
              handleDeleteEmployeeLocal={handleDeleteEmployeeLocal}
              editingEmployee={editingEmployee}
              setEditingEmployee={setEditingEmployee}
              editEmpName={editEmpName}
              editEmpEmail={editEmpEmail}
              editEmpRole={editEmpRole}
              editEmpBranchId={editEmpBranchId}
              setEditEmpName={setEditEmpName}
              setEditEmpEmail={setEditEmpEmail}
              setEditEmpRole={setEditEmpRole}
              setEditEmpBranchId={setEditEmpBranchId}
              handleEmployeeEditSubmit={handleEmployeeEditSubmit}
              employeeDeleteConfirmId={employeeDeleteConfirmId}
              setEmployeeDeleteConfirmId={setEmployeeDeleteConfirmId}
              isOnboardModalOpen={isOnboardModalOpen}
              setIsOnboardModalOpen={setIsOnboardModalOpen}
            />
          )}
          {activeTab === "customers" && <CompanyAdminCustomers />}

          {activeTab === "documents" && (
            <CompanyAdminDocuments branches={activeTenantBranches} userRole={userRole} />
          )}

          {activeTab === "appointments" && <CompanyAdminAppointments branches={activeTenantBranches} />}

          {activeTab === "billing" && <CompanyAdminBilling />}

          {activeTab === "reports" && (
            <div className="space-y-6" id="reports-compliance-tab">
              
              {/* Audit log summary statistics (derived from real fetched audit_logs data) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
                  <span className="text-[10px] font-mono text-slate-450 uppercase block">Audit events on record</span>
                  <div className="text-xl font-bold text-slate-900">{displayAuditLogs.length}</div>
                  <span className="text-[10px] text-slate-400 block">Most recent {displayAuditLogs.length} events shown below</span>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
                  <span className="text-[10px] font-mono text-slate-450 uppercase block">Distinct action types</span>
                  <div className="text-xl font-bold text-slate-900">{new Set(displayAuditLogs.map(l => l.action)).size}</div>
                  <span className="text-[10px] text-slate-400 block">Across documents, employees, and queue</span>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
                  <span className="text-[10px] font-mono text-slate-450 uppercase block">Most recent activity</span>
                  <div className="text-lg font-bold text-slate-900">
                    {displayAuditLogs[0]?.created_at ? new Date(displayAuditLogs[0].created_at).toLocaleString() : "—"}
                  </div>
                  <span className="text-[10px] text-slate-400 block">{displayAuditLogs[0]?.action?.replace(/_/g, " ") ?? "No events yet"}</span>
                </div>

              </div>


              {/* PDF/CSV ledger logs download triggers */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="text-sm font-sans font-bold text-slate-950">Export ledger reporting logs</h4>
                    <p className="text-xs text-slate-550">Generate full audited logs representing client registrations, document watermarks, and payments</p>
                  </div>
                  <button
                    onClick={handleCSVExport}
                    className="bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition outline-none shadow-sm cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Export CSV Spreadsheet
                  </button>
                </div>

                {/* Audit table logs list */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 p-3 border-b border-slate-200 text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold flex justify-between items-center">
                    <span>COMPANY SYSTEM AUDIT TRAIL TRAFFIC</span>
                    <span className="text-[9px] bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full text-indigo-700 font-bold font-mono">SECURE COGNITIVE LEDGERS</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs font-mono leading-relaxed max-h-[300px] overflow-y-auto bg-white pr-0.5">
                    {auditLoading ? (
                      <div className="p-6 text-center text-slate-400 text-xs">Loading audit trail…</div>
                    ) : displayAuditLogs && displayAuditLogs.length > 0 ? (
                      displayAuditLogs.map((log, idx) => (
                        <div key={log.id || idx} className="p-3 bg-white hover:bg-slate-50 flex flex-col sm:flex-row justify-between gap-2.5 border-b border-slate-100">
                          <div className="space-y-1">
                            <span className="text-slate-400 text-[10px] flex items-center gap-1 font-sans">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                              {log.created_at}
                            </span>
                            <p className="text-slate-800 text-[11.5px] font-sans">
                              <strong className="text-indigo-650 font-mono text-[10px] uppercase font-bold mr-1.5">[{log.action}]</strong>
                              {log.action}
                            </p>
                          </div>
                          <div className="text-left sm:text-right shrink-0">
                            <span className="bg-slate-100 text-slate-700 font-sans font-bold px-2 py-0.5 rounded text-[9.5px] uppercase tracking-wider inline-block sm:block">
                              BY: {(log.meta as any)?.username ?? "system"}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 inline-block sm:block mt-0.5">IP: {log.ip_address || "127.0.0.1"}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-xs italic text-slate-400 bg-white">
                        No compliance log entries compiled yet. Audits will gather on administrative CRUD triggers.
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === "settings" && (
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-6" id="settings-admin-tab">
              
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-sans font-bold text-slate-900">White-Label Branding & Environment Config</h3>
                <p className="text-xs text-slate-550">Modify global company display parameters, SMS notification keys, or visual layout accents</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                
                {/* Branding choices */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Company Display Title Name</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 p-2.5 rounded-lg outline-none font-bold text-slate-850"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1 font-mono">Accent Primary Brand Palette</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded border border-slate-200 p-1 cursor-pointer bg-white"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#2563EB"
                        className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-mono text-xs uppercase text-slate-800"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Dynamic RBAC Role Permissions Control Grid — tenant-scoped, live-enforced */}
              {permissionsMatrix && onUpdatePermissions && (
                <div className="mt-6">
                  <PermissionsConfig
                    permissionsMatrix={permissionsMatrix}
                    onUpdatePermissions={onUpdatePermissions}
                    scope="tenant"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <button
                  type="button"
                  onClick={onLogout}
                  className="bg-rose-50 hover:bg-rose-150 text-rose-700 border border-rose-200 font-bold text-xs px-4 py-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out of Company Portal</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-sm cursor-pointer"
                >
                  {settingsSaving ? "Saving…" : "Save Settings Parameters"}
                </button>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* 🧭 RIGHT PANEL - Collapsible compliance and load diagnostic insights */}
      {showRightPanel && (
        <>
          {/* Backdrop on mobile */}
          <div 
            className="fixed inset-0 bg-slate-950/25 backdrop-blur-xs z-40 md:hidden animate-fade-in"
            onClick={() => setShowRightPanel(false)}
          />
          
          <aside 
            className="fixed inset-y-0 right-0 z-50 w-80 bg-white border-l border-slate-200 p-4 flex flex-col justify-between h-screen md:relative md:h-[750px] shadow-2xl md:shadow-none animate-in slide-in-from-right duration-200" 
            id="portal-right-panel"
          >
            
            <div className="space-y-4 flex-1 flex flex-col justify-start min-h-0">
              
              {/* AI Assistant Chat frame section */}
              <div className="border border-slate-200 p-4 rounded-xl bg-slate-50/70 space-y-3 flex flex-col justify-between flex-1 min-h-0">
                <div className="border-b border-slate-150 pb-2.5 shrink-0 flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-mono text-indigo-600 uppercase font-black tracking-widest block">SECURED AI HELP COMPLIANCE</span>
                    <h4 className="text-xs font-bold text-slate-105 mt-1 flex items-center gap-1">
                      <Bot className="w-4 h-4 text-indigo-600 animate-pulse" />
                      Veritas Legal Copilot
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRightPanel(false)}
                    className="p-1.5 bg-slate-105/5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    title="Dismiss panel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Chat Message Lists scroll */}
                <div className="space-y-3 overflow-y-auto flex-1 pr-1 text-[11px] leading-relaxed">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`p-2.5 rounded-lg ${
                      msg.role === "user" 
                        ? "bg-indigo-600 text-white" 
                        : "bg-white border border-slate-200 text-slate-850"
                    }`}>
                      {msg.role === "model" && (
                        <span className="text-[8px] font-mono text-indigo-605 font-bold block uppercase tracking-wider mb-0.5">Veritas:</span>
                      )}
                      {msg.content}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="p-2.5 bg-white border border-slate-200 text-slate-450 italic flex items-center gap-1.5 animate-pulse rounded-lg">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" /> Analysing compliance checklists...
                    </div>
                  )}
                </div>

                {/* Chat input form */}
                <form onSubmit={handleChatSend} className="pt-2 border-t border-slate-150 flex gap-1.5 shrink-0">
                  <input
                    type="text"
                    required
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask POA rules..."
                    className="flex-1 bg-white border border-slate-205 text-[10px] px-2.5 py-2 rounded outline-none text-slate-900 focus:border-indigo-500 hover:border-slate-300"
                  />
                  <button type="submit" className="bg-indigo-650 hover:bg-indigo-605 text-white text-[10px] font-bold px-3.5 rounded outline-none transition shrink-0">
                    Go
                  </button>
                </form>
              </div>

              {/* Smart Insights summary box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shrink-0">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">Real-time load insights</span>
                <div className="text-[11px] leading-relaxed text-slate-650 space-y-2 font-sans">
                  <div className="border-l-2 border-amber-400 pl-2">
                    <p className="font-bold text-slate-800 leading-none">Garowe Bureau Load is high (+24%)</p>
                    <p className="text-[10px] text-slate-450 mt-1">Lobby queue waiting checks are slow: Recommend dedicating 1 additional Notary Officer slot.</p>
                  </div>
                  <div className="border-l-2 border-blue-400 pl-2">
                    <p className="font-bold text-slate-800 leading-none">Audit certification date status</p>
                    <p className="text-[10px] text-slate-450 mt-1">Puntland Ministry compliance check-in is due in 18 days.</p>
                  </div>
                </div>
              </div>

            </div>

          </aside>
        </>
      )}

    </div>
  );
}
