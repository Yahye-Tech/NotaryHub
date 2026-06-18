import React, { useState, useRef, useEffect } from "react";
import { 
  Building2, Users, Calendar, Clock, CheckCircle, ShieldAlert, FileText, 
  User, ArrowRight, Zap, Bell, Check, Search, UserPlus, Shield, Sparkles, 
  Lock, Key, Ban, UserCheck, AlertTriangle, Play, HelpCircle, Send, TrendingUp, 
  FileSpreadsheet, ClipboardList, RefreshCw, Star, Coins, Download, Settings, ChevronRight, X, Phone, Mail, Sliders, Menu, Sun, Moon
} from "lucide-react";
import { Branch, Employee, Appointment, QueueTicket, NotaryDocument } from "../types";

interface BranchAdminPortalProps {
  branches: Branch[];
  employees: Employee[];
  appointments: Appointment[];
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

export default function BranchAdminPortal({
  branches,
  employees,
  appointments,
  queue,
  documents = [],
  onLogout
}: BranchAdminPortalProps) {
  
  // Active office target: Bosaso Main Branch is the fixed focus under SaaS structure
  const activeBranch = branches.find(b => b.name.includes("Bosaso Main Branch")) || branches[0] || {
    id: "br-01",
    name: "Bosaso Main Branch",
    address: "Kismayo Street, Central Bosaso",
    phone: "+252 90 779 1234",
    countersCount: 4
  };

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

  // Local state tables to make mutations functional for the Branch Admin (e.g. Crud Employees, manage queues, verify fingerprints)
  const [localEmployees, setLocalEmployees] = useState<ExtendedEmployee[]>([
    { id: "emp-101", name: "Ahmed Farah", email: "ahmed.farah@veritas.so", role: "Notary Officer", status: "available", assignedCounter: 1, permissions: ["Seal Documents", "Approve Drafts"] },
    { id: "emp-102", name: "Elena Rostova", email: "elena.rostova@veritas.so", role: "Verification Officer", status: "busy", assignedCounter: 2, permissions: ["Verify Fingerprints", "Audit Identities"] },
    { id: "emp-103", name: "Warsame Duale", email: "warsame.d@veritas.so", role: "Document Officer", status: "available", assignedCounter: 3, permissions: ["Draft Contracts", "Review Uploads"] },
    { id: "emp-104", name: "Fathia Omar", email: "fathia.omar@veritas.so", role: "Receptionist", status: "available", assignedCounter: 4, permissions: ["Issue Queue Tickets", "Welcome Clients"] },
    { id: "emp-105", name: "Hassan Mire", email: "hassan.m@veritas.so", role: "Cashier", status: "offline", assignedCounter: 5, permissions: ["Process Payments", "Issue Invoices"] }
  ]);

  const [localQueue, setLocalQueue] = useState<QueueTicket[]>([
    { id: "q-01", ticketNumber: "TKT-101", customerName: "Guled Gurey", serviceType: "Power of Attorney", checkInTime: "08:15 AM", status: "calling", calledCounter: 1 },
    { id: "q-02", ticketNumber: "TKT-102", customerName: "Aishe Mohamed", serviceType: "Affidavit", checkInTime: "08:32 AM", status: "waiting" },
    { id: "q-03", ticketNumber: "TKT-103", customerName: "Abdirahman Ali", serviceType: "Contract Review", checkInTime: "08:45 AM", status: "waiting" },
    { id: "q-04", ticketNumber: "TKT-104", customerName: "Hodan Gelle", serviceType: "Identity Audit", checkInTime: "09:02 AM", status: "waiting" },
    { id: "q-05", ticketNumber: "TKT-105", customerName: "Mohamed Warsame", serviceType: "Declaration Seal", checkInTime: "09:12 AM", status: "completed", servedBy: "Elena Rostova" }
  ]);

  const [localDocs, setLocalDocs] = useState<NotaryDocument[]>([
    { id: "DOC-2026-00123", title: "Power of Attorney - Somaliland Transit Authority", status: "completed", parties: ["Ahmed Ali", "Farah Omar"], createdAt: "2026-06-11", watermarkCode: "BOSASO-CONF-882", fingerprintHash: "Verified ✓ sha256_99a8bd2" },
    { id: "DOC-2026-00155", title: "Affidavit of Chicago Dual Residence Clearance", status: "pending-signature", parties: ["Elena Ahmed"], createdAt: "2026-06-12" },
    { id: "DOC-2026-00192", title: "Land Deed Conveyance Covenant Pact", status: "draft", parties: ["Warsame Farah", "Khadar Corp"], createdAt: "2026-06-12" },
    { id: "DOC-2026-00210", title: "Customs Import Clearing Authorization Letter", status: "archived", parties: ["Bosaso Port Terminal", "Somali Shipping Ltd"], createdAt: "2026-06-08" }
  ]);

  const [localApps, setLocalApps] = useState<Appointment[]>([
    { id: "app-301", branchId: "br-01", customerName: "Ubah Hersi", customerEmail: "ubah.h@example.com", serviceType: "Power of Attorney", appointmentTime: "09:30 AM", status: "scheduled" },
    { id: "app-302", branchId: "br-01", customerName: "Khalid Yusuf", customerEmail: "khalid.y@example.com", serviceType: "Affidavit Seal", appointmentTime: "11:00 AM", status: "scheduled" },
    { id: "app-303", branchId: "br-01", customerName: "Zainab Gurey", customerEmail: "zainab@example.com", serviceType: "Declaration Proof", appointmentTime: "02:00 PM", status: "scheduled" },
    { id: "app-304", branchId: "br-01", customerName: "Saeed Hirsi", customerEmail: "saeed@example.com", serviceType: "Property Contract Seal", appointmentTime: "04:30 PM", status: "canceled" }
  ]);

  const [customers, setCustomers] = useState<AdminCustomer[]>([
    { id: "c-01", name: "Ahmed Ali", phone: "+252 61 555-0144", nationalId: "ID-SOM-882291", docNumber: "DOC-2026-00123", status: "active", visitsCount: 5, historyLogs: ["Completed Power of Attorney", "Paid invoice #INV-00015"] },
    { id: "c-02", name: "Warsame Farah", phone: "+252 90 721 9988", nationalId: "ID-SOM-110022", docNumber: "DOC-2026-00192", status: "active", visitsCount: 4, historyLogs: ["Drafted Real Estate Contract", "Fingerprint record validated"] },
    { id: "c-03", name: "Elena Ahmed", phone: "+252 90 612 4040", nationalId: "ID-SOM-921004", docNumber: "DOC-2026-00155", status: "pending-verification", visitsCount: 2, historyLogs: ["Submitted Dual Residency Affidavit"] },
    { id: "c-04", name: "Hassan Gelle", phone: "+252 90 550 1122", nationalId: "ID-SOM-404112", docNumber: "DOC-2026-00210", status: "active", visitsCount: 6, historyLogs: ["Archived Import Clearance letter"] }
  ]);

  const [notifications, setNotifications] = useState([
    { id: "not-1", type: "system", title: "New Employee Created", details: "Warsame Duale was added to Counter 3. System profile generated.", date: "Today, 08:00 AM" },
    { id: "not-2", type: "success", title: "Document Approved", details: "Power of Attorney (DOC-00123) digitally signed and watermarked.", date: "Today, 09:15 AM" },
    { id: "not-3", type: "alert", title: "Queue Overflow Warning", details: "Waiting queue exceeded SLA threshold of 5 clients in Bosaso.", date: "Yesterday, 04:00 PM" },
    { id: "not-4", type: "info", title: "Appointment Calendar Shifted", details: "Ubah Hersi rescheduled power of attorney slot to 09:30 AM.", date: "Yesterday, 02:40 PM" }
  ]);

  // AI assistant states
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiHistory, setAiHistory] = useState<{ sender: "user" | "ai"; msg: string }[]>([
    { sender: "ai", msg: "Greetings, Branch Manager. Ask me anything about Bosaso Main Branch metrics. Examples:\n- *'Which employee processed most documents?'*\n- *'Show pending documents.'*\n- *'Show busiest day this month.'*\n- *'Generate weekly branch report.'*" }
  ]);

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
    branchName: "Bosaso Main Branch",
    branchPhone: "+252 90 779 1234",
    branchEmail: "bosaso.admin@veritas.so",
    hoursStart: "08:00 AM",
    hoursEnd: "05:00 PM",
    workingDays: "Saturday - Thursday",
    queueRules: "SLA wait limit 15 minutes. Call notification sounds enabled.",
    appointmentRules: "Walk-ins permitted only on Wednesdays. Double bookings restricted."
  });

  // Selected entities for focus popovers/modals
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [selectedDocToReview, setSelectedDocToReview] = useState<NotaryDocument | null>(null);
  const [reassignAppTarget, setReassignAppTarget] = useState<Appointment | null>(null);
  const [reassignTargetEmp, setReassignTargetEmp] = useState("");

  // Sound paging simulation announcement message
  const [broadcastingChime, setBroadcastingChime] = useState<string | null>(null);

  // Reports downloader state
  const [selectedReportType, setSelectedReportType] = useState<"daily" | "weekly" | "monthly" | "employee" | "document" | "revenue">("daily");
  const [generatedReportPreview, setGeneratedReportPreview] = useState<string | null>(null);

  // Biometrics audits counters
  const [auditLogs, setAuditLogs] = useState([
    { time: "08:22 AM", action: "Fingerprint Scan", status: "matching_success", entity: "Warsame Farah", operator: "Elena Rostova" },
    { time: "09:01 AM", action: "Digital Signature Lock", status: "matching_success", entity: "Ahmed Ali", operator: "Ahmed Farah" },
    { time: "09:12 AM", action: "National ID OCR Verify", status: "matching_success", entity: "Elena Ahmed", operator: "Elena Rostova" }
  ]);

  // Triggering visual paging toast chime
  const pageChime = (text: string) => {
    setBroadcastingChime(text);
    setTimeout(() => {
      setBroadcastingChime(null);
    }, 4500);
  };

  // Queue core actions
  const handleCallNext = () => {
    const nextWaiting = localQueue.find(q => q.status === "waiting");
    if (!nextWaiting) {
      alert("No pending check-in tickets available in the lobby.");
      return;
    }
    // Call the ticket to first available counter
    const updated = localQueue.map(q => {
      if (q.id === nextWaiting.id) {
        return { ...q, status: "calling" as const, calledCounter: 1 };
      }
      // Toggle previous calling tickets to completed
      if (q.status === "calling") {
        return { ...q, status: "completed" as const, servedBy: "Ahmed Farah" };
      }
      return q;
    });
    setLocalQueue(updated);
    pageChime(`🛎️ Audio Chime: Calling Ticket ${nextWaiting.ticketNumber} (${nextWaiting.customerName}) to Counter 1.`);
    
    setNotifications(prev => [
      { id: Date.now().toString(), type: "info", title: "Ticket Status Shifted", details: `Called ${nextWaiting.customerName} (${nextWaiting.ticketNumber}) to Counter 1.`, date: "Just now" },
      ...prev
    ]);
  };

  const handleSkipTicket = (id: string) => {
    setLocalQueue(prev => prev.map(q => q.id === id ? { ...q, status: "passed" as const } : q));
    alert("Ticket marked as passed/skipped.");
  };

  const handleTransferTicket = (id: string, newCounter: number) => {
    setLocalQueue(prev => prev.map(q => q.id === id ? { ...q, status: "calling" as const, calledCounter: newCounter } : q));
    pageChime(`⚙️ Ticket transferred successfully. Paged to Station Counter ${newCounter}.`);
  };

  const handleReopenTicket = (id: string) => {
    setLocalQueue(prev => prev.map(q => q.id === id ? { ...q, status: "waiting" as const } : q));
    alert("Ticket restored back to waiting list.");
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
  const handleCancelApp = (id: string) => {
    setLocalApps(prev => prev.map(app => app.id === id ? { ...app, status: "canceled" as const } : app));
    setNotifications(prev => [
      { id: Date.now().toString(), type: "alert", title: "Appointment Canceled", details: "Client itinerary item was flagged canceled in Bosaso CRM.", date: "Just now" },
      ...prev
    ]);
  };

  const triggerReassignApp = (target: Appointment) => {
    setReassignAppTarget(target);
    setReassignTargetEmp(localEmployees[0]?.name || "");
  };

  const executeReassignApp = () => {
    if (!reassignAppTarget) return;
    setLocalApps(prev => prev.map(app => app.id === reassignAppTarget.id ? { ...app, appointmentTime: `Rescheduled with ${reassignTargetEmp}` } : app));
    setReassignAppTarget(null);
    alert(`✓ Booking slot reassigned to officer ${reassignTargetEmp}`);
  };

  // Document actions
  const handleUpdateDocStatus = (id: string, status: NotaryDocument["status"]) => {
    setLocalDocs(prev => prev.map(doc => doc.id === id ? { ...doc, status } : doc));
    setNotifications(prev => [
      { id: Date.now().toString(), type: "success", title: "Document Ledger Updated", details: `File ${id} status configured to ${status.toUpperCase()}.`, date: "Just now" },
      ...prev
    ]);
  };

  const executeDocumentApprove = (id: string) => {
    setLocalDocs(prev => prev.map(doc => {
      if (doc.id === id) {
        return { 
          ...doc, 
          status: "completed", 
          watermarkCode: "BOSASO-APPROVED-" + Math.floor(Math.random() * 900 + 100),
          fingerprintHash: "Secured ✓ sha256_e" + Math.floor(Math.random() * 90000)
        };
      }
      return doc;
    }));
    setSelectedDocToReview(null);
    alert("✓ Document sealed, verified with signatures, and marked COMPLETED.");
  };

  const executeDocumentReject = (id: string) => {
    setLocalDocs(prev => prev.map(doc => doc.id === id ? { ...doc, status: "draft" } : doc));
    setSelectedDocToReview(null);
    alert("❌ Draft rejected. Sent back to customer for corrections.");
  };

  // Fingerprint and signature mock triggers
  const executeFingerprintMatchAudit = (customerName: string) => {
    const isMatched = Math.random() > 0.05; // 95% verification success simulation
    if (isMatched) {
      setAuditLogs(prev => [
        { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: "Live Fingerprint Matching", status: "matching_success", entity: customerName, operator: "Elena Rostova" },
        ...prev
      ]);
      alert(`✓ BIOMETRICS REGISTERED: Fingerprint template matches the Somalian Federal Trust identity database for ${customerName}.`);
    } else {
      setAuditLogs(prev => [
        { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: "Live Fingerprint Matching", status: "matching_failure", entity: customerName, operator: "Elena Rostova" },
        ...prev
      ]);
      alert(`⚠️ ERROR: Biometrics validation mismatch. Please clean reader and retry.`);
    }
  };

  // AI assistant simulation with direct answering mechanics matching user demands
  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    const prompt = aiPrompt;
    setAiHistory(prev => [...prev, { sender: "user", msg: prompt }]);
    setAiPrompt("");

    let reply = "I have analyzed the current branch database. If you have any other questions, let me know.";
    const lower = prompt.toLowerCase();
    
    if (lower.includes("employee") && (lower.includes("most") || lower.includes("highest") || lower.includes("processed"))) {
      reply = "📊 **Top Employee Performance Audit**:\nOfficer **Ahmed Farah** has finalized **45 documents** and served **30 customers** this week, maintaining an average processing duration of **12 minutes per file**.";
    } else if (lower.includes("pending") && lower.includes("document")) {
      const pendingCount = localDocs.filter(d => d.status !== "completed").length;
      reply = `📂 **Pending Documents Audit**:\nThere are currently **${pendingCount} pending documents** awaiting notary sealing inside the Bosaso ledger. These include the Dual Residence Affidavit which contains pending digital signatures.`;
    } else if (lower.includes("busiest") || lower.includes("day")) {
      reply = "📅 **Incoming Velocity Analytics**:\nBased on active booking metadata, the busiest day this month was **Wednesday, 2026-06-10** with 34 active check-ins and 18 queued walking clients.";
    } else if (lower.includes("report") || lower.includes("generate")) {
      reply = "📑 **System Report Generated Successfully**:\nI have drafted the Weekly Branch Summary for **Bosaso Main Branch**.\n- Customers Checked In: 184\n- Sealing Success Rate: 98.4%\n- Cumulative Revenue: $4,600\n- Click the 'Reports' sidebar option to export the PDF version!";
    }

    setAiHistory(prev => [...prev, { sender: "ai", msg: reply }]);
  };

  // Reports downloader simulation
  const handleTriggerReportGeneration = () => {
    let reportDesc = "";
    switch (selectedReportType) {
      case "daily":
        reportDesc = `VERITAS REPORT SYSTEM\n====================\nDocument Date: 2026-06-12\nBranch: Bosaso Main Office\n\n- Customers Served: 34\n- Total Sealed Deeds: 22\n- Outstanding Queue Waiting: 7\n- Daily Ledger Capital: $850 usd\n- Clerk Audit SLA: compliant (avg. 6.8min)`;
        break;
      case "weekly":
        reportDesc = `VERITAS REPORT SYSTEM\n====================\nService Cycle: 2026-06-06 to 2026-06-12\nBranch: Bosaso Main Office\n\n- Total Registered Walk-ins: 245\n- Approved Power of Attorney Contracts: 92\n- Draft Documents Flagged: 15\n- Cleared Billings: $2,450 usd\n- Customer Sat Score: 98% (Exceeding Targets)`;
        break;
      case "monthly":
        reportDesc = `VERITAS REPORT SYSTEM\n====================\nTarget Period: June 2026\nBranch: Bosaso Main Office\n\n- Total Client Registry: 982 Users\n- Completed Signature Watermarks: 412\n- Dispatched Escrows: 390\n- Total Revenue Calculated: $10,300 usd\n- System Status: Fully Operational`;
        break;
      case "employee":
        reportDesc = `VERITAS REPORT SYSTEM\n====================\nEmployee Productivity Review\n\n- Ahmed Farah: 45 Processed, 12 min avg speed\n- Elena Rostova: 30 Processed (Audit Intensive), 18 min avg speed\n- Warsame Duale: 28 Processed, 15 min avg speed\n- Fathia Omar: Counter Frontdesk, 110 ticketing slots managed`;
        break;
      case "document":
        reportDesc = `VERITAS REPORT SYSTEM\n====================\nDocument Ledger Audit Logs\n\n- Completed Watermarks: 5\n- Pending Fingerprints: 3\n- Archived Contracts: 2\n- Encrypted IPFS Hashes verified: checked`;
        break;
      case "revenue":
        reportDesc = `VERITAS REPORT SYSTEM\n====================\nRevenue Streams & Cashier Desk logs\n\n- POA Flat checkout ($25): $450\n- Multi-Signature validation: $250\n- Fasttrack Priority fees: $150\n- Cumulative Branch Cash flow today: $850 usd`;
        break;
    }
    setGeneratedReportPreview(reportDesc);
  };

  const executeFakeExport = (format: "pdf" | "excel") => {
    alert(`📥 Exporting Report to ${format === "pdf" ? "PDF format Document" : "Excel Sheet Spreadsheet"}...\nYour browser file download was initialized successfully. (${selectedReportType}_report_${Date.now()}.${format === "pdf" ? "pdf" : "xlsx"})`);
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
                {localDocs.filter(d => d.status !== "completed").length}
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
              <Shield className="w-3.5 h-3.5" /> Biometrics Hub
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
                  <span className="block text-2xl font-extrabold text-slate-900 mt-2">{appointments.length > 0 ? 18 : 0}</span>
                  <span className="text-[9.5px] font-mono text-slate-500 block mt-1">{appointments.length > 0 ? "4 pending fasttrack" : "0 fasttrack pending"}</span>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">Queue Waiting</span>
                    <Clock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="block text-2xl font-extrabold text-slate-900 mt-2">{queue.length > 0 ? 7 : 0}</span>
                  <span className="text-[9.5px] font-mono text-yellow-600 block mt-1">{queue.length > 0 ? "Average wait: 6.8 min" : "Queue empty"}</span>
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
                      onClick={() => {
                        const guest = prompt("Enter customer name for manual walk-in queue check-in:");
                        if (guest) {
                          const svc = prompt("Enter service (Power of Attorney, Affidavit, Contract):") || "General Notary";
                          const newTicket: QueueTicket = {
                            id: Date.now().toString(),
                            ticketNumber: "WALK-" + (localQueue.length + 101),
                            customerName: guest,
                            serviceType: svc,
                            checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            status: "waiting"
                          };
                          setLocalQueue(prev => [...prev, newTicket]);
                          alert(`✓ Walk-in Ticket ${newTicket.ticketNumber} registered.`);
                        }
                      }}
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
                          <span className="bg-white border border-slate-300 font-mono font-bold text-slate-800 text-[10px] px-2 py-0.5 rounded-md shadow-xs">{tkt.ticketNumber}</span>
                          <h4 className="font-bold text-slate-900 text-sm">{tkt.customerName}</h4>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono">
                          Checked-in: <b>{tkt.checkInTime}</b> • Requested: <b className="text-slate-700">{tkt.serviceType}</b>
                          {tkt.calledCounter && ` • Assigned Station: Counter ${tkt.calledCounter}`}
                          {tkt.servedBy && ` • Handled Code: ${tkt.servedBy}`}
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
                            onClick={() => {
                              setLocalQueue(prev => prev.map(q => q.id === tkt.id ? { ...q, status: "completed" as const, servedBy: "Elena Rostova" } : q));
                              alert("Ticket updated to completed.");
                            }}
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
                            <h4 className="font-bold text-slate-950 text-sm leading-tight">{app.customerName}</h4>
                            <span className="text-[10px] text-slate-500 font-mono">{app.customerEmail}</span>
                          </div>
                        </div>

                        <div className="text-left sm:text-right font-mono">
                          <span className="text-indigo-700 block font-bold">{app.appointmentTime}</span>
                          <span className="text-slate-650 block text-[11px] font-sans">Deed requested: <b>{app.serviceType}</b></span>
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

                {/* Calendar reassign popover simulated */}
                {reassignAppTarget && (
                  <div className="p-4 bg-slate-100 border border-slate-350 rounded-xl space-y-3 font-sans text-xs">
                    <p className="font-bold text-slate-800">Reassign {reassignAppTarget.customerName}'s schedule desk:</p>
                    <div className="flex gap-2">
                      <select 
                        value={reassignTargetEmp}
                        onChange={(e) => setReassignTargetEmp(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs"
                      >
                        {localEmployees.map(e => (
                          <option key={e.id} value={e.name}>{e.name} ({e.role})</option>
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
                                onClick={() => handleUpdateDocStatus(doc.id, "archived")}
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

                {/* Review document popover simulated */}
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

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 max-h-[160px] overflow-y-auto font-mono text-[10.5px] leading-relaxed text-slate-700">
                        <b>DEED CERTIFICATION TEXT BLOCK:</b><br />
                        I, Warsame Farah, constitute representative courier pickup authorization within Bosaso Port Terminal boundaries. Verified using dual signature overlays.
                      </div>

                      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs space-y-2">
                        <span className="font-extrabold text-indigo-950 block">Administrative Audits checks:</span>
                        <div className="space-y-1.5 font-sans">
                          <div className="flex justify-between text-[11px]">
                            <span>Identity Document matched:</span> <span className="text-emerald-700 font-bold">Verified ✓</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>Biometrics Match rate:</span> <span className="text-emerald-700 font-bold">99.4% Match ✓</span>
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
                            onClick={() => setSelectedCustomer(cust)}
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
                        <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-slate-650">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2.5 text-xs text-slate-700">
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono block">REGISTERED BIOMETRICS KEY</span>
                          <p className="font-bold text-emerald-700 mt-0.5">Dual Hand Fingerprint Verified ✓</p>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-mono block uppercase">National Clearance ID</span>
                          <p className="font-bold text-slate-800">{selectedCustomer.nationalId}</p>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-mono block uppercase">Transaction log records</span>
                          <div className="space-y-1.5 font-sans">
                            {selectedCustomer.historyLogs.map((log, idx) => (
                              <div key={idx} className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px]">
                                {log}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button 
                          onClick={() => setSelectedCustomer(null)}
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

          {/* SCREEN 7: BIOMETRICS HUB */}
          {activeTab === "fingerprints" && (
            <div className="space-y-6 animate-fadeIn" id="branch-biometrics-panel">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <div>
                  <span className="text-xs font-mono text-slate-500 uppercase font-black block">Fingerprint & Signature Verification Center</span>
                  <p className="text-xs text-slate-500 mt-0.5">E-Verify with digital handwriting matching, dual fingerprints matching, and security audit logs.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Fingerprint capture match tester */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4 text-xs font-sans">
                    <span className="font-bold text-slate-900 block">Deploy Fingerprint Validator Matcher</span>
                    
                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3.5 text-center">
                      <FingerprintIcon className="w-12 h-12 text-indigo-700 mx-auto animate-pulse" />
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block uppercase">Biometric matched scan status</span>
                        <p className="text-[11px] text-slate-650 leading-relaxed max-w-xs mx-auto">Please select a registered active guest to scan fingerprint matching records against federal escrows.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] text-slate-500 font-mono uppercase text-left">Select active target</label>
                        <div className="flex gap-2">
                          <select id="fingerprint-scan-select" className="bg-slate-50 text-xs border border-slate-250 p-2 rounded-lg flex-1 font-semibold">
                            {customers.map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                          <button 
                            onClick={() => {
                              const el = document.getElementById("fingerprint-scan-select") as HTMLSelectElement;
                              if (el) executeFingerprintMatchAudit(el.value);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-bold px-3 py-2 rounded-lg text-xs"
                          >
                            Verify Fingerprint
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Handwriting signature validation matcher */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4 text-xs font-sans">
                    <span className="font-bold text-slate-900 block">Deploy digital signature auditor</span>
                    
                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3.5 text-center">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-700 text-xl mx-auto">✍️</div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block uppercase">Digital signature overlays validation</span>
                        <p className="text-[11px] text-slate-650 leading-relaxed max-w-xs mx-auto">Analyze client digital stroke structures using multi-axis vector models.</p>
                      </div>

                      <button 
                        onClick={() => {
                          alert("✓ DIGITAL SIGNATURE VERIFIED: Vector analysis shows 98.7% similarity. Identity matching certificates issued.");
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-sans font-bold py-2 px-4 rounded-xl text-xs w-full block transition"
                      >
                        Verify Signatures Strokes Matching
                      </button>
                    </div>
                  </div>

                </div>

                {/* Audit trail list logs */}
                <div className="space-y-3">
                  <span className="font-bold text-slate-800 block text-xs uppercase font-mono">Fingerprints & Hand Signature Audit Logs Logs</span>
                  
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                    {auditLogs.map((log, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg flex items-center justify-between text-xs font-mono">
                        <div>
                          <span className="text-[9px] text-slate-400 block">{log.time} • Operator Index: Clerk Elena</span>
                          <span className="font-bold text-slate-800 font-sans block">{log.entity} • Matching type: {log.action}</span>
                        </div>
                        <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 border border-emerald-200 px-2 rounded-full">
                          MATCHING COMPLIANT ✓
                        </span>
                      </div>
                    ))}
                  </div>
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
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-bold text-xs p-2 h-[38px] rounded-xl transition text-center block w-full shadow-xs"
                  >
                    Draft Preview Log
                  </button>

                  <div className="grid grid-cols-2 gap-2 h-[38px]">
                    <button 
                      onClick={() => executeFakeExport("pdf")}
                      className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-705 text-xs font-semibold p-1 px-3.5 rounded-xl transition flex justify-center items-center gap-1 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button 
                      onClick={() => executeFakeExport("excel")}
                      className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-705 text-xs font-semibold p-1 px-3.5 rounded-xl transition flex justify-center items-center gap-1 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Excel
                    </button>
                  </div>
                </div>

                {/* Previews panel */}
                {generatedReportPreview ? (
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 font-mono block uppercase">Secure Report Layout Draft Preview</span>
                    <pre className="p-4 bg-slate-950 text-sky-400 font-mono text-[10.5px] rounded-xl overflow-x-auto leading-relaxed border border-indigo-950/40">
                      {generatedReportPreview}
                    </pre>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Please select a target report and click 'Draft Preview Log' to display layout.
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

function FingerprintIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M12 22v-3" />
      <path d="M12 14v4" />
      <path d="M14 18v1" />
      <path d="M14 11v1" />
      <path d="M10 18v2" />
      <path d="M10 10v1" />
      <path d="M8 14v4" />
      <path d="M8 9a4 4 0 0 1 8 0v3" />
      <path d="M16 14v2" />
      <path d="M6 14v2a6 6 0 0 1 12 0v-4h1" />
      <path d="M4 14a8 8 0 0 1 15-3" />
    </svg>
  );
}
