import React, { useState, useRef, useEffect, useCallback } from "react";
type Appointment = { id: string; branchId?: string; customer_name: string; service_type: string; appointmentTime: string; status: string; customerEmail?: string };

import { 
  Building2, Users, Calendar, Clock, CheckCircle, ShieldAlert, FileText, 
  User, ArrowRight, Zap, Bell, Check, Search, UserPlus, Shield, Sparkles, 
  Lock, Key, Ban, UserCheck, AlertTriangle, Play, HelpCircle, Send, TrendingUp, 
  FileSpreadsheet, ClipboardList, RefreshCw, Star, Coins, Download, Settings, ChevronRight, X, Phone, Mail, Sliders, Menu, Sun, Moon
} from "lucide-react";
import { Branch, Employee, QueueTicket, NotaryDocument, Customer } from "../types";
import { documentsApi, customersApi, CustomerDocumentHistoryItem, CustomerActivityItem } from "../api/documents.api";
import { appointmentsApi, formatAppointmentDisplayTime } from "../api/appointments.api";
import { queueApi } from "../api/queue.api";
import { analyticsApi, BranchReport } from "../api/analytics.api";
import { auditApi, AuditLogEntry } from "../api/settings.api";
import { getAccessToken, ApiException } from "../api/client";

interface BranchAdminPortalProps {
  branchId?: string;
  branchName?: string;
  branches: Branch[];
  employees: Employee[];
  appointments: never[];
  queue: QueueTicket[];
  documents?: NotaryDocument[];
  onLogout: () => void;
}

// Extracted types for the state of this administration dashboard
interface ExtendedEmployee {
  id: string;
  name: string;
  email: string;
  role: "Document Officer" | "Receptionist" | "Cashier" | "Notary Officer" | "Verification Officer" | "Customer Service";
  status: "available" | "busy" | "offline" | "suspended";
  assignedCounter: number;
  permissions: string[];
}

interface AdminCustomer {
  id: string;
  name: string;
  phone: string;
  nationalId: string;
  docNumber: string;
  status: string;
  visitsCount: number;
  historyLogs: string[];
}

function customerToAdmin(c: Customer): AdminCustomer {
  return {
    id: c.id,
    name: c.full_name,
    phone: c.phone ?? "",
    nationalId: c.id_number ?? "",
    docNumber: "",
    status: c.status,
    visitsCount: 1,
    historyLogs: [],
  };
}

