import React, { useState, useEffect } from "react";
import { 
  Building2, Users, FileText, Calendar, CreditCard, 
  Settings, RefreshCw, Sparkles, Sliders, Check, 
  HelpCircle, ChevronRight, Bell, Search, Bot, 
  FileSpreadsheet, ShieldCheck, ToggleLeft, ToggleRight, 
  LayoutDashboard, UserCheck, ShieldAlert, LogOut, Menu, X,
  Trash2, Edit, Edit3, Archive, KeyRound, Play, Plus, Clock, Shield, Sun, Moon
} from "lucide-react";
import { EmployeeForm, BranchForm, Modal, type EmployeeFormData, type BranchFormData } from "./FormComponents";
import { Tenant, Branch, Employee, QueueTicket, NotaryDocument, AuditLog } from "../types";

// Import custom extracted sub-components
import CompanyAdminDashboard from "./company/CompanyAdminDashboard";
import CompanyAdminCustomers from "./company/CompanyAdminCustomers";
import CompanyAdminDocuments from "./company/CompanyAdminDocuments";
import CompanyAdminAppointments from "./company/CompanyAdminAppointments";
import CompanyAdminBilling from "./company/CompanyAdminBilling";

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
  onToggleArchiveEmployee: (empId: string) => void;
  onToggleEmployeeStatus: (id: string) => void;
  onToggleEmployeeSuspend: (id: string) => void;
  onResetEmployeePassword: (id: string) => void;
  invoices: never[];
  onPayInvoice: (id: string) => void;
  appointments: never[];
  queue: QueueTicket[];
  documents: NotaryDocument[];
  userRole?: string;
  lockTenant?: boolean;
  onLogout: () => void;
  // Dynamic role controls
  permissionsMatrix?: Record<string, Record<string, boolean>>;
  onUpdatePermissions?: (matrix: any) => void;
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
  onToggleArchiveEmployee,
  onToggleEmployeeStatus,
  onToggleEmployeeSuspend,
  onResetEmployeePassword,
  invoices,
  onPayInvoice,
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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("portal-theme-company-admin") === "dark";
  });

  useEffect(() => {
    localStorage.setItem("portal-theme-company-admin", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  
  // Right AI Assistant sidebar state
  const [showRightPanel, setShowRightPanel] = useState(false);

  // Notifications dropdown simulation
  const [showNotificationList, setShowNotificationList] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "New appointment scheduled for Bosaso Main Branch", time: "5 mins ago", read: false },
    { id: 2, text: "Document #NOT-101 watermark cert compiled successfully", time: "12 mins ago", read: false },
    { id: 3, text: "Daily credit payout cleared via Stripe API node", time: "1 hr ago", read: true }
  ]);

  // Brand customize states
  const [primaryColor, setPrimaryColor] = useState("#2563EB");
  const [companyName, setCompanyName] = useState("Bosaso Notary Company Ltd.");
  const [automaticSms, setAutomaticSms] = useState(true);
  const [identityChecks, setIdentityChecks] = useState(true);

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

  const handleToggleArchiveBranchLocal = (bId: string) => {
    onToggleArchiveBranch(bId);
    alert("Toggled office archive status.");
  };

  const handleToggleArchiveEmployeeLocal = (empId: string) => {
    onToggleArchiveEmployee(empId);
    alert("Toggled staff member archive index.");
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
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: term }] })
      });
      const result = await response.json();
      setChatMessages(prev => [...prev, { role: "model", content: result.reply }]);
    } catch (err) {
      setTimeout(() => {
        setChatMessages(prev => [...prev, { 
          role: "model", 
          content: `VERITAS INSIGHT FALLBACK:\nTo ensure compliance with the Electronic Signatures in Global and National Commerce (ESIGN Act), the company should enforce multi-factor authentication (MFA) on all Notary Officer profiles. It looks like Bosaso Main Branch has 8 active waiting tickets; recommend enabling voice announcement chimes.` 
        }]);
      }, 1000);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCSVExportMock = () => {
    alert("Compiling transaction ledgers, biometric logs and client registries...\n\nCompiling database export payload: 'Notary_Company_Export_2026.csv'...\n\nSuccessfully downloaded file.");
  };

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
            <h1 className="text-xl font-bold font-sans text-slate-950">Welcome back, Bosaso Notary Company</h1>
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
                        onClick={() => setNotifications([])}
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
              invoices={invoices}
              onNavigateToTab={(tab) => {
                if (tab === "billing") setActiveTab("billing");
                if (tab === "branches") setActiveTab("branches");
                if (tab === "employees") setActiveTab("employees");
                if (tab === "documents") setActiveTab("documents");
              }}
            />
          )}

          {activeTab === "branches" && (
            <div className="space-y-6" id="branches-admin-tab">
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <div>
                  <h3 className="text-sm font-sans font-bold text-slate-900">Manage Office Bureaus ({activeTenantBranches.length})</h3>
                  <p className="text-xs text-slate-550 font-sans mt-0.5">Define corporate branch counters and active witness schedules</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Branches Roster Table */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto text-xs text-slate-705">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                          <th className="p-4 font-bold">Office Name</th>
                          <th className="p-4 font-bold">Telephone</th>
                          <th className="p-4 font-bold">Address Link</th>
                          <th className="p-4 font-bold">Active Desks</th>
                          <th className="p-4 font-bold">Status</th>
                          <th className="p-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeTenantBranches.map(b => (
                          <tr key={b.id} className={`hover:bg-slate-50/50 ${b.archived ? "bg-slate-50/50 opacity-75" : ""}`}>
                            <td className="p-4 font-semibold text-slate-900 flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-indigo-600" />
                              <div className="flex flex-col">
                                <span>{b.name}</span>
                                {b.archived && <span className="text-[9px] font-mono text-amber-600 font-semibold">[Archived File]</span>}
                              </div>
                            </td>
                            <td className="p-4 font-mono select-all text-slate-600">
                              {b.phone}
                            </td>
                            <td className="p-4 text-slate-500 max-w-[150px] truncate">
                              {b.address}
                            </td>
                            <td className="p-4 font-mono font-bold">
                              {b.countersCount} counters
                            </td>
                            <td className="p-4">
                              {b.archived ? (
                                <span className="bg-slate-100 text-slate-700 border border-slate-200 font-sans font-bold px-2 py-0.5 rounded-full text-[9px]">
                                  Archived
                                </span>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-805 border border-emerald-200 font-sans font-bold px-2 py-0.5 rounded-full text-[9px]">
                                  Active Sched
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right space-x-1 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setEditingBranch(b);
                                  setEditBranchName(b.name);
                                  setEditBranchAddress(b.address);
                                  setEditBranchPhone(b.phone || "");
                                  setEditBranchDesks(b.countersCount);
                                }}
                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-755 px-2 py-1 rounded font-bold transition"
                                title="Edit office bureau layout"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleToggleArchiveBranchLocal(b.id)}
                                className={`text-[10px] px-2 py-1 rounded font-bold transition ${b.archived ? "bg-blue-50 text-blue-700 hover:bg-blue-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                              >
                                {b.archived ? "Restore" : "Archive"}
                              </button>
                              {branchDeleteConfirmId === b.id ? (
                                <span className="inline-flex gap-1.5 items-center">
                                  <button
                                    onClick={() => {
                                      handleDeleteBranchLocal(b.id, b.name);
                                      setBranchDeleteConfirmId(null);
                                    }}
                                    className="text-[10px] bg-red-650 hover:bg-red-700 text-white px-2 py-1 rounded font-bold transition shadow-xs cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setBranchDeleteConfirmId(null)}
                                    className="text-[10px] bg-slate-200 hover:bg-slate-350 text-slate-700 px-2 py-1 rounded font-bold transition cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setBranchDeleteConfirmId(b.id)}
                                  className="text-[10px] bg-rose-50 text-rose-700 hover:bg-rose-100 px-2 py-1 rounded font-bold transition cursor-pointer"
                                  title="Eradicate and cascade delete associated clerks"
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Register branch form sidebar */}
                <div className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4" id="register-branch-box">
                  <h4 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold">Register Physical Branch</h4>
                  
                  <form onSubmit={handleBranchSubmit} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Office Name *</label>
                      <input
                        type="text"
                        required
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        placeholder="e.g. Bosaso Branch 2"
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-lg outline-none focus:border-blue-500 hover:border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Street Address *</label>
                      <input
                        type="text"
                        required
                        value={branchAddress}
                        onChange={(e) => setBranchAddress(e.target.value)}
                        placeholder="e.g. Central Mogadishu blvd"
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-lg outline-none focus:border-blue-500 hover:border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Telephone contact</label>
                      <input
                        type="text"
                        value={branchPhone}
                        onChange={(e) => setBranchPhone(e.target.value)}
                        placeholder="e.g. +252 90 700 1100"
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-lg outline-none focus:border-blue-500 hover:border-slate-300"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-lg transition shrink-0"
                    >
                      Provision Bureau Office
                    </button>
                  </form>
                </div>

              </div>

              {/* Edit Branch Modal */}
              {editingBranch && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-250 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <h4 className="text-xs font-mono text-slate-500 uppercase font-bold tracking-widest flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-indigo-650" /> Update Bureau Layout
                      </h4>
                      <button 
                        onClick={() => setEditingBranch(null)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleBranchEditSubmit} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">Bureau Office Name *</label>
                        <input
                          type="text"
                          required
                          value={editBranchName}
                          onChange={(e) => setEditBranchName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">Office Street Address *</label>
                        <input
                          type="text"
                          required
                          value={editBranchAddress}
                          onChange={(e) => setEditBranchAddress(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">Telephone contact</label>
                        <input
                          type="text"
                          value={editBranchPhone}
                          onChange={(e) => setEditBranchPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">Work counters count (Desks)</label>
                        <input
                          type="number"
                          min="1"
                          max="15"
                          value={editBranchDesks}
                          onChange={(e) => setEditBranchDesks(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg outline-none font-mono"
                        />
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingBranch(null)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 font-bold p-2.5 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-2.5 rounded-lg"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === "employees" && (
            <div className="space-y-6" id="employees-admin-tab">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <div>
                  <h3 className="text-sm font-sans font-bold text-slate-900">Configure Staff & Security permissions ({localEmployees.length})</h3>
                  <p className="text-xs text-slate-550 mt-0.5">Provision clerk authorization tokens and assign role parameters</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(true)}
                  className="bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shrink-0 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer select-none"
                >
                  <Plus className="w-4 h-4" />
                  <span>Onboard Staff Clerk</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Employee Table */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto text-xs text-slate-700">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                          <th className="p-4 font-bold">Clerk Name</th>
                          <th className="p-4 font-bold">Authorized Email</th>
                          <th className="p-4 font-bold">Target Branch</th>
                          <th className="p-4 font-bold">RBAC Authorization Keys</th>
                          <th className="p-4 font-bold">State Status</th>
                          <th className="p-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {localEmployees.map(e => {
                          const associatedBranch = localBranches.find(b => b.id === e.branch_id);
                          return (
                            <tr key={e.id} className={`hover:bg-slate-50/50 ${e.archived ? "bg-slate-50/30 opacity-70" : ""}`}>
                              <td className="p-4 font-bold text-slate-900">
                                <div className="flex flex-col">
                                  <span>{e.full_name}</span>
                                  {e.archived && <span className="text-[9px] font-mono text-amber-600">[Archived Account]</span>}
                                </div>
                              </td>
                              <td className="p-4 font-mono select-all text-[11px] text-slate-550">
                                {e.email}
                              </td>
                              <td className="p-4 text-slate-650 font-bold font-sans">
                                {associatedBranch?.name || "Unassigned / Floater Office"}
                              </td>
                              <td className="p-4 font-bold font-mono text-indigo-650 text-[10px]">
                                {e.job_role === "ADMIN" ? "ROLE_BRANCH_ADMIN" : `ROLE_${e.job_role}`}
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-sans font-bold leading-none uppercase ${
                                  e.status === "available" 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-250" 
                                    : e.status === "suspended"
                                      ? "bg-rose-50 text-rose-800 border border-rose-200"
                                      : "bg-slate-200 text-slate-650"
                                }`}>
                                  {e.status}
                                </span>
                              </td>
                              <td className="p-4 text-right space-y-1 sm:space-y-0">
                                <div className="flex flex-wrap gap-1 justify-end">
                                  <button
                                    onClick={() => {
                                      setEditingEmployee(e);
                                      setEditEmpName(e.full_name);
                                      setEditEmpEmail(e.email);
                                      setEditEmpRole(e.job_role);
                                      setEditEmpBranchId(e.branch_id);
                                    }}
                                    className="text-[9.5px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-1 rounded font-bold transition"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleToggleEmployeeSuspendLocal(e.id)}
                                    className={`text-[9.5px] px-1.5 py-1 rounded font-bold transition ${
                                      e.status === "suspended" 
                                        ? "bg-green-50 text-green-700 hover:bg-green-150" 
                                        : "bg-red-50 text-red-700 hover:bg-red-150"
                                    }`}
                                  >
                                    {e.status === "suspended" ? "Unsuspend" : "Suspend"}
                                  </button>
                                  <button
                                    onClick={() => handleResetEmployeePasswordLocal(e.id, e.full_name)}
                                    className="text-[9.5px] bg-indigo-50 text-indigo-700 hover:bg-indigo-150 px-1.5 py-1 rounded font-bold transition flex items-center gap-0.5"
                                    title="Regenerate credentials and log reset"
                                  >
                                    <KeyRound className="w-2.5 h-2.5" /> Reset Pass
                                  </button>
                                  <button
                                    onClick={() => handleToggleArchiveEmployeeLocal(e.id)}
                                    className="text-[9.5px] bg-amber-50 text-amber-700 hover:bg-amber-100 px-1.5 py-1 rounded font-bold transition"
                                  >
                                    {e.archived ? "Restore" : "Archive"}
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (employeeDeleteConfirmId === e.id) {
                                        handleDeleteEmployeeLocal(e.id, e.full_name);
                                        setEmployeeDeleteConfirmId(null);
                                      } else {
                                        setEmployeeDeleteConfirmId(e.id);
                                      }
                                    }}
                                    className={`text-[9.5px] px-1.5 py-1 rounded font-bold transition ${
                                      employeeDeleteConfirmId === e.id
                                        ? "bg-red-650 text-white hover:bg-red-700"
                                        : "bg-slate-900 text-slate-100 hover:bg-slate-800"
                                    }`}
                                  >
                                    {employeeDeleteConfirmId === e.id ? "Confirm Delete?" : "Delete"}
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

                {/* Onboard form sidebar */}
                <div className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4" id="onboard-employee-box">
                  <h4 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold">Onboard Staff Clerk</h4>
                  
                  <form onSubmit={handleEmployeeSubmit} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Clerk Full Name *</label>
                      <input
                        type="text"
                        required
                        value={empName}
                        onChange={(e) => setEmpName(e.target.value)}
                        placeholder="e.g. Elena Rostova"
                        className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Corporate Email Address *</label>
                      <input
                        type="email"
                        required
                        value={empEmail}
                        onChange={(e) => setEmpEmail(e.target.value)}
                        placeholder="clerk@bosaso-notary.com"
                        className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Assign Security Group (RBAC) *</label>
                      <select
                        value={empRole}
                        onChange={(e) => setEmpRole(e.target.value as Employee["job_role"])}
                        className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none cursor-pointer"
                      >
                        <option value="NOTARY_OFFICER">ROLE_NOTARY_OFFICER</option>
                        <option value="ADMIN">ROLE_BRANCH_ADMIN</option>
                        <option value="RECEPTIONIST">ROLE_RECEPTIONIST</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Assign Operational Role *</label>
                      <select
                        value={empSpecificRole}
                        onChange={(e) => setEmpSpecificRole(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none cursor-pointer"
                      >
                        <option value="Document Officer">Document Officer</option>
                        <option value="Receptionist">Receptionist</option>
                        <option value="Cashier">Cashier</option>
                        <option value="Notary Officer">Notary Officer</option>
                        <option value="Verification Officer">Verification Officer</option>
                        <option value="Customer Service">Customer Service</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Primary Branch Bureau Context *</label>
                      {activeTenantBranches.length > 0 ? (
                        <select
                          value={empBranchId}
                          onChange={(e) => setEmpBranchId(e.target.value)}
                          className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none cursor-pointer"
                        >
                          {activeTenantBranches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[10.5px] leading-relaxed font-sans">
                          ⚠️ No branches active. Add a branch first under the <strong>Branches</strong> tab before onboarding clerks.
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={activeTenantBranches.length === 0}
                      className={`w-full font-bold text-xs py-2.5 rounded-lg transition ${
                        activeTenantBranches.length === 0
                          ? "bg-slate-350 text-slate-500 cursor-not-allowed"
                          : "bg-indigo-650 hover:bg-indigo-600 text-white cursor-pointer"
                      }`}
                    >
                      Onboard Clerk Accounts
                    </button>
                  </form>
                </div>

              </div>

              {/* Edit Employee Modal */}
              {editingEmployee && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                  <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-250 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <h4 className="text-xs font-mono text-slate-500 uppercase font-bold tracking-widest flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-650" /> Edit Clerk Information
                      </h4>
                      <button 
                        onClick={() => setEditingEmployee(null)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleEmployeeEditSubmit} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">Staff Member Name *</label>
                        <input
                          type="text"
                          required
                          value={editEmpName}
                          onChange={(e) => setEditEmpName(e.target.value)}
                          className="w-full bg-slate-550/5 border border-slate-200 p-2.5 rounded-lg outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">Corporate Email Identity *</label>
                        <input
                          type="email"
                          required
                          value={editEmpEmail}
                          onChange={(e) => setEditEmpEmail(e.target.value)}
                          className="w-full bg-slate-550/5 border border-slate-200 p-2.5 rounded-lg outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">Security Role (RBAC Keys)</label>
                        <select
                          value={editEmpRole}
                          onChange={(e) => setEditEmpRole(e.target.value as Employee["job_role"])}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-lg outline-none cursor-pointer"
                        >
                          <option value="NOTARY_OFFICER">ROLE_NOTARY_OFFICER</option>
                          <option value="ADMIN">ROLE_BRANCH_ADMIN (Branch Administrator)</option>
                          <option value="RECEPTIONIST">ROLE_RECEPTIONIST</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">Re-Assign Branch Bureau Location</label>
                        <select
                          value={editEmpBranchId}
                          onChange={(e) => setEditEmpBranchId(e.target.value)}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-lg outline-none cursor-pointer"
                        >
                          {activeTenantBranches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingEmployee(null)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 font-bold p-2.5 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-indigo-650 hover:bg-indigo-600 text-white font-bold p-2.5 rounded-lg"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Onboard Employee Modal for Responsive Accessibility */}
              {isOnboardModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                  <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-250 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <h4 className="text-xs font-mono text-slate-505 uppercase font-bold tracking-widest flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-655 animate-pulse" /> Onboard Staff Clerk
                      </h4>
                      <button 
                        onClick={() => setIsOnboardModalOpen(false)}
                        className="text-slate-400 hover:text-slate-650 text-xs font-bold cursor-pointer transition p-1"
                        id="close-onboard-modal-btn"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleEmployeeSubmit} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-450 uppercase font-mono font-bold mb-1">Clerk Full Name *</label>
                        <input
                          type="text"
                          required
                          value={empName}
                          onChange={(e) => setEmpName(e.target.value)}
                          placeholder="e.g. Elena Rostova"
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg outline-none focus:border-indigo-505 font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-450 uppercase font-mono font-bold mb-1">Corporate Email Address *</label>
                        <input
                          type="email"
                          required
                          value={empEmail}
                          onChange={(e) => setEmpEmail(e.target.value)}
                          placeholder="clerk@bosaso-notary.com"
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg outline-none focus:border-indigo-505 font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-455 uppercase font-mono font-bold mb-1">Assign Security Group (RBAC) *</label>
                        <select
                          value={empRole}
                          onChange={(e) => setEmpRole(e.target.value as Employee["job_role"])}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-lg outline-none cursor-pointer font-semibold text-slate-800"
                        >
                          <option value="NOTARY_OFFICER">ROLE_NOTARY_OFFICER</option>
                          <option value="ADMIN">ROLE_BRANCH_ADMIN</option>
                          <option value="RECEPTIONIST">ROLE_RECEPTIONIST</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-455 uppercase font-mono font-bold mb-1">Assign Operational Role *</label>
                        <select
                          value={empSpecificRole}
                          onChange={(e) => setEmpSpecificRole(e.target.value)}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-lg outline-none cursor-pointer font-semibold text-slate-800"
                        >
                          <option value="Document Officer">Document Officer</option>
                          <option value="Receptionist">Receptionist</option>
                          <option value="Cashier">Cashier</option>
                          <option value="Notary Officer">Notary Officer</option>
                          <option value="Verification Officer">Verification Officer</option>
                          <option value="Customer Service">Customer Service</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-455 uppercase font-mono font-bold mb-1">Primary Branch Bureau Context *</label>
                        {activeTenantBranches.length > 0 ? (
                          <select
                            value={empBranchId}
                            onChange={(e) => setEmpBranchId(e.target.value)}
                            className="w-full bg-white border border-slate-200 p-2.5 rounded-lg outline-none cursor-pointer font-black text-slate-900"
                          >
                            {activeTenantBranches.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[10.5px] leading-relaxed font-sans">
                            ⚠️ No active branch offices exist under this company. Register a physical branch first under the <strong>Branches</strong> tab before onboarding.
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsOnboardModalOpen(false)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 font-bold p-2.5 rounded-lg cursor-pointer transition"
                          id="cancel-modal-btn"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={activeTenantBranches.length === 0}
                          className={`flex-1 text-white font-bold p-2.5 rounded-lg transition ${
                            activeTenantBranches.length === 0 
                              ? "bg-slate-300 text-slate-500 cursor-not-allowed" 
                              : "bg-indigo-650 hover:bg-indigo-600 cursor-pointer"
                          }`}
                          id="submit-onboard-btn"
                        >
                          Onboard Clerk
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === "customers" && <CompanyAdminCustomers />}

          {activeTab === "documents" && <CompanyAdminDocuments />}

          {activeTab === "appointments" && <CompanyAdminAppointments branches={activeTenantBranches} />}

          {activeTab === "billing" && <CompanyAdminBilling />}

          {activeTab === "reports" && (
            <div className="space-y-6" id="reports-compliance-tab">
              
              {/* Compliance dashboard statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
                  <span className="text-[10px] font-mono text-slate-450 uppercase block">Notarized SLA Index</span>
                  <div className="text-xl font-bold text-slate-900">99.85%</div>
                  <span className="text-[10px] text-emerald-600 font-bold block">100% compliant state audit logs</span>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
                  <span className="text-[10px] font-mono text-slate-450 uppercase block">Regulatory compliance</span>
                  <div className="text-lg font-bold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                    eIDAS CERTIFIED
                  </div>
                  <span className="text-[10px] text-slate-400 block">ESIGN Act standards active</span>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
                  <span className="text-[10px] font-mono text-slate-450 uppercase block">Active queue checks</span>
                  <div className="text-xl font-bold text-slate-900">0 min delay</div>
                  <span className="text-[10px] text-slate-400 block">Lobby sweep automated chimes active</span>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
                  <span className="text-[10px] font-mono text-slate-450 uppercase block">Stripe reconciliations</span>
                  <div className="text-xl font-bold text-slate-900">Auto Payout</div>
                  <span className="text-[10px] text-blue-600 font-bold block">Daily deposits reconciled</span>
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
                    onClick={handleCSVExportMock}
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
                    {auditLogs && auditLogs.length > 0 ? (
                      auditLogs.map((log, idx) => (
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

                {/* Operations configuration switchboards */}
                <div className="space-y-4 p-4 border border-slate-150 bg-slate-50/50 rounded-xl">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block tracking-wider">Dynamic switchboards</span>
                  
                  <div className="flex justify-between items-center py-1">
                    <div>
                      <span className="font-bold block text-slate-850">Twilio Automated CRM SMS notifications</span>
                      <p className="text-[10px] text-slate-450 mt-0.5">Ping visitors via SMS when notary deeds are watermark-approved</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutomaticSms(!automaticSms)}
                      className="outline-none"
                    >
                      {automaticSms ? (
                        <ToggleRight className="w-8 h-8 text-blue-600 cursor-pointer" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-350 cursor-pointer" />
                      )}
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-1 border-t border-slate-150 pt-3">
                    <div>
                      <span className="font-bold block text-slate-855">Enforce National biometric validations</span>
                      <p className="text-[10px] text-slate-450 mt-0.5">Reject signatures if fingerprint loop indices score below 90% match</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIdentityChecks(!identityChecks)}
                      className="outline-none"
                    >
                      {identityChecks ? (
                        <ToggleRight className="w-8 h-8 text-blue-600 cursor-pointer" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-350 cursor-pointer" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic RBAC Role Permissions Control Grid */}
              {permissionsMatrix && onUpdatePermissions && (
                <div className="bg-slate-50/30 border border-slate-200 p-5 rounded-xl space-y-4 mt-6">
                  <div className="flex gap-2 items-center">
                    <ShieldAlert className="w-5 h-5 text-indigo-650" />
                    <div>
                      <h4 className="text-sm font-sans font-bold text-slate-900">Control Role Permissions Matrix (RBAC)</h4>
                      <p className="text-xs text-slate-500">Configure global permission tokens for specific roles in real-time</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto text-xs text-slate-700 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                          <th className="p-3.5 font-bold">System Role</th>
                          <th className="p-3.5 font-bold text-center">Draft Document</th>
                          <th className="p-3.5 font-bold text-center">Bypass Biometrics</th>
                          <th className="p-3.5 font-bold text-center">Onboard Staff Clerks</th>
                          <th className="p-3.5 font-bold text-center">View Reports</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {["EMPLOYEE", "BRANCH_ADMIN", "CUSTOMER"].map(role => (
                          <tr key={role} className="hover:bg-slate-50/50">
                            <td className="p-3.5 font-bold text-slate-900 font-mono text-[11px]">
                              ROLE_{role}
                            </td>
                            <td className="p-3.5 text-center">
                              <input 
                                type="checkbox"
                                checked={!!permissionsMatrix[role]?.["CREATE_DOCUMENT"]}
                                onChange={(e) => {
                                  const updated = {
                                    ...permissionsMatrix,
                                    [role]: { ...permissionsMatrix[role], "CREATE_DOCUMENT": e.target.checked }
                                  };
                                  onUpdatePermissions(updated);
                                }}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3.5 text-center">
                              <input 
                                type="checkbox"
                                checked={!!permissionsMatrix[role]?.["BYPASS_BIOMETRICS"]}
                                onChange={(e) => {
                                  const updated = {
                                    ...permissionsMatrix,
                                    [role]: { ...permissionsMatrix[role], "BYPASS_BIOMETRICS": e.target.checked }
                                  };
                                  onUpdatePermissions(updated);
                                }}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3.5 text-center">
                              <input 
                                type="checkbox"
                                checked={!!permissionsMatrix[role]?.["MANAGE_EMPLOYEES"]}
                                onChange={(e) => {
                                  const updated = {
                                    ...permissionsMatrix,
                                    [role]: { ...permissionsMatrix[role], "MANAGE_EMPLOYEES": e.target.checked }
                                  };
                                  onUpdatePermissions(updated);
                                }}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3.5 text-center">
                              <input 
                                type="checkbox"
                                checked={!!permissionsMatrix[role]?.["VIEW_REPORTS"]}
                                onChange={(e) => {
                                  const updated = {
                                    ...permissionsMatrix,
                                    [role]: { ...permissionsMatrix[role], "VIEW_REPORTS": e.target.checked }
                                  };
                                  onUpdatePermissions(updated);
                                }}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                  onClick={() => alert("Environments credentials stored successfully on the secure tenant config key-store.")}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-sm cursor-pointer"
                >
                  Save Settings Parameters
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