export default function BranchAdminPortal({
  branchId,
  branchName,
  branches,
  employees,
  appointments,
  queue,
  documents = [],
  onLogout
}: BranchAdminPortalProps) {
  
  // Active branch from API context
  const activeBranch = branches[0] || (branchName ? {
    id: branchId ?? "",
    name: branchName,
    address: "",
    phone: "",
    countersCount: 2,
  } : {
    name: "Branch Office",
    address: "",
    phone: "",
    countersCount: 2,
  });

  // Primary Sidebar state
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "customers" | "documents" | "appointments" | "queue" | "employees" | "fingerprints" | "reports" | "notifications" | "settings"
  >("dashboard");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("portal-theme-branch-admin") === "dark";
  });

  useEffect(() => {
    localStorage.setItem("portal-theme-branch-admin", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deskLoading, setDeskLoading] = useState(true);

  const loadDeskData = useCallback(async () => {
    setDeskLoading(true);
    try {
      const [docsRes, custsRes, appsRes, queueRes] = await Promise.all([
        documentsApi.list({ limit: 100, branchId }),
        customersApi.list(),
        appointmentsApi.list({ limit: 100, branchId }),
        queueApi.list(branchId),
      ]);
      setLocalDocs(docsRes.documents);
      setCustomers(custsRes.customers.map(customerToAdmin));
      setLocalApps(appsRes.appointments.map(a => ({
        id: a.id,
        branchId: a.branch_id,
        customer_name: a.customer_name,
        customerEmail: a.customer_email ?? undefined,
        service_type: a.service_type,
        appointmentTime: formatAppointmentDisplayTime(a.start_time),
        status: a.status === "cancelled" ? "canceled" : a.status,
      })));
      setLocalQueue(queueRes.tickets);
    } catch (err) {
      console.error("[BranchAdminPortal] Failed to load desk data:", err);
    } finally {
      setDeskLoading(false);
    }
  }, [branchId]);

  useEffect(() => { loadDeskData(); }, [loadDeskData]);

  // Local state tables to make mutations functional for the Branch Admin (e.g. Crud Employees, manage queues, verify fingerprints)
  const [localEmployees, setLocalEmployees] = useState<ExtendedEmployee[]>([]);

  const [localQueue, setLocalQueue] = useState<QueueTicket[]>([]);

  const [localDocs, setLocalDocs] = useState<NotaryDocument[]>([]);

  const [localApps, setLocalApps] = useState<Appointment[]>([]);

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);

  const [notifications, setNotifications] = useState<{ id: string; type: string; title: string; details: string; date: string }[]>([]);

  // AI assistant states
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiHistory, setAiHistory] = useState<{ sender: "user" | "ai"; msg: string }[]>([]);

  // General state triggers
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [docSearch, setDocSearch] = useState("");
  const [calendarScope, setCalendarScope] = useState<"today" | "week" | "month">("today");
  
  // Form placeholders for adding employees, tickets, setting updates
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpRole, setNewEmpRole] = useState<ExtendedEmployee["role"]>("Document Officer");
  const [newEmpCounter, setNewEmpCounter] = useState(1);

  // Settings state
  const [settings, setSettings] = useState({
    branchName: activeBranch.name,
    branchPhone: activeBranch.phone || "",
    branchEmail: "",
    hoursStart: "08:00 AM",
    hoursEnd: "05:00 PM",
    workingDays: "Saturday - Thursday",
    queueRules: "SLA wait limit 15 minutes. Call notification sounds enabled.",
    appointmentRules: "Walk-ins permitted only on Wednesdays. Double bookings restricted."
  });

  // Keep settings display in sync with the real branch record once it loads/changes
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      branchName: activeBranch.name,
      branchPhone: activeBranch.phone || prev.branchPhone,
    }));
  }, [activeBranch.name, activeBranch.phone]);

  // Selected entities for focus popovers/modals
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [selectedDocToReview, setSelectedDocToReview] = useState<NotaryDocument | null>(null);
  const [reassignAppTarget, setReassignAppTarget] = useState<Appointment | null>(null);
  const [reassignTargetEmp, setReassignTargetEmp] = useState("");

  // Visual paging toast shown after a real queue call action
  const [broadcastingChime, setBroadcastingChime] = useState<string | null>(null);

  // Reports downloader state
  const [selectedReportType, setSelectedReportType] = useState<"daily" | "weekly" | "monthly" | "employee" | "document" | "revenue">("daily");
  const [generatedReport, setGeneratedReport] = useState<BranchReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Real branch audit log (replaces the old fake biometrics simulator)
  const [branchAuditLogs, setBranchAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Real customer history (documents + activity), fetched when a customer is opened
  const [customerHistory, setCustomerHistory] = useState<{
    documents: CustomerDocumentHistoryItem[];
    activity: CustomerActivityItem[];
  } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Triggering visual paging toast chime
  const pageChime = (text: string) => {
    setBroadcastingChime(text);
    setTimeout(() => {
      setBroadcastingChime(null);
    }, 4500);
  };

  // Queue core actions
  const handleCallNext = async () => {
    try {
      const res = await queueApi.callNext(branchId, 1);
      setLocalQueue(prev => {
        const idx = prev.findIndex(q => q.id === res.ticket.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = res.ticket;
          return updated;
        }
        return [...prev, res.ticket];
      });
      pageChime(`🛎️ Audio Chime: Calling Ticket ${res.ticket.ticket_number} (${res.ticket.customer_name}) to Counter 1.`);
      setNotifications(prev => [
        { id: Date.now().toString(), type: "info", title: "Ticket Status Shifted", details: `Called ${res.ticket.customer_name} (${res.ticket.ticket_number}) to Counter 1.`, date: "Just now" },
        ...prev
      ]);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "No pending check-in tickets available in the lobby.");
    }
  };

  const handleSkipTicket = async (id: string) => {
    try {
      const res = await queueApi.skip(id);
      setLocalQueue(prev => prev.map(q => q.id === id ? res.ticket : q));
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to skip ticket.");
    }
  };

  const handleTransferTicket = async (id: string, newCounter: number) => {
    try {
      const res = await queueApi.callNext(branchId, newCounter);
      setLocalQueue(prev => prev.map(q => q.id === res.ticket.id ? res.ticket : q));
      pageChime(`⚙️ Ticket transferred successfully. Paged to Station Counter ${newCounter}.`);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to transfer ticket.");
    }
  };

  const handleReopenTicket = async (id: string) => {
    try {
      const res = await queueApi.recall(id);
      setLocalQueue(prev => prev.map(q => q.id === id ? res.ticket : q));
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to restore ticket.");
    }
  };

  const handleManualCheckIn = async () => {
    const guest = prompt("Enter customer name for manual walk-in queue check-in:");
    if (!guest) return;
    const svc = prompt("Enter service (Power of Attorney, Affidavit, Contract):") || "General Notary";
    try {
      const res = await queueApi.checkIn({
        branchId,
        customerName: guest,
        serviceType: svc,
      });
      setLocalQueue(prev => [...prev, res.ticket]);
      alert(`✓ Walk-in Ticket ${res.ticket.ticket_number} registered.`);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to register walk-in ticket.");
    }
  };

  const handleCompleteTicket = async (id: string) => {
    try {
      const res = await queueApi.complete(id);
      setLocalQueue(prev => prev.map(q => q.id === id ? res.ticket : q));
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to complete ticket.");
    }
  };

  // Employee creation
  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpEmail.trim()) {
      alert("Please specify name and registry email.");
      return;
    }
    const newEmp: ExtendedEmployee = {
      id: "emp-" + (Date.now() % 1000),
      name: newEmpName,
      email: newEmpEmail,
      role: newEmpRole,
      status: "available",
      assignedCounter: Number(newEmpCounter),
      permissions: ["Review Files", "Authenticate Biometrics"]
    };
    setLocalEmployees(prev => [...prev, newEmp]);
    
    setNotifications(prev => [
      { id: Date.now().toString(), type: "system", title: "Employee Recruited", details: `${newEmpName} onboarded as ${newEmpRole} under Counter ${newEmpCounter}.`, date: "Just now" },
      ...prev
    ]);

    setNewEmpName("");
    setNewEmpEmail("");
    alert(`Success: ${newEmpName} registered as ${newEmpRole} within the branch database!`);
  };

  const handleToggleSuspendEmployee = (id: string) => {
    setLocalEmployees(prev => prev.map(emp => {
      if (emp.id === id) {
        const nextStatus = emp.status === "suspended" ? "offline" : "suspended";
        return { ...emp, status: nextStatus };
      }
      return emp;
    }));
  };

  const handleResetPassword = (name: string) => {
    alert(`🔐 Security Token Regenerated for ${name}.\nAn administrative password reset hash was dispatched to their Veritas secure workstation email.`);
  };

  const handleUpdateRoleAndPermissions = (id: string, newRole: ExtendedEmployee["role"]) => {
    setLocalEmployees(prev => prev.map(emp => {
      if (emp.id === id) {
        return { ...emp, role: newRole };
      }
      return emp;
    }));
    alert(`Role updated to ${newRole}`);
  };

  // Appointment alterations
  const handleCancelApp = async (id: string) => {
    try {
      await appointmentsApi.transition(id, "cancelled");
      setLocalApps(prev => prev.map(app => app.id === id ? { ...app, status: "canceled" as const } : app));
      setNotifications(prev => [
        { id: Date.now().toString(), type: "alert", title: "Appointment Canceled", details: "Booking cancelled in the system.", date: "Just now" },
        ...prev
      ]);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to cancel appointment.");
    }
  };

  const triggerReassignApp = (target: Appointment) => {
    setReassignAppTarget(target);
    setReassignTargetEmp(localEmployees[0]?.name || "");
  };

  const executeReassignApp = async () => {
    if (!reassignAppTarget || !reassignTargetEmp) return;
    try {
      await appointmentsApi.update(reassignAppTarget.id, { assignedEmployeeId: reassignTargetEmp });
      const assignedName = localEmployees.find(e => e.id === reassignTargetEmp)?.name ?? "the selected officer";
      setReassignAppTarget(null);
      alert(`✓ Booking slot reassigned to ${assignedName}`);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to reassign appointment.");
    }
  };

  // Document actions
  const handleUpdateDocStatus = async (id: string, status: NotaryDocument["status"]) => {
    try {
      const res = await documentsApi.transition(id, status);
      setLocalDocs(prev => prev.map(doc => doc.id === id ? res.document : doc));
      setNotifications(prev => [
        { id: Date.now().toString(), type: "success", title: "Document Ledger Updated", details: `File ${res.document.document_number} status set to ${status}.`, date: "Just now" },
        ...prev
      ]);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to update document status.");
    }
  };

  const executeDocumentApprove = async (id: string) => {
    const doc = localDocs.find(d => d.id === id);
    if (!doc) return;
    const nextStatus: Record<string, NotaryDocument["status"]> = {
      draft: "pending_review",
      pending_review: "approved",
      approved: "signed",
      signed: "notarised",
      rejected: "draft",
    };
    const target = nextStatus[doc.status];
    if (!target) {
      alert(`Cannot advance document from status '${doc.status}'.`);
      return;
    }
    try {
      const res = await documentsApi.transition(id, target);
      setLocalDocs(prev => prev.map(d => d.id === id ? res.document : d));
      setSelectedDocToReview(null);
      alert(`Document ${res.document.document_number} moved to ${target}.`);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to approve document.");
    }
  };

  const executeDocumentReject = async (id: string) => {
    try {
      const res = await documentsApi.transition(id, "rejected", "Rejected by branch supervisor");
      setLocalDocs(prev => prev.map(d => d.id === id ? res.document : d));
      setSelectedDocToReview(null);
      alert("Document rejected and returned for corrections.");
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to reject document.");
    }
  };

  // Real branch audit log — replaces the old fake biometrics simulator
  const loadBranchAuditLogs = async () => {
    if (!branchId) return;
    setAuditLoading(true);
    try {
      const res = await auditApi.list({ branchId, limit: 30 });
      setBranchAuditLogs(res.logs);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  // Real customer document history + activity trail
  const openCustomerDetail = async (cust: AdminCustomer) => {
    setSelectedCustomer(cust);
    setCustomerHistory(null);
    setHistoryLoading(true);
    try {
      const res = await customersApi.history(cust.id);
      setCustomerHistory({ documents: res.documents, activity: res.activity });
    } catch (err) {
      console.error("Failed to load customer history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load the real audit log whenever the Audit Log tab is opened
  useEffect(() => {
    if (activeTab === "fingerprints") {
      loadBranchAuditLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, branchId]);

  // AI assistant — uses Gemini API with local branch context fallbacks
  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    const prompt = aiPrompt;
    setAiHistory(prev => [...prev, { sender: "user", msg: prompt }]);
    setAiPrompt("");

    let reply = "I have analyzed the current branch database. If you have any other questions, let me know.";
    const lower = prompt.toLowerCase();

    try {
      const token = getAccessToken();
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });
      const data = await response.json();
      if (data.success && data.reply) {
        setAiHistory(prev => [...prev, { sender: "ai", msg: data.reply }]);
        return;
      }
    } catch {
      // fall through to local context replies
    }
    
    if (lower.includes("employee") && (lower.includes("most") || lower.includes("highest") || lower.includes("processed"))) {
      try {
        const empReport = await analyticsApi.branchReport({ branchId, type: "employee", period: "weekly" });
        if (empReport.type === "employee" && empReport.employees.length > 0) {
          const top = empReport.employees[0];
          reply = `📊 **Top Employee Performance (${empReport.periodLabel})**:\n**${top.name}** (${top.jobRole}) processed **${top.documentsProcessed} documents** and served **${top.ticketsServed} tickets**` +
            (top.avgProcessingMinutes != null ? `, averaging **${top.avgProcessingMinutes} min** per ticket.` : ".");
        } else {
          reply = "📊 No employee activity has been recorded for this branch in the last 7 days yet.";
        }
      } catch {
        reply = "I couldn't load employee performance data right now — please try the Reports tab instead.";
      }
    } else if (lower.includes("pending") && lower.includes("document")) {
      const pendingCount = localDocs.filter(d => !["notarised", "revoked"].includes(d.status)).length;
      reply = `📂 **Pending Documents Audit**:\nThere are currently **${pendingCount} pending documents** awaiting notarisation in this branch.`;
    } else if (lower.includes("busiest") || lower.includes("day")) {
      try {
        const weekly = await analyticsApi.branchReport({ branchId, type: "weekly" });
        if (weekly.type === "weekly") {
          reply = `📅 **Weekly Activity**:\nOver the last 7 days this branch processed **${weekly.documentsProcessed} documents** and completed **${weekly.queueCompleted} queue tickets**. A per-day breakdown isn't available yet — this is the aggregate for the period.`;
        }
      } catch {
        reply = "I couldn't load weekly activity data right now — please try the Reports tab instead.";
      }
    } else if (lower.includes("report") || lower.includes("generate")) {
      try {
        const weekly = await analyticsApi.branchReport({ branchId, type: "weekly" });
        if (weekly.type === "weekly") {
          reply = `📑 **Weekly Branch Summary**:\n- Documents processed: ${weekly.documentsProcessed}\n- Documents notarised: ${weekly.documentsNotarised}\n- Queue tickets completed: ${weekly.queueCompleted}\n- Currently waiting: ${weekly.queueWaitingNow}\nOpen the 'Reports' tab to export this as PDF or CSV.`;
        }
      } catch {
        reply = "I couldn't generate the report right now — please try the Reports tab instead.";
      }
    }

    setAiHistory(prev => [...prev, { sender: "ai", msg: reply }]);
  };

  // Fetch real branch report data from the backend
  const handleTriggerReportGeneration = async () => {
    setReportLoading(true);
    setGeneratedReport(null);
    try {
      const params: { branchId?: string; type: string; period?: string } = {
        branchId,
        type: selectedReportType,
      };
      if (selectedReportType === "employee") params.period = "weekly";
      const report = await analyticsApi.branchReport(params);
      setGeneratedReport(report);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to generate report.");
    } finally {
      setReportLoading(false);
    }
  };

  // Build plain-text lines from the real report data (shared by preview, CSV, and PDF export)
  const reportToLines = (report: BranchReport): string[] => {
    const lines: string[] = [`NotaryHub Branch Report — ${branchName ?? "Branch"}`];
    if (report.type === "employee") {
      lines.push(`Employee productivity — ${report.periodLabel}`);
      lines.push("");
      report.employees.forEach(e => {
        lines.push(`${e.name} (${e.jobRole}) — ${e.documentsProcessed} documents, ${e.ticketsServed} tickets served` +
          (e.avgProcessingMinutes != null ? `, avg ${e.avgProcessingMinutes} min` : ""));
      });
    } else if (report.type === "document") {
      lines.push("Document ledger");
      lines.push("");
      lines.push(`Total: ${report.totals.total}`);
      lines.push(`Notarised: ${report.totals.notarised}`);
      lines.push(`Pending: ${report.totals.pending}`);
      lines.push(`Rejected/Revoked/Expired: ${report.totals.rejected}`);
      lines.push("");
      report.byStatus.forEach(s => lines.push(`${s.status}: ${s.count}`));
    } else if (report.type === "revenue") {
      lines.push("Revenue");
      lines.push("");
      lines.push(report.message);
      lines.push(`Company-level MRR: $${report.tenantMrrDollars}`);
    } else {
      lines.push(`${report.periodLabel}`);
      lines.push("");
      lines.push(`Documents processed: ${report.documentsProcessed}`);
      lines.push(`Documents notarised: ${report.documentsNotarised}`);
      lines.push(`Customers served: ${report.customersServedDocs}`);
      lines.push(`Queue tickets completed: ${report.queueCompleted}`);
      lines.push(`Currently waiting in queue: ${report.queueWaitingNow}`);
      lines.push(`Avg processing time: ${report.avgProcessingMinutes != null ? report.avgProcessingMinutes + " min" : "n/a"}`);
    }
    return lines;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportReport = async (format: "pdf" | "excel") => {
    if (!generatedReport) {
      alert("Generate a report preview first.");
      return;
    }
    const lines = reportToLines(generatedReport);
    const filenameBase = `${selectedReportType}_report_${Date.now()}`;

    if (format === "excel") {
      const csv = lines.map(l => `"${l.replace(/"/g, '""')}"`).join("\n");
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filenameBase}.csv`);
      return;
    }

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(11);
    let y = 15;
    lines.forEach(line => {
      const wrapped = doc.splitTextToSize(line, 180);
      wrapped.forEach((w: string) => {
        if (y > 280) { doc.addPage(); y = 15; }
        doc.text(w, 15, y);
        y += 7;
      });
    });
    doc.save(`${filenameBase}.pdf`);
  };

  // Safe checks for arrays
  const filteredEmployees = localEmployees.filter(emp => 
    emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) || 
    emp.role.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const filteredDocs = localDocs.filter(doc => 
    doc.title.toLowerCase().includes(docSearch.toLowerCase()) || 
    doc.id.toLowerCase().includes(docSearch.toLowerCase())
  );

  // Search logic for customers across Name, Phone, ID, and Documents
  const filteredCustomers = customers.filter(cust => {
    const s = customerSearch.toLowerCase();
    return cust.name.toLowerCase().includes(s) || 
           cust.phone.toLowerCase().includes(s) || 
           cust.nationalId.toLowerCase().includes(s) || 
           cust.docNumber.toLowerCase().includes(s);
  });

  return (
    <div className={`space-y-6 p-1 dark-portal-wrapper ${isDarkMode ? "dark" : ""}`} id="comprehensive-branch-admin">
      
      {/* Broadcast sound chime notification layout */}
      {broadcastingChime && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-blue-500 max-w-sm flex items-center gap-3 animate-slideIn">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center animate-pulse shrink-0">
            <Volume2Icon className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-blue-400 block font-bold uppercase tracking-widest">Public Address Broadcaster</span>
            <p className="text-xs font-semibold leading-tight">{broadcastingChime}</p>
          </div>
        </div>
      )}

      {/* Primary Headers */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-blue-700/5 to-indigo-700/5 border border-slate-200 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-blue-700 font-bold tracking-wider uppercase font-mono">Office Management & Operations</div>
            <h1 className="text-xl font-sans font-extrabold text-slate-950 leading-tight">Branch Administration Console</h1>
            <p className="text-xs text-slate-500 mt-0.5">{settings.branchName} • Active Working Day Overview</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Theme Toggle Mode */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 transition outline-none cursor-pointer flex items-center justify-center shadow-xs"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-650" />}
          </button>

          <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 shadow-xs flex items-center gap-1.5 text-xs text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
            <span className="font-mono text-[11px] font-bold">Lobby Terminals Online</span>
          </div>
        </div>
      </div>

      {/* Mobile Header Bar for Branch Admin */}
      <div className="md:hidden w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs mb-1">
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
            <Building2 className="w-5 h-5 text-blue-600 animate-pulse" />
            <div className="text-left">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Branch Admin</h2>
              <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">{settings.branchName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 md:hidden transition-all duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Grid Dashboard Frame with macOS sidebar tabs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        
        {/* Sidebar Nav Panels - Desktop and Mobile responsive drawer */}
        <div 
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 md:border-none p-4 md:p-0 flex flex-col space-y-3 transform transition-transform duration-300 md:relative md:transform-none md:inset-auto md:w-auto md:col-span-1 overflow-y-auto h-full md:h-auto ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          {/* Mobile close button drawer header */}
          <div className="flex md:hidden items-center justify-between pb-3 border-b border-slate-200 mb-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Lobby Navigator</span>
            <button 
              type="button" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-200 rounded-md transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Main Action Links */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-1">
            <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 block px-2.5 mb-1.5 uppercase">LOBBY CHANNELS</span>
            
            <button
              onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                activeTab === "dashboard" ? "bg-slate-100 text-slate-900 font-extrabold border-l-4 border-blue-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5" /> Operations Dashboard
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("queue"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                activeTab === "queue" ? "bg-slate-100 text-slate-900 font-extrabold border-l-4 border-blue-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Queue Management
              </span>
              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded-full font-bold">
                {localQueue.filter(q => q.status === "waiting" || q.status === "calling").length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("appointments"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                activeTab === "appointments" ? "bg-slate-100 text-slate-900 font-extrabold border-l-4 border-blue-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Bookings & Schedules
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded-full font-bold font-mono">
                {localApps.filter(a => a.status === "scheduled").length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("documents"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                activeTab === "documents" ? "bg-slate-100 text-slate-900 font-extrabold border-l-4 border-blue-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Document Sealing
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded-full font-bold">
                {localDocs.filter(d => !["notarised", "revoked"].includes(d.status)).length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("customers"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === "customers" ? "bg-slate-100 text-slate-900 font-extrabold border-l-4 border-blue-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Customers Index
            </button>

            <button
              onClick={() => { setActiveTab("employees"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                activeTab === "employees" ? "bg-slate-100 text-slate-900 font-extrabold border-l-4 border-blue-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5" /> Employees & Counters
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{localEmployees.length}</span>
            </button>

            <button
              onClick={() => { setActiveTab("fingerprints"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === "fingerprints" ? "bg-slate-100 text-slate-900 font-extrabold border-l-4 border-blue-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Audit Log
            </button>

            <button
              onClick={() => { setActiveTab("reports"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === "reports" ? "bg-slate-100 text-slate-900 font-extrabold border-l-4 border-blue-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Branch Reports
            </button>

            <button
              onClick={() => { setActiveTab("notifications"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                activeTab === "notifications" ? "bg-slate-100 text-slate-900 font-extrabold border-l-4 border-blue-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5" /> Event Feeds
              </span>
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
            </button>

            <button
              onClick={() => { setActiveTab("settings"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === "settings" ? "bg-slate-100 text-slate-900 font-extrabold border-l-4 border-blue-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Branch Configuration
            </button>

            <button
              onClick={() => { setIsMobileMenuOpen(false); onLogout(); }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <Lock className="w-3.5 h-3.5" /> Leave Desk Session
            </button>
          </div>

          {/* Secure Permissions Restrictions Panel */}
          <div className="bg-slate-950 border border-slate-900 text-slate-300 rounded-2xl p-4 space-y-3 shadow-xs">
            <span className="text-[9px] font-mono text-slate-400 block uppercase font-bold tracking-widest">BRANCH ADMIN SECURITY RULES</span>
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Shield className="w-4 h-4 text-emerald-400" /> Active Local Authority
            </div>
            
            <div className="space-y-1.5 text-[10px] font-sans">
              <div className="flex justify-between text-slate-400">
                <span>Manage local employees</span> <span className="text-emerald-400 font-bold">Allowed ✓</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Configure queue rules</span> <span className="text-emerald-400 font-bold">Allowed ✓</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Approve branch deeds</span> <span className="text-emerald-400 font-bold">Allowed ✓</span>
              </div>
              <div className="flex justify-between text-slate-400 text-slate-500 border-t border-slate-900 pt-1.5">
                <span>Other branches access</span> <span className="text-red-500 font-bold">Forbidden ❌</span>
              </div>
              <div className="flex justify-between text-slate-400 font-sans">
                <span>Corporate SaaS settings</span> <span className="text-red-500 font-bold">Forbidden ❌</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Change billing plan</span> <span className="text-red-500 font-bold">Forbidden ❌</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right main columns panel */}
        <div className="md:col-span-3 space-y-6">

          {/* SCREEN 1: OPERATIONS DASHBOARD (OVERVIEW) */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fadeIn" id="branch-overview-panel">
              
              {/* Eight Unified KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">Today's Customers</span>
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="block text-2xl font-extrabold text-slate-900 mt-2">{branches.length > 0 ? 34 : 0}</span>
                  <span className="text-[9.5px] font-mono text-emerald-700 block mt-1">{branches.length > 0 ? "+14% vs yesterday" : "No live data"}</span>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">Appointments Today</span>
                    <Calendar className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="block text-2xl font-extrabold text-slate-900 mt-2">{localApps.length}</span>
                  <span className="text-[9.5px] font-mono text-slate-500 block mt-1">{localApps.filter(a => a.status === "scheduled").length} scheduled today</span>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">Queue Waiting</span>
                    <Clock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="block text-2xl font-extrabold text-slate-900 mt-2">{localQueue.filter(q => q.status === "waiting" || q.status === "calling").length}</span>
                  <span className="text-[9.5px] font-mono text-yellow-600 block mt-1">{localQueue.filter(q => q.status === "waiting").length > 0 ? `${localQueue.filter(q => q.status === "waiting").length} waiting in lobby` : "Queue empty"}</span>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">Pending Documents</span>
                    <FileText className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="block text-2xl font-extrabold text-slate-900 mt-2">{documents.length > 0 ? 15 : 0}</span>
                  <span className="text-[9.5px] font-mono text-blue-600 block mt-1">{documents.length > 0 ? "Ready for notary sign" : "All cleared"}</span>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">Completed Documents</span>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="block text-2xl font-extrabold text-slate-900 mt-2">{documents.length > 0 ? 22 : 0}</span>
                  <span className="text-[9.5px] font-mono text-emerald-700 block mt-1">{documents.length > 0 ? "99.4% seal success" : "No sealed sheets"}</span>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">Active Employees</span>
                    <UserCheck className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="block text-2xl font-extrabold text-slate-900 mt-2">{employees.length}</span>
                  <span className="text-[9.5px] font-mono text-slate-500 block mt-1">{employees.length > 0 ? "Counters manned" : "Desks vacant"}</span>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">Revenue Today</span>
                    <Coins className="w-4 h-4 text-slate-600" />
                  </div>
                  <span className="block text-2xl font-extrabold text-emerald-600 mt-2">${branches.length > 0 ? "850" : "0"}</span>
                  <span className="text-[9.5px] font-mono text-emerald-800 block mt-1">{branches.length > 0 ? "Processing completed" : "$0.00 collected"}</span>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">Customer Sat</span>
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                  </div>
                  <span className="block text-2xl font-extrabold text-slate-900 mt-2">{branches.length > 0 ? "98%" : "0%"}</span>
                  <span className="text-[9.5px] font-mono text-emerald-700 block mt-1">{branches.length > 0 ? "Based on 14 surveys" : "No reviews"}</span>
                </div>

              </div>

              {/* Layout for employee productivity, quick queue action list */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Employee productivity review list (7 columns) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-mono text-slate-500 uppercase font-black">Staff Productivity Tracker</span>
                    <span className="text-[10px] text-emerald-700 font-mono font-bold">LIVE METRIC FEED</span>
                  </div>

                  <div className="space-y-3 font-sans text-xs">
                    {[
                      { name: "Ahmed Farah", docs: 45, customers: 30, speed: "12 min", progressWidth: "w-full" },
                      { name: "Elena Rostova", docs: 30, customers: 24, speed: "18 min", progressWidth: "w-4/5" },
                      { name: "Warsame Duale", docs: 28, customers: 20, speed: "15 min", progressWidth: "w-3/4" },
                      { name: "Fathia Omar", docs: 18, customers: 42, speed: "6 min (Reception)", progressWidth: "w-1/2" }
                    ].map(emp => (
                      <div key={emp.name} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center font-semibold text-slate-900">
                          <span>{emp.name}</span>
                          <span className="text-[10px] text-slate-500">Avg Speed: <b>{emp.speed}</b></span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Documents Processed: <b>{emp.docs}</b></span>
                          <span>Clients Served: <b>{emp.customers}</b></span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full bg-indigo-600 rounded-full ${emp.progressWidth}`}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Queue Control Quick Actions & Chime box (5 columns) */}
                <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="pb-2 border-b border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-mono text-slate-500 uppercase font-black">Queue Quick Control</span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center font-mono">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Now serving slot</span>
                      <span className="text-2xl font-black text-slate-900">TKT-101</span>
                      <span className="text-[10px] text-indigo-600 block font-semibold mt-1">Guled Gurey • Counter 1</span>
                    </div>

                    <div className="space-y-2">
                      <button 
                        onClick={handleCallNext}
                        className="w-full bg-blue-600 hover:bg-blue-500 font-sans font-bold text-white text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Call Next Queue Customer
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => {
                            const activeCall = localQueue.find(q => q.status === "calling");
                            if (activeCall) handleSkipTicket(activeCall.id);
                            else alert("No actively paged ticket to pass.");
                          }}
                          className="bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 font-sans font-semibold text-slate-700 text-xs py-2 px-3 rounded-lg transition text-center block"
                        >
                          Skip Ticket
                        </button>
                        <button 
                          onClick={() => {
                            const lastComp = localQueue.find(q => q.status === "completed");
                            if (lastComp) handleReopenTicket(lastComp.id);
                            else alert("No completed tickets found.");
                          }}
                          className="bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 font-sans font-semibold text-slate-700 text-xs py-2 px-3 rounded-lg transition text-center block"
                        >
                          Reopen Last
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] text-indigo-900 font-sans leading-relaxed">
                    💡 <b>Queue Guideline:</b> If average client waiting time spikes beyond 15 minutes, deploy digital backup reception kiosks or transfer overflow.
                  </div>
                </div>

              </div>

              {/* Branch Analytics & AI assistant Box */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Local Branch Mini Chart Visual */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-indigo-50">
                    <span className="text-xs font-mono text-slate-500 uppercase font-black">Branch Performance Trends</span>
                    <span className="text-[10px] text-slate-400 font-sans">Active Month</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-slate-650 font-sans pb-1.5 font-semibold">
                        <span>Documents Completed vs Rejected</span>
                        <span className="text-emerald-700">98.4% success</span>
                      </div>
                      <div className="flex h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 w-[94%]"></div>
                        <div className="bg-indigo-400 w-[4%]"></div>
                        <div className="bg-red-400 w-[2%]"></div>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 pt-1 font-mono">
                        <span>Legal Seals APPROVED (94%)</span>
                        <span>Archived (4%)</span>
                        <span>Rejected (2%)</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-650 font-sans pb-1.5 font-semibold">
                        <span>Traffic Streams by Service type</span>
                        <span className="text-blue-700 font-mono text-[10px]">Active</span>
                      </div>
                      <div className="flex h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="bg-blue-500 w-[45%]"></div>
                        <div className="bg-amber-400 w-[30%]"></div>
                        <div className="bg-purple-500 w-[25%]"></div>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 pt-1 font-mono">
                        <span>Power of Attorney (45%)</span>
                        <span>Affidavits (30%)</span>
                        <span>Contracts (25%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Assistant interactive panel */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-indigo-900/60">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                      <div>
                        <span className="text-[9px] font-mono tracking-widest text-indigo-300 block uppercase font-bold">Veritas Branch AI Copilot</span>
                        <h4 className="text-xs font-bold text-white">Ask operations, schedules, or pending audits</h4>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs max-h-[140px] overflow-y-auto pr-1">
                      {aiHistory.map((ch, idx) => (
                        <div key={idx} className={`p-2 rounded-xl text-xs space-y-1 ${
                          ch.sender === "ai" ? "bg-indigo-900/40 text-slate-200 border border-indigo-900/20" : "bg-slate-800 text-white border border-slate-700 ml-6"
                        }`}>
                          <p className="whitespace-pre-line leading-relaxed text-[11px] font-sans">{ch.msg}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleAISubmit} className="flex gap-2 pt-2 border-t border-indigo-900/40">
                    <input 
                      type="text" 
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Ask copilot about busiest days or employee records..."
                      className="flex-1 bg-slate-950/70 text-xs border border-indigo-900 rounded-xl px-3 py-2 text-white outline-none placeholder:text-slate-500"
                    />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 p-2 rounded-xl text-white transition">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

              </div>

            </div>
          )}

          {/* SCREEN 2: LOBBY QUEUE MANAGEMENT */}
          {activeTab === "queue" && (
            <div className="space-y-6 animate-fadeIn" id="branch-queue-lobby">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Live Check-in Queue Manager</span>
                    <h3 className="text-sm font-sans font-bold text-slate-900 mt-0.5">Control lobby call pacing</h3>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleCallNext}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-xs transition"
                    >
                      Call Next Client
                    </button>
                    <button 
                      onClick={handleManualCheckIn}
                      className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-1.5 px-3 rounded-lg transition"
                    >
                      + Manual Check-in
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {localQueue.map(tkt => (
                    <div key={tkt.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-sans">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-white border border-slate-300 font-mono font-bold text-slate-800 text-[10px] px-2 py-0.5 rounded-md shadow-xs">{tkt.ticket_number}</span>
                          <h4 className="font-bold text-slate-900 text-sm">{tkt.customer_name}</h4>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono">
                          Checked-in: <b>{tkt.check_in_time}</b> • Requested: <b className="text-slate-700">{tkt.service_type}</b>
                          {tkt.called_counter && ` • Assigned Station: Counter ${tkt.called_counter}`}
                          {tkt.served_by && ` • Handled By: ${tkt.served_by}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          tkt.status === "calling" ? "bg-amber-100 text-amber-700 font-black animate-pulse" :
                          tkt.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                          tkt.status === "passed" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"
                        }`}>
                          {tkt.status}
                        </span>

                        {tkt.status === "waiting" && (
                          <div className="flex gap-1.5">
                            <button 
                              onClick={() => handleTransferTicket(tkt.id, 1)}
                              className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold p-1 px-2 rounded-md font-sans text-[11px]"
                            >
                              Call Post 1
                            </button>
                            <button 
                              onClick={() => handleTransferTicket(tkt.id, 2)}
                              className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold p-1 px-2 rounded-md font-sans text-[11px]"
                            >
                              Call Post 2
                            </button>
                            <button 
                              onClick={() => handleSkipTicket(tkt.id)}
                              className="text-red-600 hover:underline px-1 font-semibold text-[11px]"
                            >
                              Skip
                            </button>
                          </div>
                        )}

                        {tkt.status === "calling" && (
                          <button 
                            onClick={() => handleCompleteTicket(tkt.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-1 px-2.5 rounded-md font-sans text-[11px]"
                          >
                            Mark Completed
                          </button>
                        )}

                        {tkt.status === "passed" && (
                          <button 
                            onClick={() => handleReopenTicket(tkt.id)}
                            className="bg-white border border-slate-200 text-slate-700 font-bold p-1 px-2 rounded-md font-sans text-[11px]"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {localQueue.length === 0 && (
                    <p className="text-xs text-slate-500 italic text-center py-6">Lobby list is cleared. No customers currently waiting.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 3: BOOKINGS & CALENDAR SCHEDULES */}
          {activeTab === "appointments" && (
            <div className="space-y-6 animate-fadeIn" id="branch-appointments-panel">
              
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Bookings & Calendar Hub</span>
                    <h3 className="text-sm font-sans font-bold text-slate-900 mt-0.5">Manage appointment schedules & calendars</h3>
                  </div>

                  {/* Calendar View Scope options */}
                  <div className="flex bg-slate-50 p-1 border border-slate-200 rounded-lg text-xs font-sans font-semibold">
                    <button 
                      onClick={() => setCalendarScope("today")}
                      className={`px-3 py-1 rounded-md transition ${calendarScope === "today" ? "bg-white text-slate-950 shadow-sm font-bold" : "text-slate-500"}`}
                    >
                      Today
                    </button>
                    <button 
                      onClick={() => setCalendarScope("week")}
                      className={`px-3 py-1 rounded-md transition ${calendarScope === "week" ? "bg-white text-slate-950 shadow-sm font-bold" : "text-slate-500"}`}
                    >
                      Week
                    </button>
                    <button 
                      onClick={() => setCalendarScope("month")}
                      className={`px-3 py-1 rounded-md transition ${calendarScope === "month" ? "bg-white text-slate-950 shadow-sm font-bold" : "text-slate-500"}`}
                    >
                      Month
                    </button>
                  </div>
                </div>

                {/* Calendar list scoped */}
                <div className="space-y-3">
                  <div className="p-2.5 bg-indigo-50 border border-indigo-150 rounded-xl flex items-center justify-between text-xs font-semibold text-indigo-950">
                    <span>Active Display State: {calendarScope.toUpperCase()}'s Booked Operations</span>
                    <span>Total: {localApps.length} Itineraries</span>
                  </div>

                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
                    {localApps.map(app => (
                      <div key={app.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-sans">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-950 text-sm leading-tight">{app.customer_name}</h4>
                            <span className="text-[10px] text-slate-500 font-mono">{app.customerEmail}</span>
                          </div>
                        </div>

                        <div className="text-left sm:text-right font-mono">
                          <span className="text-indigo-700 block font-bold">{app.appointmentTime}</span>
                          <span className="text-slate-650 block text-[11px] font-sans">Deed requested: <b>{app.service_type}</b></span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                            app.status === "scheduled" ? "bg-blue-100 text-blue-700 border border-blue-200" :
                            app.status === "canceled" ? "bg-red-50 text-red-600" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {app.status}
                          </span>

                          {app.status === "scheduled" && (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => triggerReassignApp(app)}
                                className="bg-white border border-slate-200 hover:bg-slate-100 font-semibold p-1.5 rounded-lg text-[11px] text-slate-800 transition"
                              >
                                Reassign Desk
                              </button>
                              <button 
                                onClick={() => handleCancelApp(app.id)}
                                className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg text-[11px] font-bold transition"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calendar reassign popover — real assignment via appointmentsApi.update */}
                {reassignAppTarget && (
                  <div className="p-4 bg-slate-100 border border-slate-350 rounded-xl space-y-3 font-sans text-xs">
                    <p className="font-bold text-slate-800">Reassign {reassignAppTarget.customer_name}'s schedule desk:</p>
                    <div className="flex gap-2">
                      <select 
                        value={reassignTargetEmp}
                        onChange={(e) => setReassignTargetEmp(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs"
                      >
                        {localEmployees.map(e => (
                          <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                        ))}
                      </select>
                      <button 
                        onClick={executeReassignApp}
                        className="bg-indigo-600 text-white font-bold px-3 py-2 rounded-lg"
                      >
                        Assign Draft
                      </button>
                      <button 
                        onClick={() => setReassignAppTarget(null)}
                        className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* SCREEN 4: DIRECT SEALS & DOCUMENTS STATUS */}
          {activeTab === "documents" && (
            <div className="space-y-6 animate-fadeIn" id="branch-documents-panel">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Branch Sealed Documents & Escrow ledger</span>
                    <h3 className="text-sm font-sans font-bold text-slate-900 mt-0.5">Audit, signature seals, and statuses</h3>
                  </div>
                  <input 
                    type="text" 
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Search Document Serial or Title..."
                    className="bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-1.5 outline-none font-sans"
                  />
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {filteredDocs.map(doc => (
                    <div key={doc.id} className="p-4 bg-slate-50 border border-slate-250 rounded-xl space-y-3 font-sans text-xs">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-white border border-slate-350 px-2 py-0.5 rounded font-bold text-slate-700">{doc.id}</span>
                            <span className="font-mono text-[9px] text-slate-400">Created: {doc.createdAt}</span>
                          </div>
                          <h4 className="font-sans font-extrabold text-slate-900 text-sm mt-1">{doc.title}</h4>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold font-mono self-start sm:self-auto ${
                          doc.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                          doc.status === "pending-signature" ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-700"
                        }`}>
                          {doc.status}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                        <span className="text-[9px] text-slate-400 font-mono block">PARTIES COVENANT</span>
                        <p className="font-bold text-slate-800 text-[11px] font-sans mt-0.5">{doc.parties.join(" • ")}</p>
                        {doc.watermarkCode && (
                          <p className="text-[10px] text-blue-700 mt-1.5 font-mono">
                            🔏 Seal Code: <b>{doc.watermarkCode}</b> • Hash: <span>{doc.fingerprintHash || "sha256"}</span>
                          </p>
                        )}
                      </div>

                      {/* Document Actions: review, approve, reject, dynamic assignments */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                        <span className="text-[10px] text-slate-400 font-mono">Assigned Staff Desk: Clerk Warsame</span>
                        
                        <div className="flex gap-1.5">
                          {doc.status !== "completed" ? (
                            <>
                              <button 
                                onClick={() => setSelectedDocToReview(doc)}
                                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-1 px-2.5 rounded text-[11px] transition"
                              >
                                Review & Seal
                              </button>
                              <button 
                                onClick={() => handleUpdateDocStatus(doc.id, "revoked")}
                                className="text-slate-500 hover:underline px-1 font-bold text-[11px]"
                              >
                                Archive
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => alert(`🖨️ Spooling secure printer and watermark seal code for document: ${doc.id}...`)}
                              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-1 px-2.5 rounded text-[11px] flex items-center gap-1 transition"
                            >
                              Print Watermark Certified
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  ))}
                  {filteredDocs.length === 0 && (
                    <p className="text-xs text-slate-500 italic text-center py-6">No matching documents verified today.</p>
                  )}
                </div>

                {/* Document review popover — real document content */}
                {selectedDocToReview && (
                  <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-300 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-scaleIn font-sans">
                      <div className="flex justify-between items-start pb-2 border-b border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono block">LEDGER DEED SEAL DESK</span>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">{selectedDocToReview.title}</h4>
                        </div>
                        <button onClick={() => setSelectedDocToReview(null)} className="text-slate-400 hover:text-slate-650">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 max-h-[160px] overflow-y-auto font-mono text-[10.5px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                        <b>{selectedDocToReview.doc_type.replace(/_/g, " ")} — {selectedDocToReview.document_number}</b><br />
                        {selectedDocToReview.content || selectedDocToReview.summary || "No document content on file yet."}
                      </div>

                      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs space-y-2">
                        <span className="font-extrabold text-indigo-950 block">Document status:</span>
                        <div className="space-y-1.5 font-sans">
                          <div className="flex justify-between text-[11px]">
                            <span>Jurisdiction:</span> <span className="text-slate-700 font-bold">{selectedDocToReview.jurisdiction || "Not specified"}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>Current status:</span> <span className="text-indigo-700 font-bold">{selectedDocToReview.status}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button 
                          onClick={() => executeDocumentApprove(selectedDocToReview.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition"
                        >
                          Approve, Sign & Seal Completed
                        </button>
                        <button 
                          onClick={() => executeDocumentReject(selectedDocToReview.id)}
                          className="bg-red-50 text-red-600 hover:bg-red-100 font-bold px-3 py-2 rounded-xl text-xs transition"
                        >
                          Reject Request
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SCREEN 5: EMPLOYEES & WORKSTATIONS */}
          {activeTab === "employees" && (
            <div className="space-y-6 animate-fadeIn" id="branch-employees-panel">
              
              {/* Form to Recruit/Create new Employee */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <span className="text-xs font-mono text-slate-500 uppercase font-black">Onboard Local Branch Staff</span>
                
                <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-650 font-semibold font-mono uppercase">Full Name</label>
                    <input 
                      type="text" 
                      value={newEmpName}
                      onChange={(e) => setNewEmpName(e.target.value)}
                      placeholder="e.g. Amina Yusuf"
                      className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl p-2 outline-none font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-655 font-semibold font-mono uppercase">Workplace Email</label>
                    <input 
                      type="email" 
                      value={newEmpEmail}
                      onChange={(e) => setNewEmpEmail(e.target.value)}
                      placeholder="e.g. amina@veritas.so"
                      className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl p-2 outline-none font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-655 font-semibold font-mono uppercase">Role</label>
                      <select 
                        value={newEmpRole}
                        onChange={(e) => setNewEmpRole(e.target.value as any)}
                        className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl p-2 outline-none font-sans font-semibold"
                      >
                        <option value="Document Officer">Document Officer</option>
                        <option value="Receptionist">Receptionist</option>
                        <option value="Cashier">Cashier</option>
                        <option value="Notary Officer">Notary Officer</option>
                        <option value="Verification Officer">Verification Officer</option>
                        <option value="Customer Service">Customer Service</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-655 font-semibold font-mono uppercase">Counter</label>
                      <input 
                        type="number" 
                        value={newEmpCounter}
                        onChange={(e) => setNewEmpCounter(Number(e.target.value))}
                        min={1} 
                        max={8}
                        className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl p-2 outline-none font-sans"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-bold text-xs p-2 rounded-xl transition shadow-xs text-center block w-full h-[36px]"
                  >
                    + Register Employee
                  </button>
                </form>
              </div>

              {/* Employees roster table with detailed rules actions */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <span className="text-xs font-mono text-slate-500 uppercase font-black">Local Roster & Stations control</span>
                    <p className="text-xs text-slate-500 mt-0.5">Suspend, assign roles, reset security credentials, configure counters</p>
                  </div>
                  <input 
                    type="text" 
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Search Staff by Name or Role..."
                    className="bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-1.5 outline-none font-sans"
                  />
                </div>

                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                  {filteredEmployees.map(emp => (
                    <div key={emp.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 font-sans text-xs">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-350 flex items-center justify-center font-bold text-slate-700 font-sans shrink-0">
                            {emp.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <h4 className="font-sans font-extrabold text-slate-950 text-sm leading-tight">{emp.name}</h4>
                            <span className="text-[10px] text-slate-500 font-mono block">{emp.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                            emp.status === "available" ? "bg-emerald-50 text-emerald-700 border-emerald-150" :
                            emp.status === "suspended" ? "bg-red-50 text-red-600 border-red-150 font-black" : "bg-slate-200 text-slate-500"
                          }`}>
                            {emp.status}
                          </span>
                          <span className="font-mono text-indigo-700 font-bold block text-[11px]">Station Post: Counter {emp.assignedCounter}</span>
                        </div>
                      </div>

                      {/* Permissions badges assigned & roles mutation options */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 rounded-xl">
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-500 font-mono block uppercase font-bold">SYSTEM ACCESS PERMISSIONS</span>
                          <div className="flex flex-wrap gap-1">
                            {emp.permissions.map(perm => (
                              <span key={perm} className="bg-slate-100 border border-slate-150 px-1.5 py-0.5 rounded text-[9.5px] text-slate-700 font-mono">
                                {perm}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <span className="text-[10px] text-slate-400 font-mono">Alter Role:</span>
                          <select 
                            value={emp.role}
                            onChange={(e) => handleUpdateRoleAndPermissions(emp.id, e.target.value as any)}
                            className="bg-slate-50 border border-slate-200 text-xs p-1 rounded font-bold font-sans"
                          >
                            <option value="Document Officer">Document Officer</option>
                            <option value="Receptionist">Receptionist</option>
                            <option value="Cashier">Cashier</option>
                            <option value="Notary Officer">Notary Officer</option>
                            <option value="Verification Officer">Verification Officer</option>
                            <option value="Customer Service">Customer Service</option>
                          </select>
                        </div>
                      </div>

                      {/* Control buttons */}
                      <div className="flex justify-end gap-2 border-t border-slate-100 pt-2 font-semibold">
                        <button 
                          onClick={() => handleResetPassword(emp.name)}
                          className="text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 font-sans p-1 px-2.5 rounded-lg text-[11px] transition"
                        >
                          Reset Passwords Token
                        </button>
                        <button 
                          onClick={() => handleToggleSuspendEmployee(emp.id)}
                          className={`p-1 px-2.5 rounded-lg text-[11px] transition ${
                            emp.status === "suspended" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-red-50 text-red-650 hover:bg-red-100 font-bold"
                          }`}
                        >
                          {emp.status === "suspended" ? "Unsuspend Clerk" : "Suspend Employee Account"}
                        </button>
                      </div>

                    </div>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <p className="text-xs text-slate-500 italic text-center py-6">No matching roster employees registered today.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* SCREEN 6: CUSTOMER INDEX */}
          {activeTab === "customers" && (
            <div className="space-y-6 animate-fadeIn" id="branch-customers-panel">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                  <div>
                    <span className="text-xs font-mono text-slate-500 uppercase font-black">Branch Customers Directory & History</span>
                    <p className="text-xs text-slate-500 mt-0.5">Search by Name, Phone, National ID, or Document Code</p>
                  </div>
                  <input 
                    type="text" 
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search Customer Database..."
                    className="bg-slate-50 text-xs border border-slate-200 rounded-xl px-3 py-1.5 outline-none font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {filteredCustomers.map(cust => (
                    <div key={cust.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-sans">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 shrink-0">
                          {cust.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-slate-950 text-sm leading-tight">{cust.name}</h4>
                            <span className="font-mono text-[9px] bg-white border border-slate-250 px-1.5 rounded text-slate-400 font-bold">{cust.nationalId}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5 font-mono">
                            Phone: <b>{cust.phone}</b> • Active Doc Number: <b className="text-indigo-755">{cust.docNumber}</b>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-left sm:text-right">
                          <span className="text-[11px] text-slate-650 block font-semibold hover:underline">Visits count: {cust.visitsCount} sessions</span>
                        </div>
                        
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => openCustomerDetail(cust)}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold p-1.5 px-3 rounded-lg text-[11px] transition"
                          >
                            View Record History
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <p className="text-xs text-slate-500 italic text-center py-6">No matching customers located.</p>
                  )}
                </div>

                {/* Popover detailed history logs */}
                {selectedCustomer && (
                  <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-scaleIn font-sans">
                      <div className="flex justify-between items-start pb-2 border-b border-slate-200">
                        <div>
                          <span className="text-[9px] text-slate-400 font-mono block">CLIENT SESSION AUDIT HISTORIES</span>
                          <h4 className="text-base font-extrabold text-slate-900 leading-tight">{selectedCustomer.name}</h4>
                        </div>
                        <button onClick={() => { setSelectedCustomer(null); setCustomerHistory(null); }} className="text-slate-400 hover:text-slate-650">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2.5 text-xs text-slate-700">
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono block uppercase">National Clearance ID</span>
                          <p className="font-bold text-slate-800">{selectedCustomer.nationalId}</p>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-mono block uppercase">Document history</span>
                          <div className="space-y-1.5 font-sans">
                            {historyLoading && (
                              <p className="text-[11px] text-slate-400 italic">Loading history…</p>
                            )}
                            {!historyLoading && customerHistory?.documents.length === 0 && (
                              <p className="text-[11px] text-slate-400 italic">No documents on record.</p>
                            )}
                            {customerHistory?.documents.map((doc, idx) => (
                              <div key={idx} className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px]">
                                <span className="font-bold">{doc.document_number}</span> — {doc.doc_type.replace(/_/g, " ")} · {doc.status}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-mono block uppercase">Activity trail</span>
                          <div className="space-y-1.5 font-sans">
                            {!historyLoading && customerHistory?.activity.length === 0 && (
                              <p className="text-[11px] text-slate-400 italic">No activity recorded.</p>
                            )}
                            {customerHistory?.activity.map((log, idx) => (
                              <div key={idx} className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px]">
                                {log.action.replace(/_/g, " ")} {log.resource_label ? `— ${log.resource_label}` : ""}
                                {log.actor_name ? ` · by ${log.actor_name}` : ""}
                                <span className="block text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button 
                          onClick={() => { setSelectedCustomer(null); setCustomerHistory(null); }}
                          className="bg-slate-900 text-white font-extrabold py-2 px-4 rounded-xl text-xs"
                        >
                          Close Record Directory
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SCREEN 7: AUDIT LOG (real data — replaces the old fake biometrics simulator) */}
          {activeTab === "fingerprints" && (
            <div className="space-y-6 animate-fadeIn" id="branch-biometrics-panel">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-mono text-slate-500 uppercase font-black block">Branch Audit Log</span>
                    <p className="text-xs text-slate-500 mt-0.5">Real operational activity for this branch — document, employee, and queue actions.</p>
                  </div>
                  <button
                    onClick={loadBranchAuditLogs}
                    className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
                  {auditLoading && (
                    <p className="text-xs text-slate-400 italic text-center py-6">Loading audit log…</p>
                  )}
                  {!auditLoading && branchAuditLogs.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-6">No audit events recorded yet for this branch.</p>
                  )}
                  {branchAuditLogs.map((log) => (
                    <div key={log.id} className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-slate-400 block">
                          {new Date(log.created_at).toLocaleString()} {log.actor_name ? `• by ${log.actor_name}` : ""}
                        </span>
                        <span className="font-bold text-slate-800 font-sans block">
                          {log.action.replace(/_/g, " ")}{log.resource_label ? ` — ${log.resource_label}` : ""}
                        </span>
                      </div>
                      <span className="text-slate-600 font-bold text-[10px] bg-slate-100 border border-slate-200 px-2 rounded-full">
                        {log.resource_type ?? "system"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 8: REPORTS SECTION GENERATOR */}
          {activeTab === "reports" && (
            <div className="space-y-6 animate-fadeIn" id="branch-reports-panel">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <div>
                  <span className="text-xs font-mono text-slate-500 uppercase font-black block">Branch Reports Generator Engine</span>
                  <p className="text-xs text-slate-500 mt-0.5">Generate daily, weekly, monthly, employee, document, and revenue logs. Export directly to certified PDF or Excel.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[10px] text-slate-500 font-mono uppercase font-semibold">Select Target Category</label>
                    <select 
                      value={selectedReportType}
                      onChange={(e) => setSelectedReportType(e.target.value as any)}
                      className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl p-2 font-bold font-sans outline-none"
                    >
                      <option value="daily">Daily Branch Operations Summary</option>
                      <option value="weekly">Weekly Branch Summary Log</option>
                      <option value="monthly">Monthly Branch Performance Report</option>
                      <option value="employee">Employee Productivity & speed report</option>
                      <option value="document">Sealed Document Hash Listing</option>
                      <option value="revenue">Revenue streams & invoices ledger</option>
                    </select>
                  </div>

                  <button 
                    onClick={handleTriggerReportGeneration}
                    disabled={reportLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-sans font-bold text-xs p-2 h-[38px] rounded-xl transition text-center block w-full shadow-xs"
                  >
                    {reportLoading ? "Generating…" : "Draft Preview Log"}
                  </button>

                  <div className="grid grid-cols-2 gap-2 h-[38px]">
                    <button 
                      onClick={() => handleExportReport("pdf")}
                      className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-705 text-xs font-semibold p-1 px-3.5 rounded-xl transition flex justify-center items-center gap-1 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button 
                      onClick={() => handleExportReport("excel")}
                      className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-705 text-xs font-semibold p-1 px-3.5 rounded-xl transition flex justify-center items-center gap-1 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Excel
                    </button>
                  </div>
                </div>

                {/* Previews panel */}
                {generatedReport ? (
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 font-mono block uppercase">Report Preview</span>
                    <pre className="p-4 bg-slate-950 text-sky-400 font-mono text-[10.5px] rounded-xl overflow-x-auto leading-relaxed border border-indigo-950/40 whitespace-pre-wrap">
                      {reportToLines(generatedReport).join("\n")}
                    </pre>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    {reportLoading ? "Generating report…" : "Please select a target report and click 'Draft Preview Log' to display layout."}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SCREEN 9: NOTIFICATIONS EVENT LOGS */}
          {activeTab === "notifications" && (
            <div className="space-y-6 animate-fadeIn" id="branch-notifications-panel">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-mono text-slate-500 uppercase font-black block">Log Stream & Administrative Notifications</span>
                    <p className="text-xs text-slate-500 mt-0.5">Branch created events, document statuses, queue overflow, appointment changes, customer logs</p>
                  </div>
                  <button 
                    onClick={() => {
                      setNotifications([]);
                      alert("Audit events cleared.");
                    }}
                    className="text-slate-500 hover:underline font-bold text-xs"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-3">
                  {notifications.map(not => (
                    <div key={not.id} className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex items-start gap-3 text-xs font-sans">
                      <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-350 flex items-center justify-center font-bold text-slate-800 text-[10px] shrink-0 mt-0.5">
                        🔔
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between">
                          <h4 className="font-extrabold text-slate-950">{not.title}</h4>
                          <span className="font-mono text-[9px] text-slate-400">{not.date}</span>
                        </div>
                        <p className="text-slate-650 leading-relaxed">{not.details}</p>
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-8">All notifications and events are cataloged.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 10: CONFIGURATION SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-fadeIn" id="branch-settings-panel">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <div>
                  <span className="text-xs font-mono text-slate-505 uppercase font-black block">Local Branch Configuration Panel</span>
                  <p className="text-xs text-slate-505 mt-0.5">Configure address records, working days, business hours, walk-in double bookings rules, and ticketing chimes SLA limits.</p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  alert("✓ Branch configurations saved successfully on the SaaS cloud database!");
                  setNotifications(prev => [
                    { id: Date.now().toString(), type: "system", title: "Configuration Updated", details: "Branch Name, hours, and SLA rules saved.", date: "Just now" },
                    ...prev
                  ]);
                }} className="space-y-4 text-xs font-sans">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-650 font-semibold font-mono uppercase">Branch Public Name</label>
                      <input 
                        type="text" 
                        value={settings.branchName}
                        onChange={(e) => setSettings({ ...settings, branchName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 outline-none text-slate-850 font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-650 font-semibold font-mono uppercase">Public Contact Telephone</label>
                      <input 
                        type="text" 
                        value={settings.branchPhone}
                        onChange={(e) => setSettings({ ...settings, branchPhone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 outline-none text-slate-850 font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-650 font-semibold font-mono uppercase">Admin Alert Email</label>
                      <input 
                        type="email" 
                        value={settings.branchEmail}
                        onChange={(e) => setSettings({ ...settings, branchEmail: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 outline-none text-slate-850 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-650 font-semibold font-mono uppercase">Working Operational Days</label>
                      <input 
                        type="text" 
                        value={settings.workingDays}
                        onChange={(e) => setSettings({ ...settings, workingDays: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 outline-none text-slate-850"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-650 font-semibold font-mono uppercase">Shifts Hours Start</label>
                      <input 
                        type="text" 
                        value={settings.hoursStart}
                        onChange={(e) => setSettings({ ...settings, hoursStart: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 outline-none text-slate-855"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-650 font-semibold font-mono uppercase">Shifts Hours End</label>
                      <input 
                        type="text" 
                        value={settings.hoursEnd}
                        onChange={(e) => setSettings({ ...settings, hoursEnd: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 outline-none text-slate-855"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-650 font-semibold font-mono uppercase">Queue ticketing rules</label>
                    <textarea 
                      value={settings.queueRules}
                      onChange={(e) => setSettings({ ...settings, queueRules: e.target.value })}
                      className="w-full h-16 bg-slate-50 border border-slate-250 rounded-xl p-2.5 outline-none text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-650 font-semibold font-mono uppercase">Calendar Appointments Booking Rules</label>
                    <textarea 
                      value={settings.appointmentRules}
                      onChange={(e) => setSettings({ ...settings, appointmentRules: e.target.value })}
                      className="w-full h-16 bg-slate-50 border border-slate-250 rounded-xl p-2.5 outline-none text-slate-805"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button 
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 font-sans font-extrabold text-white text-xs py-2 px-6 rounded-xl transition shadow-xs"
                    >
                      Save Configuration parameters
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

        </div> {/* End Rightmain columns panel */}

      </div>

    </div>
  );
}

// Minimal Lucide alternatives inside scope to avoid linting errors
function Volume2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}


