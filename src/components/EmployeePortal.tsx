import React, { useState, useRef, useEffect } from "react";
import { 
  Users, UserPlus, Volume2, CheckCircle, Scan, UserCheck, Search, Plus, Calendar, Clock,
  Fingerprint, Sparkles, FileText, Check, Copy, Sliders, AlertTriangle, RefreshCw, Trash,
  Printer, Upload, CreditCard, Send, Lock, Eye, CheckSquare, XCircle, Bell, ArrowRight, Menu, X, Sun, Moon
} from "lucide-react";
import { QueueTicket, NotaryDocument } from "../types";

interface EmployeePortalProps {
  queue: QueueTicket[];
  onAnnounceTicket: (ticket: QueueTicket, counter: number) => void;
  onAdvanceTicketStatus: (id: string, status: QueueTicket["status"]) => void;
  ocrLoading: boolean;
  ocrData: any;
  onIdentityOcrScan: (sampleIndex: number) => void;
  docTemplate: string;
  setDocTemplate: (v: string) => void;
  docPrincipal: string;
  setDocPrincipal: (v: string) => void;
  docAgent: string;
  setDocAgent: (v: string) => void;
  docJurisdiction: string;
  setDocJurisdiction: (v: string) => void;
  docClauses: string;
  setDocClauses: (v: string) => void;
  docGenerating: boolean;
  draftedDocContent: string;
  onTriggerDocumentDraft: () => void;
  activeCreatedDoc: NotaryDocument | null;
  onCommitSignaturesAndNotarize: () => void;
  fingerprintReady: boolean;
  capturedFingerHash: string;
  biometricScanRunning: boolean;
  biometricProgress: number;
  onTriggerFingerprintScan: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onStartDrawing: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onDraw: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onStopDrawing: () => void;
  onClearSignature: () => void;
  hasSignature: boolean;
  isAllowedCreateDoc: boolean;
  isAllowedBypassBio: boolean;
  onLogout: () => void;
}

export default function EmployeePortal({
  queue: propQueue,
  onAnnounceTicket,
  onAdvanceTicketStatus,
  ocrLoading,
  ocrData,
  onIdentityOcrScan,
  docTemplate,
  setDocTemplate,
  docPrincipal,
  setDocPrincipal,
  docAgent,
  setDocAgent,
  docJurisdiction,
  setDocJurisdiction,
  docClauses,
  setDocClauses,
  docGenerating,
  draftedDocContent: propDraftedDoc,
  onTriggerDocumentDraft,
  activeCreatedDoc,
  onCommitSignaturesAndNotarize,
  fingerprintReady: propFingerprintReady,
  capturedFingerHash: propFingerHash,
  biometricScanRunning: propBioScanning,
  biometricProgress: propBioProgress,
  onTriggerFingerprintScan,
  canvasRef,
  onStartDrawing,
  onDraw,
  onStopDrawing,
  onClearSignature,
  hasSignature,
  isAllowedCreateDoc,
  isAllowedBypassBio,
  onLogout
}: EmployeePortalProps) {
  // Main Tab/Module selection
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "queue" | "appointments" | "customers" | "documents" | "ai-builder" | "biometrics" | "payments" | "ai-assistant" | "settings"
  >("dashboard");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("portal-theme-employee-portal") === "dark";
  });

  useEffect(() => {
    localStorage.setItem("portal-theme-employee-portal", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Local state arrays for CRUD & interaction
  const [customers, setCustomers] = useState([
    { id: "cust-01", name: "Ahmed Ali", phone: "(312) 555-0144", nationalId: "US-NID-98432101", fingerprintCaptured: true, fingerprintVerified: true, signatureCaptured: true, email: "ahmed.ali@example.com", dob: "1988-04-12", address: "452 Oak Avenue, Chicago IL", visits: 5 },
    { id: "cust-02", name: "Arthur Pendelton", phone: "(312) 555-0192", nationalId: "US-NID-38290111", fingerprintCaptured: false, fingerprintVerified: false, signatureCaptured: false, email: "arthur@pendelton-legal.org", dob: "1965-11-22", address: "12 Main St, Boston MA", visits: 3 },
    { id: "cust-03", name: "Alexander Westmoreland", phone: "(617) 555-0192", nationalId: "US-ID-9843102", fingerprintCaptured: true, fingerprintVerified: true, signatureCaptured: true, email: "alex@westmoreland-holdings.co", dob: "1980-01-15", address: "888 Capital Blvd, Capital City", visits: 1 },
    { id: "cust-04", name: "Alice Cooper", phone: "(312) 555-0811", nationalId: "US-ID-11002233", fingerprintCaptured: false, fingerprintVerified: false, signatureCaptured: true, email: "alice@cooper-corp.com", dob: "1972-02-04", address: "77 Rockstar Rd, Detroit MI", visits: 2 }
  ]);

  const [localDocs, setLocalDocs] = useState<NotaryDocument[]>([
    { id: "doc-01", title: "General Power of Attorney - Ahmed Ali", status: "completed", parties: ["Ahmed Ali", "Michael Vance"], content: "GENERAL POWER OF ATTORNEY\n\nKNOW ALL MEN BY THESE PRESENTS, that I, Ahmed Ali, do hereby appoint Michael Vance as my true and lawful attorney-in-fact to act in my name, place, and stead in all legal capacities...", createdAt: "2026-06-12", watermarkCode: "VERITAS-SECURE-994112", hash: "8fae639de1044ba902888258e74719ef10c1f202b20468ea9f1311b988f01bde" },
    { id: "doc-02", title: "Affidavit of Residency - Arthur Pendelton", status: "draft", parties: ["Arthur Pendelton"], content: "AFFIDAVIT OF RESIDENCY\n\nI, Arthur Pendelton, of sound mind, do hereby declare on physical oath that I reside at 12 Main St, Boston MA...", createdAt: "2026-06-12" },
    { id: "doc-03", title: "Custom Lease Agreement - Alice Cooper", status: "pending-signature", parties: ["Alice Cooper"], content: "LEASE AGREEMENT COVENANT\n\nThis agreement outlines the lease terms of studio spaces under state regulatory guidelines...", createdAt: "2026-06-11" }
  ]);

  const [localAppointments, setLocalAppointments] = useState([
    { id: "ap-01", customerName: "Ahmed Ali", serviceType: "General Power of Attorney", appointmentTime: "2026-06-12 @ 10:15 AM", status: "completed" },
    { id: "ap-02", customerName: "Arthur Pendelton", serviceType: "Deed Certification", appointmentTime: "2026-06-12 @ 11:30 AM", status: "scheduled" },
    { id: "ap-03", customerName: "Alice Cooper", serviceType: "Escrow Signing", appointmentTime: "2026-06-12 @ 02:00 PM", status: "scheduled" }
  ]);

  const [localQueue, setLocalQueue] = useState<QueueTicket[]>(() => {
    const defaults: QueueTicket[] = [
      { id: "q-12", ticketNumber: "A-12", customerName: "Ahmed Ali", serviceType: "Power of Attorney", checkInTime: "10:00 AM", status: "serving", calledCounter: 2 },
      { id: "q-13", ticketNumber: "A-13", customerName: "Arthur Pendelton", serviceType: "Deed Certification", checkInTime: "10:15 AM", status: "waiting" },
      { id: "q-14", ticketNumber: "A-14", customerName: "Alice Cooper", serviceType: "Escrow Signing", checkInTime: "10:20 AM", status: "waiting" },
      { id: "q-15", ticketNumber: "A-15", customerName: "Klaus Schmidt", serviceType: "Affidavit", checkInTime: "10:30 AM", status: "waiting" }
    ];
    return defaults;
  });

  const [localInvoices, setLocalInvoices] = useState([
    { id: "inv-01", invoiceNumber: "INV-2026-001", customerName: "Ahmed Ali", amount: 120.00, dueDate: "2026-06-12", status: "paid", items: [{ description: "Power of Attorney drafting", price: 100 }, { description: "Biometric analysis fee", price: 20 }] },
    { id: "inv-02", invoiceNumber: "INV-2026-002", customerName: "Arthur Pendelton", amount: 150.00, dueDate: "2026-06-25", status: "unpaid", items: [{ description: "Deed Certification Fee", price: 150 }] }
  ]);

  const [notifications, setNotifications] = useState([
    { id: "notif-01", title: "New Appointment", text: "Arthur Pendelton scheduled Deed Certification", time: "10m ago", type: "info" },
    { id: "notif-02", title: "Queue Alert", text: "Ticket A-13 waiting over 15 minutes", time: "5m ago", type: "warn" },
    { id: "notif-03", title: "Document Approved", text: "Power of Attorney for Ahmed Ali notarized successfully", time: "2m ago", type: "success" }
  ]);

  // Form states
  const [selectedCustId, setSelectedCustId] = useState<string | null>("cust-01");
  const [searchQuery, setSearchQuery] = useState("");
  const [newCust, setNewCust] = useState({ name: "", email: "", phone: "", nationalId: "", address: "", dob: "" });
  const [editCustMode, setEditCustMode] = useState<string | null>(null);

  // Document creations states
  const [newDoc, setNewDoc] = useState({ title: "Custom Document Declaration", type: "Power of Attorney", parties: "", content: "I, [Insert Party Name], hereby solemnly swear..." });
  const [editDocId, setEditDocId] = useState<string | null>(null);
  const [editDocContent, setEditDocContent] = useState("");
  const [docSearchQuery, setDocSearchQuery] = useState("");

  // AI Questionnaire
  const [aiDocType, setAiDocType] = useState("Power of Attorney");
  const [qaParams, setQaParams] = useState({ grantor: "", receiver: "", purpose: "", duration: "" });
  const [aiDraftResults, setAiDraftResults] = useState("");
  const [aiDraftLoading, setAiDraftLoading] = useState(false);

  // Interactive AI Terminal
  const [aiTerminalPrompt, setAiTerminalPrompt] = useState("");
  const [aiTerminalLog, setAiTerminalLog] = useState<{ sender: "user" | "ai", msg: string }[]>([
    { sender: "ai", msg: "Veritas Desk AI Assistant online. Ask me to generate templates, scan customers, summary agreements, or evaluate compliance." }
  ]);
  const [aiTerminalLoading, setAiTerminalLoading] = useState(false);

  // General state variables
  const [appForm, setAppForm] = useState({ customerName: "", serviceType: "Power of Attorney", date: "", time: "" });
  const [invoiceForm, setInvoiceForm] = useState({ customerName: "", amount: "", description: "" });
  const [clerkProfile, setClerkProfile] = useState({ name: "Elena Rostova", role: "Clerk Practitioner", email: "e.rostova@veritas.com", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120" });
  const [clerkLanguage, setClerkLanguage] = useState("English (US)");

  // Syncing with OCR
  useEffect(() => {
    if (ocrData) {
      setNewCust({
        name: ocrData.fullName || "",
        email: ocrData.email || `${(ocrData.fullName || "user").toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
        phone: "(312) 555-4422",
        nationalId: ocrData.documentNumber || "",
        address: ocrData.address || "100 Transit Way, Boston MA",
        dob: ocrData.dob || "1990-01-01"
      });
      // Fire notification
      addNotification("OCR Scan Completed", `Parsed details for ${ocrData.fullName} extracted successfully.`, "success");
    }
  }, [ocrData]);

  const addNotification = (title: string, text: string, type: "info" | "warn" | "success") => {
    setNotifications(prev => [{ id: "n-" + Date.now(), title, text, time: "Just now", type }, ...prev]);
  };

  // Quick Action triggers
  const handleQuickAction = (action: string) => {
    if (action === "new-customer") {
      setActiveTab("customers");
      setSelectedCustId(null);
      setEditCustMode("new");
    } else if (action === "new-doc") {
      setActiveTab("documents");
      setEditDocId(null);
    } else if (action === "new-app") {
      setActiveTab("appointments");
    } else if (action === "scan-id") {
      setActiveTab("biometrics");
    } else if (action === "cap-finger") {
      setActiveTab("biometrics");
    } else if (action === "cap-sig") {
      setActiveTab("biometrics");
    } else if (action === "gen-ai") {
      setActiveTab("ai-builder");
    }
  };

  // Customers logic
  const handleRegisterCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.name.trim()) {
      alert("Validation Failed: Customer Name is required.");
      return;
    }
    if (!newCust.nationalId.trim()) {
      alert("Validation Failed: National ID/Passport Number is required.");
      return;
    }
    if (!newCust.phone.trim()) {
      alert("Validation Failed: Phone Number is required.");
      return;
    }

    // Validate email format if provided
    if (newCust.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCust.email)) {
      alert("Validation Failed: Invalid Email Format.");
      return;
    }

    // Duplicate Check
    const exists = customers.find(c => 
      c.nationalId.trim().toLowerCase() === newCust.nationalId.trim().toLowerCase() ||
      c.phone.replace(/[\s()+-]/g, "") === newCust.phone.replace(/[\s()+-]/g, "") ||
      (newCust.email && c.email.trim().toLowerCase() === newCust.email.trim().toLowerCase())
    );

    if (exists) {
      alert(`⚠️ DUPLICATE DETECTED\n\nA customer record matching this National ID, Phone, or Email already exists under the name of "${exists.name}". Custom rules prevent duplicate creation.`);
      return;
    }

    const added = {
      id: "cust-" + Date.now(),
      ...newCust,
      fingerprintCaptured: false,
      fingerprintVerified: false,
      signatureCaptured: false,
      visits: 1
    };
    setCustomers(prev => [added, ...prev]);
    setSelectedCustId(added.id);
    setEditCustMode(null);
    addNotification("New Customer Registered", `${added.name} successfully inserted into local schema registry.`, "success");
    setNewCust({ name: "", email: "", phone: "", nationalId: "", address: "", dob: "" });
  };

  const handleUpdateCustomer = (id: string) => {
    if (!newCust.name.trim()) {
      alert("Validation Failed: Name is required.");
      return;
    }
    // Duplicate check on update (exclude current item)
    const exists = customers.find(c => 
      c.id !== id && (
        c.nationalId.trim().toLowerCase() === newCust.nationalId.trim().toLowerCase() ||
        c.phone.replace(/[\s()+-]/g, "") === newCust.phone.replace(/[\s()+-]/g, "")
      )
    );
    if (exists) {
      alert(`⚠️ DUPLICATE DETECTED\n\nAnother customer record matching this National ID or Phone already exists under the name of "${exists.name}".`);
      return;
    }

    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...newCust } : c));
    setEditCustMode(null);
    addNotification("Customer Profile Updated", "Primary registry index modified safely.", "info");
  };

  // Documents Logic
  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    const created: NotaryDocument = {
      id: "doc-" + Date.now(),
      title: `${newDoc.type} - ${newDoc.parties || "Unnamed Party"}`,
      status: "draft",
      parties: newDoc.parties.split(",").map(p => p.trim()),
      content: newDoc.content,
      createdAt: new Date().toISOString().substring(0, 10)
    };
    setLocalDocs(prev => [created, ...prev]);
    addNotification("Document Draft Created", `Draft format saved: "${created.title}".`, "info");
    setNewDoc({ title: "", type: "Power of Attorney", parties: "", content: "I solemnly declare..." });
  };

  const handleEditDocumentSave = () => {
    if (!editDocId) return;
    setLocalDocs(prev => prev.map(d => d.id === editDocId ? { ...d, content: editDocContent } : d));
    setEditDocId(null);
    addNotification("Draft Saved", "Prose body updated on internal schema buffers.", "info");
  };

  const handleDeleteDocument = (id: string) => {
    const doc = localDocs.find(d => d.id === id);
    if (doc?.status === "completed" || doc?.status === "archived") {
      alert("❌ Regulatory Block: Certified/Notarized legal documents cannot be permanently deleted from the Veritas ledger under Compliance Code 44-B.");
      return;
    }
    setLocalDocs(prev => prev.map(d => d.id === id ? { ...d, is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: "EMPLOYEE" } : d));
    addNotification("Document Draft Archived", "Temporary local buffer labeled as soft-deleted.", "warn");
  };

  const handlePrintDocument = (docTitle: string) => {
    alert(`🖨️ Printing System Call:\nQueued "${docTitle}" for physical local printer routing on Desk Terminal #12.`);
    addNotification("Document Queued for Print", `Spooler dispatched: ${docTitle}`, "info");
  };

  // Appointments Logic
  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const added = {
      id: "ap-" + Date.now(),
      customerName: appForm.customerName || "Anonymous Customer",
      serviceType: appForm.serviceType,
      appointmentTime: `${appForm.date} @ ${appForm.time}`,
      status: "scheduled" as const
    };
    setLocalAppointments(prev => [added, ...prev]);
    addNotification("Appointment Scheduled", `${added.customerName} set for ${added.appointmentTime}`, "info");
    setAppForm({ customerName: "", serviceType: "Power of Attorney", date: "", time: "" });
  };

  const handleReschedule = (id: string) => {
    const promptTime = prompt("Enter new schedule text (e.g. 2026-06-15 @ 04:30 PM):");
    if (promptTime) {
      setLocalAppointments(prev => prev.map(ap => ap.id === id ? { ...ap, appointmentTime: promptTime } : ap));
      addNotification("Appointment Rescheduled", "Calendar schedules synchronized.", "info");
    }
  };

  const handleCheckInCustomer = (customerName: string, serviceType: string) => {
    const queueNo = `A-${Math.floor(16 + Math.random() * 50)}`;
    const newTicket: QueueTicket = {
      id: "q-" + Date.now(),
      ticketNumber: queueNo,
      customerName,
      serviceType,
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "waiting"
    };
    setLocalQueue(prev => [...prev, newTicket]);
    addNotification("Customer Checked In", `Assigned slot ${queueNo} for ${customerName} on queue monitor.`, "success");
    setActiveTab("queue");
  };

  // Queue paging management
  const handleIssueManualTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const prefix = ["A", "B", "C"][Math.floor(Math.random() * 3)];
    const num = Math.floor(16 + Math.random() * 50);
    const newTicket: QueueTicket = {
      id: "q-" + Date.now(),
      ticketNumber: `${prefix}-${num}`,
      customerName: appForm.customerName || "Walk-in Guest",
      serviceType: appForm.serviceType,
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "waiting"
    };
    setLocalQueue(prev => [...prev, newTicket]);
    addNotification("Ticket Issued", `${newTicket.ticketNumber} generated`, "success");
    setAppForm({ customerName: "", serviceType: "Power of Attorney", date: "", time: "" });
  };

  const handleCallNextTicket = () => {
    const waiting = localQueue.find(q => q.status === "waiting");
    if (!waiting) {
      alert("No waiting customers in the Lobby Queue!");
      return;
    }
    // Set active ticket to calling
    setLocalQueue(prev => prev.map(q => {
      if (q.id === waiting.id) {
        return { ...q, status: "calling" as const, calledCounter: 2 };
      }
      if (q.status === "calling" || q.status === "serving") {
        return { ...q, status: "completed" as const };
      }
      return q;
    }));
    onAnnounceTicket(waiting, 2);
    addNotification("Paging Customer", `Calling ${waiting.ticketNumber} to clerk workstation 2.`, "info");
  };

  const handleSkipTicket = (id: string) => {
    setLocalQueue(prev => prev.map(q => q.id === id ? { ...q, status: "passed" as const } : q));
    addNotification("Ticket Skipped", "Paging queue iterated.", "warn");
  };

  const handleCompleteTicket = (id: string) => {
    setLocalQueue(prev => prev.map(q => q.id === id ? { ...q, status: "completed" as const } : q));
    addNotification("Ticket Completed", "Lobby customer service finished.", "success");
  };

  // AI Questionnaire Builder logic
  const handleTriggerAIPowerBuilder = () => {
    if (!qaParams.grantor || !qaParams.receiver) {
      alert("AI Drafter requires Grantor and Receiver names specified.");
      return;
    }
    setAiDraftLoading(true);
    setTimeout(() => {
      const result = `POWER OF ATTORNEY\nJURISDICTION: ${docJurisdiction || "Illinois (Cook County)"}\n\nKNOW ALL MEN BY THESE PRESENTS, that I, ${qaParams.grantor}, residing as the Legal Principal, hereby grant absolute Power of Attorney powers to ${qaParams.receiver} to administer ${qaParams.purpose || "general bank transactions and estate properties"} on my behalf.\n\nThis authority shall extend for a duration of ${qaParams.duration || "One (1) Calendar year"} and shall remain durable notwithstanding subsequent legal incapacitation.\n\nSEALED & WITNESSED: ____________________`;
      setAiDraftResults(result);
      setAiDraftLoading(false);
      // Auto populate into primary document creation body
      setNewDoc({
        title: `AI Generated Power of Attorney - ${qaParams.grantor}`,
        type: "Power of Attorney",
        parties: `${qaParams.grantor}, ${qaParams.receiver}`,
        content: result
      });
      addNotification("AI Power of Attorney Compiled", "Document template loaded.", "success");
    }, 1500);
  };

  // Interactive AI Desk bot logic
  const handleSendAITerminalMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTerminalPrompt.trim()) return;
    const userMsg = aiTerminalPrompt;
    setAiTerminalLog(prev => [...prev, { sender: "user", msg: userMsg }]);
    setAiTerminalPrompt("");
    setAiTerminalLoading(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: userMsg }]
        })
      });
      const data = await response.json();
      if (data.success && data.reply) {
        setAiTerminalLog(prev => [...prev, { sender: "ai", msg: data.reply }]);
      } else {
        // Fallback checks
        let fallbackReply = "Understood. The sandbox has updated.";
        if (userMsg.toLowerCase().includes("affidavit")) {
          fallbackReply = "AFFIDAVIT TEMPLATE GENERATED:\n\nSTATE OF ILLINOIS\nCOUNTY OF COOK\n\nI, [Affiant Full Name], being first duly sworn, state:\n1. That I reside at the Address noted under identification records.\n2. [Insert Statement of Fact].\n\nSubscribed and sworn before me this 12th day of June, 2026.";
        } else if (userMsg.toLowerCase().includes("find")) {
          const namePart = userMsg.replace(/find\s+(customer\s+)?/i, "").trim();
          const found = customers.find(c => c.name.toLowerCase().includes(namePart.toLowerCase()));
          fallbackReply = found 
            ? `CUSTOMER FOUND: ${found.name}\nPhone: ${found.phone}\nID Number: ${found.nationalId}\nFingerprint: ${found.fingerprintCaptured ? "Captured" : "Missing"}\nVisits: ${found.visits} total records.` 
            : `Customer search for "${namePart}" yielded 0 items. Ensure spelling is precise.`;
        } else if (userMsg.toLowerCase().includes("pending")) {
          fallbackReply = `PENDING SYSTEM INVOICES:\n` + localInvoices.filter(i => i.status === "unpaid").map(i => `- ${i.customerName} (${i.invoiceNumber}): $${i.amount}`).join("\n");
        } else if (userMsg.toLowerCase().includes("summarize")) {
          fallbackReply = "CONTRACT SUMMARY:\n- Document Class: Non-Disclosure & Escrow\n- Parties: Principal Depositors\n- Key Condition: Escrow seals vest fully upon dual-biometric sign-off.\n- Escrow agent holds compliance authority.";
        }
        setAiTerminalLog(prev => [...prev, { sender: "ai", msg: fallbackReply }]);
      }
    } catch {
      setAiTerminalLog(prev => [...prev, { sender: "ai", msg: "Connection timed out. Retained active local desk assistant sandbox helper." }]);
    } finally {
      setAiTerminalLoading(false);
    }
  };

  // Payments logic
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.customerName.trim() || !invoiceForm.amount) return;
    const added = {
      id: "inv-" + Date.now(),
      invoiceNumber: `INV-2026-0${localInvoices.length + 1}`,
      customerName: invoiceForm.customerName,
      amount: parseFloat(invoiceForm.amount),
      dueDate: new Date(Date.now() + 10 * 86400000).toISOString().substring(0, 10),
      status: "unpaid" as const,
      items: [{ description: invoiceForm.description || "General Notary Service", price: parseFloat(invoiceForm.amount) }]
    };
    setLocalInvoices(prev => [added, ...prev]);
    addNotification("Invoice Generated", `Billed ${added.customerName} $${added.amount}`, "success");
    setInvoiceForm({ customerName: "", amount: "", description: "" });
  };

  const handlePayInvoice = (id: string) => {
    setLocalInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: "paid" as const } : inv));
    addNotification("Payment Settled", "Receipt issued.", "success");
    alert("💸 Cash drawer triggered. Receipt queued: SUCCESS.");
  };

  // Search filter
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.nationalId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDocs = localDocs.filter(d => 
    !d.is_deleted && (
      d.title.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      d.content.toLowerCase().includes(docSearchQuery.toLowerCase())
    )
  );

  const selectedCust = customers.find(c => c.id === selectedCustId) || customers[0];

  return (
    <div className={`space-y-6 p-1 dark-portal-wrapper ${isDarkMode ? "dark" : ""}`} id="clerk-workspace-portal">
      
      {/* Upper Status Banner & Active Clerk Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-55 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-100 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-sans font-extrabold text-slate-900 leading-tight">Clerk Desk: Terminal {clerkProfile.name}</h2>
            <p className="text-xs text-slate-500">Authorized: Standard Office Operations • Station: Chicago Loop Bureau</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Theme Toggle Mode */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 transition outline-none cursor-pointer flex items-center justify-center shadow-xs"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-650" />}
          </button>

          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">Desk Terminal Online</span>
        </div>
      </div>

      {/* Mobile Menu Action Bar for Clerk */}
      <div className="lg:hidden w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs mb-1">
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
            <UserCheck className="w-5 h-5 text-blue-600 animate-pulse" />
            <div className="text-left">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Clerk Desk</h2>
              <span className="text-[10px] text-slate-500 block">Terminal {clerkProfile.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 lg:hidden transition-all duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Column: Dense vertical navigation - Desktop & Mobile responsive drawer */}
        <div 
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 lg:border-none p-4 lg:p-0 flex flex-col space-y-4 transform transition-transform duration-300 lg:relative lg:transform-none lg:inset-auto lg:w-auto lg:col-span-1 overflow-y-auto h-full lg:h-auto ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Mobile close button drawer header */}
          <div className="flex lg:hidden items-center justify-between pb-3 border-b border-slate-200 mb-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Desk Navigator</span>
            <button 
              type="button" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-200 rounded-md transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1 shadow-sm">
            <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 block px-2.5 mb-1.5 uppercase">LOBBY OPERATIONS</span>
            <button
              onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-between ${
                activeTab === "dashboard" ? "bg-blue-600 text-white font-bold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5" /> Core Workspace
              </span>
              {activeTab !== "dashboard" ? <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-mono">KPI</span> : null}
            </button>

            <button
              onClick={() => { setActiveTab("queue"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-between ${
                activeTab === "queue" ? "bg-blue-600 text-white font-bold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Lobby & Queue
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${activeTab === "queue" ? "bg-blue-700 text-white" : "bg-amber-100 text-amber-800"}`}>
                {localQueue.filter(q => q.status === "waiting").length} Wait
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("appointments"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-between ${
                activeTab === "appointments" ? "bg-blue-600 text-white font-bold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Bookings Office
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${activeTab === "appointments" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-500"}`}>
                {localAppointments.filter(ap => ap.status === "scheduled").length} Active
              </span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1 shadow-sm">
            <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 block px-2.5 mb-1.5 uppercase">CLIENTS & LEDGER</span>
            
            <button
              onClick={() => { setActiveTab("customers"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === "customers" ? "bg-blue-600 text-white font-bold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Customers Directory
            </button>

            <button
              onClick={() => { setActiveTab("documents"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === "documents" ? "bg-blue-600 text-white font-bold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Document Manager
            </button>

            <button
              onClick={() => { setActiveTab("payments"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === "payments" ? "bg-blue-600 text-white font-bold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" /> Desk checkout & Pay
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1 shadow-sm">
            <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 block px-2.5 mb-1.5 uppercase">VERITAS DIGITAL SUITE</span>
            
            <button
              onClick={() => { setActiveTab("biometrics"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === "biometrics" ? "bg-blue-600 text-white font-bold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" /> Biometrics & ID OCR
            </button>

            <button
              onClick={() => { setActiveTab("ai-builder"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === "ai-builder" ? "bg-blue-600 text-white font-bold" : "text-slate-650 hover:bg-slate-50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> AI Contract Builder
            </button>

            <button
              onClick={() => { setActiveTab("ai-assistant"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === "ai-assistant" ? "bg-blue-600 text-white font-bold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Send className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> Desk AI Assistant
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1 shadow-sm">
            <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 block px-2.5 mb-1.5 uppercase">SESSION ARCHIVE</span>
            
            <button
              onClick={() => { setActiveTab("settings"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === "settings" ? "bg-blue-600 text-white font-bold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Settings & Language
            </button>
          </div>

          {/* Quick permissions card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[10px] space-y-2">
            <span className="font-mono font-bold text-slate-500 uppercase block">Clerk Level Permissions</span>
            <div className="grid grid-cols-2 gap-1.5 font-sans">
              <span className="text-emerald-700 flex items-center gap-1">✓ Customers</span>
              <span className="text-emerald-700 flex items-center gap-1">✓ Scans</span>
              <span className="text-emerald-700 flex items-center gap-1">✓ Documents</span>
              <span className="text-emerald-700 flex items-center gap-1">✓ Checkout</span>
              <span className="text-red-600 flex items-center gap-1">❌ Firm Finance</span>
              <span className="text-red-600 flex items-center gap-1">❌ Branch Admin</span>
            </div>
          </div>

          {/* Clerk Station Sign Out button */}
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm">
            <button
              onClick={() => { setIsMobileMenuOpen(false); onLogout(); }}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>De-authorize Station</span>
            </button>
          </div>

        </div>

        {/* Right Column: Dynamic screens rendering */}
        <div className="lg:col-span-3 min-h-[450px]">
          
          {/* TAB 1: CORE WORKSPACE DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* Quick Actions Panel */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Desk Quick Actions</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button onClick={() => handleQuickAction("new-customer")} className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-[11px] text-slate-700 rounded-lg border border-slate-200 transition font-semibold">
                    <UserPlus className="w-3.5 h-3.5 text-blue-600" /> + Customer
                  </button>
                  <button onClick={() => handleQuickAction("new-doc")} className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-[11px] text-slate-700 rounded-lg border border-slate-200 transition font-semibold">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" /> + Document
                  </button>
                  <button onClick={() => handleQuickAction("new-app")} className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-[11px] text-slate-700 rounded-lg border border-slate-200 transition font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" /> + Booking
                  </button>
                  <button onClick={() => handleQuickAction("scan-id")} className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-[11px] text-slate-700 rounded-lg border border-slate-200 transition font-semibold">
                    <Scan className="w-3.5 h-3.5 text-amber-600" /> ID Scan / Touch
                  </button>
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-center shadow-sm">
                  <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider">Desk Clients</span>
                  <span className="block text-xl font-bold font-sans text-slate-900 mt-1">25</span>
                </div>
                <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-center shadow-sm">
                  <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider">Bookings Today</span>
                  <span className="block text-xl font-bold font-sans text-blue-600 mt-1">12</span>
                </div>
                <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-center shadow-sm">
                  <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider">Queue Lobby</span>
                  <span className="block text-xl font-bold font-sans text-amber-600 mt-1">{localQueue.filter(q => q.status === "waiting").length} waiting</span>
                </div>
                <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-center shadow-sm">
                  <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider">Pending Drafts</span>
                  <span className="block text-xl font-bold font-sans text-indigo-600 mt-1">{localDocs.filter(d => d.status === "draft").length}</span>
                </div>
                <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-center shadow-sm col-span-2 md:col-span-1">
                  <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider">Completed</span>
                  <span className="block text-xl font-bold font-sans text-emerald-600 mt-1">20</span>
                </div>
              </div>

              {/* Personal performance charts & Notification stream */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left: Charts (7 columns) */}
                <div className="md:col-span-7 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">My Shift Statistics</span>
                  
                  {/* Styled HTML graphical bars */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center text-xs font-sans mb-1">
                        <span className="text-slate-600">Documents Notarized & Processed</span>
                        <span className="font-bold text-slate-900">18 / 25 daily target</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: "72%" }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs font-sans mb-1">
                        <span className="text-slate-600">Clients Greeted & Serviced</span>
                        <span className="font-bold text-slate-900">14 / 20 standard</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: "70%" }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs font-sans mb-1">
                        <span className="text-slate-600">Compliance Audit Check accuracy</span>
                        <span className="font-bold text-emerald-600">100% Secure</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: "100%" }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-[10px] text-blue-800 italic">
                    💡 <b>Desk Target:</b> Biometric capture compliance is at 98.4%. Fingerprint integrity must always be committed prior to seal overlay execution.
                  </div>
                </div>

                {/* Right: Notification Alerts Stream (5 columns) */}
                <div className="md:col-span-5 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-3">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Lobby Notifications</span>
                  
                  <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                    {notifications.map(n => (
                      <div key={n.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex items-start gap-2 text-xs">
                        {n.type === "warn" ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        ) : n.type === "success" ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Bell className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-semibold text-slate-900 leading-none">{n.title}</p>
                          <p className="text-[10px] text-slate-600 mt-1">{n.text}</p>
                          <span className="block text-[8px] text-slate-400 font-mono mt-1">{n.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: LOBBY & QUEUE OFFICE MANAGER */}
          {activeTab === "queue" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Active display board (5 columns) */}
              <div className="md:col-span-5 bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-extrabold tracking-wider">LOBBY RECEPTION BOARD</span>
                  
                  {/* Servicing display */}
                  <div className="mt-4 bg-slate-950 border border-slate-800 text-white rounded-2xl p-6 text-center space-y-1 relative overflow-hidden">
                    <span className="text-[10px] tracking-widest text-emerald-400 font-mono block uppercase">NOW SERVING AT DESK 2</span>
                    <span className="text-5xl font-mono tracking-tight text-white block py-2">
                      {localQueue.find(q => q.status === "serving")?.ticketNumber || "A-12"}
                    </span>
                    <p className="text-xs text-slate-300 font-sans truncate font-bold">
                      Caller: {localQueue.find(q => q.status === "serving")?.customerName || "Ahmed Ali"}
                    </p>
                  </div>

                  {/* Lobby waiting list */}
                  <div className="mt-4 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">LOBBY WAITLIST</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {localQueue.filter(q => q.status === "waiting").map(q => (
                        <span key={q.id} className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-xs font-mono font-bold text-slate-700 shadow-xs">
                          {q.ticketNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button onClick={handleCallNextTicket} className="w-full bg-blue-600 hover:bg-blue-500 text-xs font-extrabold text-white py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition">
                    <Volume2 className="w-4 h-4" /> PAGER: Call Next Customer
                  </button>
                  <p className="text-[10px] text-slate-450 text-center">Triggers station paging screen and broadcasts sound chimes.</p>
                </div>
              </div>

              {/* Manual Ticket Issuer & Admin (7 columns) */}
              <div className="md:col-span-7 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Desk Queue Lobby Registry</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">Active Live Tracker</span>
                </div>

                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {localQueue.map(tic => (
                    <div key={tic.id} className="p-3 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-200 flex items-center justify-between transition text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-900 font-extrabold text-sm">{tic.ticketNumber}</span>
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full font-sans uppercase ${
                            tic.status === "serving" ? "bg-emerald-100 text-emerald-800 border border-emerald-250" :
                            tic.status === "calling" ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse" :
                            tic.status === "passed" ? "bg-slate-200 text-slate-600" :
                            "bg-blue-50 text-blue-700"
                          }`}>{tic.status}</span>
                        </div>
                        <p className="text-slate-800 font-sans mt-0.5">Customer: <b>{tic.customerName}</b></p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">Service: {tic.serviceType} • Time: {tic.checkInTime}</p>
                      </div>

                      <div className="flex gap-1.5">
                        {tic.status === "waiting" && (
                          <button onClick={() => {
                            setLocalQueue(prev => prev.map(q => q.id === tic.id ? { ...q, status: "calling" as const, calledCounter: 2 } : q));
                            onAnnounceTicket(tic, 2);
                          }} className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-2 py-1 rounded transition">
                            Call Desk 2
                          </button>
                        )}
                        {tic.status === "calling" && (
                          <button onClick={() => {
                            setLocalQueue(prev => prev.map(q => q.id === tic.id ? { ...q, status: "serving" as const } : q));
                          }} className="bg-emerald-600 hover:bg-emerald-505 text-white text-[11px] font-bold px-2 py-1 rounded transition">
                            Begin Serving
                          </button>
                        )}
                        {tic.status === "serving" && (
                          <div className="flex gap-1">
                            <button onClick={() => handleCompleteTicket(tic.id)} className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] px-2 py-1 rounded transition">
                              Complete
                            </button>
                            <button onClick={() => handleSkipTicket(tic.id)} className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-[11px] px-2 py-1 rounded transition">
                              Skip
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Issuing custom ticket */}
                <form onSubmit={handleIssueManualTicket} className="pt-3 border-t border-slate-100 flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Walk-in Client Name"
                    value={appForm.customerName}
                    onChange={(e) => setAppForm(p => ({ ...p, customerName: e.target.value }))}
                    className="flex-1 bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                  />
                  <select
                    value={appForm.serviceType}
                    onChange={(e) => setAppForm(p => ({ ...p, serviceType: e.target.value }))}
                    className="bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                  >
                    <option value="Power of Attorney">Power of Attorney</option>
                    <option value="Affidavit">Affidavit</option>
                    <option value="Escrow Signing">Escrow Signing</option>
                  </select>
                  <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 rounded-lg transition shrink-0">
                    + Issue Ticket
                  </button>
                </form>

              </div>

            </div>
          )}

          {/* TAB 3: BOOKINGS & CALENDAR COORDINATOR */}
          {activeTab === "appointments" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Daily calendar list */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Today Appointment Schedules</span>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {localAppointments.map(ap => (
                    <div key={ap.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                      <div>
                        <span className="block font-bold text-slate-900 font-sans text-sm">{ap.customerName}</span>
                        <span className="block text-blue-600 mt-1">{ap.serviceType}</span>
                        <span className="block text-[10px] text-slate-500 font-mono mt-1">{ap.appointmentTime}</span>
                        <span className={`inline-block px-2 py-0.5 text-[9px] rounded-full font-bold uppercase tracking-wide mt-2 ${
                          ap.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                          ap.status === "canceled" ? "bg-red-50 text-red-700 border border-red-100" :
                          "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                        }`}>{ap.status}</span>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        {ap.status === "scheduled" && (
                          <>
                            <button onClick={() => handleCheckInCustomer(ap.customerName, ap.serviceType)} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-1 px-2.5 rounded transition">
                              Check In Lobby
                            </button>
                            <button onClick={() => handleReschedule(ap.id)} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-bold py-1 px-2.5 rounded transition">
                              Reschedule
                            </button>
                            <button onClick={() => {
                              setLocalAppointments(prev => prev.map(a => a.id === ap.id ? { ...a, status: "canceled" as const } : a));
                              addNotification("Booking Canceled", `Canceled schedule for ${ap.customerName}`, "warn");
                            }} className="bg-white hover:bg-red-50 hover:text-red-600 text-slate-400 border border-slate-200 text-[10px] py-1 px-2.5 rounded transition">
                              Cancel Booking
                            </button>
                          </>
                        )}
                        {ap.status !== "scheduled" && (
                          <span className="text-[10px] text-slate-405 font-mono italic">No actions</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Book Appointment form */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Register New Appointment</span>
                
                <form onSubmit={handleCreateAppointment} className="space-y-3">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Client Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ahmed Ali"
                      value={appForm.customerName}
                      onChange={(e) => setAppForm(p => ({ ...p, customerName: e.target.value }))}
                      className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Notary Service Type</label>
                    <select
                      value={appForm.serviceType}
                      onChange={(e) => setAppForm(p => ({ ...p, serviceType: e.target.value }))}
                      className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none text-slate-900"
                    >
                      <option value="General Power of Attorney">General Power of Attorney</option>
                      <option value="Affidavit of Identity">Affidavit of Identity</option>
                      <option value="Deed of Escrow Settlement">Deed of Escrow Settlement</option>
                      <option value="Declaration Document">Declaration Document</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Schedule Date</label>
                      <input
                        type="date"
                        required
                        value={appForm.date}
                        onChange={(e) => setAppForm(p => ({ ...p, date: e.target.value }))}
                        className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Appointment Time</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 10:30 AM"
                        value={appForm.time}
                        onChange={(e) => setAppForm(p => ({ ...p, time: e.target.value }))}
                        className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none text-slate-900"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white py-2.5 rounded-lg transition shadow-sm mt-4">
                    Book Appointment Slot
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 4: CUSTOMERS DIRECTORY SHEETS */}
          {activeTab === "customers" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Directory left (5 columns) */}
              <div className="md:col-span-5 bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-4">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">CLIENTS DIRECTORY MATRIX</span>
                
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search: Name, Phone, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 pl-8 text-xs rounded-lg outline-none text-slate-900"
                  />
                </div>

                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCustId(c.id); setEditCustMode(null); }}
                      className={`w-full text-left p-2.5 rounded-lg border transition flex items-center justify-between text-xs font-sans ${
                        selectedCustId === c.id ? "bg-blue-50 border-blue-400 text-blue-700 font-bold" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/50"
                      }`}
                    >
                      <div>
                        <span>{c.name}</span>
                        <p className="text-[9px] text-slate-450 font-mono leading-none mt-1">{c.phone} • {c.nationalId}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>

                <button onClick={() => { setEditCustMode("new"); setSelectedCustId(null); }} className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs py-2 rounded-lg font-bold transition flex items-center justify-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Register Customer
                </button>
              </div>

              {/* Profile Details right (7 columns) */}
              <div className="md:col-span-7 bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                
                {editCustMode ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-xs font-mono text-slate-550 block font-bold uppercase">{editCustMode === "new" ? "Register New Client" : "Modify Client Records"}</span>
                      <button onClick={() => setEditCustMode(null)} className="text-xs text-slate-500 font-semibold underline">Cancel</button>
                    </div>

                    <form onSubmit={editCustMode === "new" ? handleRegisterCustomer : (e) => { e.preventDefault(); if (selectedCustId) handleUpdateCustomer(selectedCustId); }} className="grid grid-cols-2 gap-3.5 text-xs">
                      <div className="col-span-2">
                        <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Full Name</label>
                        <input
                          type="text"
                          required
                          value={newCust.name}
                          onChange={(e) => setNewCust(p => ({ ...p, name: e.target.value }))}
                          placeholder="Ahmed Ali"
                          className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none text-slate-900 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Email</label>
                        <input
                          type="email"
                          required
                          value={newCust.email}
                          onChange={(e) => setNewCust(p => ({ ...p, email: e.target.value }))}
                          placeholder="ahmed@gmail.com"
                          className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Phone Number</label>
                        <input
                          type="text"
                          value={newCust.phone}
                          onChange={(e) => setNewCust(p => ({ ...p, phone: e.target.value }))}
                          placeholder="(312) 555-0144"
                          className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">National ID / Passport Code</label>
                        <input
                          type="text"
                          value={newCust.nationalId}
                          onChange={(e) => setNewCust(p => ({ ...p, nationalId: e.target.value }))}
                          placeholder="US-NID-98432101"
                          className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">DOB</label>
                        <input
                          type="date"
                          value={newCust.dob}
                          onChange={(e) => setNewCust(p => ({ ...p, dob: e.target.value }))}
                          className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Physical Street Address</label>
                        <input
                          type="text"
                          value={newCust.address}
                          onChange={(e) => setNewCust(p => ({ ...p, address: e.target.value }))}
                          className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                        />
                      </div>
                      <button type="submit" className="col-span-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg mt-3 text-center transition shadow-sm">
                        Commit Customer Record
                      </button>
                    </form>
                  </div>
                ) : selectedCust ? (
                  <div className="space-y-5 animate-fade-in text-xs">
                    
                    <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="text-lg font-sans font-extrabold text-slate-900 leading-tight">{selectedCust.name}</h4>
                        <p className="text-slate-500 font-mono text-[10px] mt-0.5">GUID: {selectedCust.id} • Registered Client</p>
                      </div>
                      <button onClick={() => {
                        setNewCust({
                          name: selectedCust.name,
                          email: selectedCust.email,
                          phone: selectedCust.phone,
                          nationalId: selectedCust.nationalId,
                          address: selectedCust.address,
                          dob: selectedCust.dob
                        });
                        setEditCustMode("edit");
                      }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold select-none">
                        Edit Profile
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-[11px]">
                      <div>
                        <span className="block text-[8px] font-mono text-slate-400 uppercase">National ID / Passport</span>
                        <span className="font-extrabold text-slate-950">{selectedCust.nationalId || "Unspecified"}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-mono text-slate-400 uppercase">Phone contact</span>
                        <span className="font-extrabold text-slate-950">{selectedCust.phone}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-mono text-slate-400 uppercase">Registered Email</span>
                        <span className="font-mono text-slate-800 underline truncate block">{selectedCust.email}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-mono text-slate-400 uppercase">Date of Birth</span>
                        <span className="font-mono text-slate-800 block">{selectedCust.dob || "1988-04-12"}</span>
                      </div>
                      <div className="col-span-2 border-t border-slate-200 pt-2.5">
                        <span className="block text-[8px] font-mono text-slate-400 uppercase">Physical Address</span>
                        <span className="text-slate-800 leading-relaxed block">{selectedCust.address || "No Address Record"}</span>
                      </div>
                    </div>

                    {/* Integrated custom biometrics status */}
                    <div className="grid grid-cols-2 gap-3.5 pt-1">
                      <div className="p-3 border border-slate-200 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 block font-semibold">Fingerprint file</span>
                          <span className={`text-[10px] font-bold ${selectedCust.fingerprintCaptured ? "text-emerald-600" : "text-amber-600"}`}>
                            {selectedCust.fingerprintCaptured ? "Captured & Verified ✓" : "Scan Missing"}
                          </span>
                        </div>
                        <Fingerprint className={`w-8 h-8 ${selectedCust.fingerprintCaptured ? "text-emerald-500" : "text-slate-350"}`} />
                      </div>

                      <div className="p-3 border border-slate-200 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 block font-semibold">Digital Signature</span>
                          <span className={`text-[10px] font-bold ${selectedCust.signatureCaptured ? "text-emerald-600" : "text-amber-600"}`}>
                            {selectedCust.signatureCaptured ? "Vector Saved ✓" : "Not Sealed"}
                          </span>
                        </div>
                        <Sparkles className={`w-8 h-8 ${selectedCust.signatureCaptured ? "text-blue-500" : "text-slate-350"}`} />
                      </div>
                    </div>

                    {/* Customer history list */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Client Session Records History</span>
                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                        <div className="p-2 bg-slate-50 border border-slate-100 rounded text-[10.5px] font-sans flex justify-between">
                          <span>Completed Power of Attorney Certification</span>
                          <span className="font-mono text-slate-500">2026-06-12</span>
                        </div>
                        <div className="p-2 bg-slate-50 border border-slate-100 rounded text-[10.5px] font-sans flex justify-between">
                          <span>Invoice INV-2026-001 ($120.00) Settled</span>
                          <span className="font-mono text-emerald-600 font-bold">PAID</span>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 italic">No customer selected matching current filters.</div>
                )}

              </div>
            </div>
          )}

          {/* TAB 5: DOCUMENT MANAGER & TEXT WRITER */}
          {activeTab === "documents" && (
            <div className="space-y-6">
              
              {/* Document creator block */}
              {editDocId ? (
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-mono text-slate-500 block font-bold uppercase">Dynamic Veritas Wordprose Workspace</span>
                    <button onClick={() => setEditDocId(null)} className="text-xs text-slate-550 font-semibold underline">Exit Editor</button>
                  </div>
                  <textarea
                    rows={12}
                    value={editDocContent}
                    onChange={(e) => setEditDocContent(e.target.value)}
                    className="w-full bg-slate-50 p-4 border border-slate-200 rounded-xl font-mono text-xs text-slate-950 leading-relaxed outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditDocId(null)} className="px-4 py-2 bg-white text-slate-700 border border-slate-200 text-xs font-bold rounded-lg transition hover:bg-slate-50">Cancel</button>
                    <button onClick={handleEditDocumentSave} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg transition hover:bg-blue-500 shadow-sm">Save Changes</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Documents Directory (5 columns) */}
                  <div className="md:col-span-12 p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Office Documents Database</span>
                      <input
                        type="text"
                        placeholder="Search prose document database..."
                        value={docSearchQuery}
                        onChange={(e) => setDocSearchQuery(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-xs px-3 py-1.5 rounded-lg outline-none text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-1">
                      {filteredDocs.map(doc => (
                        <div key={doc.id} className="p-4 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3.5 transition text-xs">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-0.5 text-[8px] font-bold rounded uppercase ${
                                doc.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-blue-50 text-blue-700"
                              }`}>{doc.status}</span>
                              <span className="text-[9px] text-slate-400 font-mono">{doc.createdAt}</span>
                            </div>
                            <h5 className="font-extrabold text-slate-900 mt-2 font-sans truncate">{doc.title}</h5>
                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-3 font-mono leading-relaxed bg-white border border-slate-100 p-2 rounded-lg">{doc.content}</p>
                          </div>

                          <div className="flex gap-1">
                            <button onClick={() => { setEditDocId(doc.id); setEditDocContent(doc.content); }} className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] py-1.5 rounded transition font-bold">
                              Edit Draft
                            </button>
                            <button onClick={() => handlePrintDocument(doc.title)} className="bg-slate-900 hover:bg-slate-800 text-white px-2 py-1.5 rounded transition">
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteDocument(doc.id)} className="bg-white hover:bg-red-50 text-red-500 border border-slate-200 px-2 py-1.5 rounded transition">
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Manual Creation Form (12 columns full layout) */}
                  <div className="md:col-span-12 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                    <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Configure & Create Raw Document Form</span>
                    
                    <form onSubmit={handleCreateDocument} className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Document Class</label>
                          <select
                            value={newDoc.type}
                            onChange={(e) => setNewDoc(p => ({ ...p, type: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                          >
                            <option value="Power of Attorney">Power of Attorney</option>
                            <option value="Affidavit">Affidavit</option>
                            <option value="Declaration">Declaration</option>
                            <option value="Contract">Contract</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Parties Involved (Comma Separated)</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Ahmed Ali, Elena Rostova"
                            value={newDoc.parties}
                            onChange={(e) => setNewDoc(p => ({ ...p, parties: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Custom Segment Heading</label>
                          <input
                            type="text"
                            value={newDoc.title}
                            onChange={(e) => setNewDoc(p => ({ ...p, title: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Body Wordprose Content</label>
                        <textarea
                          rows={4}
                          required
                          value={newDoc.content}
                          onChange={(e) => setNewDoc(p => ({ ...p, content: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg outline-none text-slate-900 font-mono text-[11px]"
                        />
                      </div>

                      <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg font-bold transition">
                        Insert Document Draft
                      </button>
                    </form>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 6: AI DOCUMENT BUILDER */}
          {activeTab === "ai-builder" && (
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
              <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">AI Guided Contract Builder</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Generate Contract Class</label>
                    <select
                      value={aiDocType}
                      onChange={(e) => setAiDocType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                    >
                      <option value="Power of Attorney">Create Power of Attorney</option>
                      <option value="General Affidavit">Create General Affidavit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Grantor / Appointor Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Ahmed Ali"
                      value={qaParams.grantor}
                      onChange={(e) => setQaParams(p => ({ ...p, grantor: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Attorney / Receiver Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Robert Plant"
                      value={qaParams.receiver}
                      onChange={(e) => setQaParams(p => ({ ...p, receiver: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Covenant Scope Purpose</label>
                    <input
                      type="text"
                      placeholder="e.g. General real estate banking transactions"
                      value={qaParams.purpose}
                      onChange={(e) => setQaParams(p => ({ ...p, purpose: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Duration Term Limit</label>
                    <input
                      type="text"
                      placeholder="e.g. One (1) Calendar Year"
                      value={qaParams.duration}
                      onChange={(e) => setQaParams(p => ({ ...p, duration: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleTriggerAIPowerBuilder}
                    disabled={aiDraftLoading}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs text-white font-extrabold py-2.5 rounded-lg transition shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {aiDraftLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Compile Document via Gemini AI
                  </button>
                </div>

                {/* Prose Result Viewer */}
                <div className="space-y-3.5">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">AI Draft Output</span>
                  
                  {aiDraftResults ? (
                    <div className="bg-slate-55 bg-gradient-to-tr from-slate-50 to-slate-100 p-4 rounded-xl font-mono text-[10px] leading-relaxed border border-slate-250 whitespace-pre max-h-[300px] overflow-y-auto">
                      {aiDraftResults}
                    </div>
                  ) : (
                    <div className="py-24 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 italic bg-slate-50">
                      Specify parameters on the left to invoke digital legal draft compiling.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 7: BIOMETRICS CAPTURING LASER SUITE */}
          {activeTab === "biometrics" && (
            <div className="space-y-6">
              
              {/* ID Scan / OCR block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">OCR Identification Photo scanner</span>
                  <p className="text-xs text-slate-500 leading-relaxed font-sans">
                    Load specimen identification records; the parser extracts fields directly into active registration forms.
                  </p>

                  <div className="space-y-3 pt-1">
                    <button onClick={() => onIdentityOcrScan(0)} disabled={ocrLoading} className="w-full text-left bg-slate-50 border border-slate-200 p-3.5 rounded-xl hover:border-blue-500 transition shadow-xs flex items-center gap-3">
                      <Scan className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <h6 className="font-bold text-slate-800 text-xs">US Passport Sample</h6>
                        <span className="text-[9px] text-slate-450 font-mono">ALEXANDER WESTMORELAND - PP9843102</span>
                      </div>
                    </button>

                    <button onClick={() => onIdentityOcrScan(1)} disabled={ocrLoading} className="w-full text-left bg-slate-50 border border-slate-200 p-3.5 rounded-xl hover:border-blue-500 transition shadow-xs flex items-center gap-3">
                      <Scan className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <h6 className="font-bold text-slate-800 text-xs">German ID Sample</h6>
                        <span className="text-[9px] text-slate-450 font-mono">KLAUS SCHMIDT - National ID: D89420B11</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Laser scan results */}
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold mb-3">ID Extractions Output</span>
                    {ocrLoading ? (
                      <div className="py-12 text-center text-xs text-slate-400 italic">Processing high-speed OCR parsing...</div>
                    ) : ocrData ? (
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs space-y-2 font-mono">
                        <span className="font-extrabold text-blue-800 block">✓ Extraction successful</span>
                        <p className="text-slate-900 font-bold">Name: {ocrData.fullName}</p>
                        <p className="text-slate-900">ID Code: {ocrData.documentNumber}</p>
                        <p className="text-slate-900">DOB: {ocrData.dob}</p>
                        <span className="text-[9px] text-slate-500 block">Values automatically saved to registration form state.</span>
                      </div>
                    ) : (
                      <div className="py-16 border border-dashed border-slate-200 text-center text-xs text-slate-400 italic">No OCR image queued. Use buttons on left.</div>
                    )}
                  </div>
                </div>

              </div>

              {/* Fingerprint Capture Workspace */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Laser Fingerprint Scanner Workspace</span>
                  
                  <div className="bg-slate-50 border border-slate-200 py-6 rounded-xl flex flex-col items-center justify-center relative h-36">
                    {propBioScanning && (
                      <div className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-lg animate-bounce" style={{ top: `${propBioProgress}%` }}></div>
                    )}
                    <Fingerprint className={`w-12 h-12 ${propFingerprintReady ? "text-emerald-500" : propBioScanning ? "text-blue-500 animate-pulse" : "text-slate-450"}`} />
                    <span className="block text-[9px] font-mono text-slate-450 mt-2">
                      {propFingerprintReady ? "Fingerprint Status: Captured & Verified ✓" : propBioScanning ? `Scanning minutiae: ${propBioProgress}%` : "Device Idle. Connect scanner."}
                    </span>
                  </div>

                  <div className="flex gap-2 text-xs">
                    <button onClick={onTriggerFingerprintScan} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg transition shadow-xs">
                      Invoke Biometric Scan
                    </button>
                    {propFingerprintReady && (
                      <button onClick={() => alert(`Saved hash ${propFingerHash} to registry.`)} className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg transition font-bold">
                        Save Record
                      </button>
                    )}
                  </div>
                </div>

                {/* Signature Board and routing */}
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Vector signature touchpad</span>
                    <button onClick={onClearSignature} className="text-xs text-blue-600 font-semibold underline">Clear Board</button>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 relative h-36 cursor-crosshair flex flex-col items-center justify-center">
                    <canvas
                      ref={canvasRef}
                      width={310}
                      height={120}
                      onMouseDown={onStartDrawing}
                      onMouseMove={onDraw}
                      onMouseUp={onStopDrawing}
                      onMouseLeave={onStopDrawing}
                      className="w-full h-full bg-slate-50"
                    />
                    {!hasSignature && (
                      <span className="absolute select-none pointer-events-none text-[10px] text-slate-400">Write customer signature here</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => alert("Digital signature validated and mapped to Active Document metadata buffers successfully.")} className="w-full bg-slate-900 hover:bg-slate-800 text-xs text-white py-2 rounded-lg font-bold transition shadow-xs">
                      Link Signature to Active Draft Document
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 8: PAYMENTS & FINANCES DESK CHECKOUT */}
          {activeTab === "payments" && (
            <div className="space-y-6">
              
              {/* Checkout billing table (cannot load global company finances) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Invoice Form (5 columns) */}
                <div className="md:col-span-5 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Generate Client Invoice Receipt</span>
                  
                  <form onSubmit={handleCreateInvoice} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Client Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ahmed Ali"
                        value={invoiceForm.customerName}
                        onChange={(e) => setInvoiceForm(p => ({ ...p, customerName: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none text-slate-900 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Billed Amount ($ USD)</label>
                      <input
                        type="number"
                        required
                        placeholder="120.00"
                        value={invoiceForm.amount}
                        onChange={(e) => setInvoiceForm(p => ({ ...p, amount: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Notary Fee Description</label>
                      <input
                        type="text"
                        placeholder="Biometric authentication and POA Seal"
                        value={invoiceForm.description}
                        onChange={(e) => setInvoiceForm(p => ({ ...p, description: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                      />
                    </div>

                    <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg transition text-xs shadow-sm mt-2">
                      Generate Desk Invoice
                    </button>
                  </form>
                </div>

                {/* Daily Invoices Registry (7 columns) */}
                <div className="md:col-span-7 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Clerk Station Local Invoicing Ledger</span>
                  
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {localInvoices.map(inv => (
                      <div key={inv.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                            <span className={`px-2 py-0.5 text-[8.5px] rounded font-bold uppercase ${
                              inv.status === "paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700"
                            }`}>{inv.status}</span>
                          </div>
                          <p className="text-slate-800 font-sans mt-0.5">Recipient: <b>{inv.customerName}</b></p>
                          <p className="text-[10px] text-slate-500">Amount: <b>${inv.amount.toFixed(2)}</b> • Due: {inv.dueDate}</p>
                        </div>

                        {inv.status === "unpaid" && (
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => handlePayInvoice(inv.id)} className="bg-emerald-600 hover:bg-emerald-505 text-white text-[11px] font-bold px-3 py-1.5 rounded transition">
                              Pay Invoice
                            </button>
                          </div>
                        )}
                        {inv.status === "paid" && (
                          <button onClick={() => alert(`Receipt INV-RE-009 printed for cash record. Signature: Elena Rostova.`)} className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded transition">
                            Print Cash Receipt
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Strictly restricted financial block */}
                  <div className="p-4 bg-red-50 border border-red-150 rounded-xl text-xs space-y-1.5 text-red-955 flex items-start gap-2.5 leading-relaxed">
                    <XCircle className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold uppercase tracking-wide">❌ Regulatory Permissions Enforcement Panel</p>
                      <p className="text-[11px] text-red-800 font-semibold">
                        Firm finance parameters, subscription contracts, branch revenue analytics, and colleague compensation cards are blacklisted for Clerk Practitioner accounts. 
                        Credential security policies enforce localized station invoice registries exclusively.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 9: AI CLERK ASSISTANT BOX TERMINAL */}
          {activeTab === "ai-assistant" && (
            <div className="space-y-4">
              
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <h3 className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="text-blue-600 w-4 h-4 animate-bounce" /> Veritas Clerk Assistant
                  </h3>
                  <p className="text-xs text-slate-500">Ask template builds, perform client searches, or summarize contract clauses.</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl h-[330px] flex flex-col justify-between shadow-sm">
                <div className="space-y-3.5 overflow-y-auto max-h-[240px] pr-1 flex-1 text-xs">
                  {aiTerminalLog.map((log, idx) => (
                    <div key={idx} className={`flex ${log.sender === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`p-3 max-w-[85%] rounded-xl ${
                        log.sender === "user" ? "bg-blue-600 text-white rounded-br-none font-sans" : "bg-slate-50 border border-slate-200 text-slate-850 rounded-bl-none font-mono text-[10.5px]"
                      }`}>
                        {log.sender === "ai" && <span className="text-[8.5px] font-sans text-blue-600 block tracking-wider uppercase font-bold mb-1">VERITAS AI CLERK ASSISTANT:</span>}
                        {log.msg}
                      </div>
                    </div>
                  ))}
                  {aiTerminalLoading && (
                    <div className="text-center italic text-slate-400 py-3 flex items-center justify-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Drafting compliance response...
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendAITerminalMsg} className="mt-4 pt-3 border-t border-slate-150 flex gap-2">
                  <input
                    type="text"
                    required
                    value={aiTerminalPrompt}
                    onChange={(e) => setAiTerminalPrompt(e.target.value)}
                    placeholder="e.g. Generate affidavit template OR Find customer Ahmed Ali..."
                    className="flex-1 bg-slate-50 border border-slate-200 text-xs px-3 py-2.5 rounded-lg text-slate-900 outline-none"
                  />
                  <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-4 rounded-lg flex items-center gap-1 shadow transition">
                    <Send className="w-3 h-3" /> Ask
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 10: CLERK CONFIGURATION PROFILE & KEY */}
          {activeTab === "settings" && (
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-5 text-xs">
              
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold leading-none">Internal Clerk Settings</span>
                  <p className="text-[11px] text-slate-500 mt-1">Configure workspace variables and avatar keys securely.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-slate-100">
                <div className="space-y-3.5">
                  <span className="text-[9px] font-mono text-slate-550 block font-bold uppercase">Clerk Core Profile</span>
                  
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <img referrerPolicy="no-referrer" src={clerkProfile.avatar} alt="avatar" className="w-12 h-12 rounded-full border-2 border-white shadow-xs" />
                    <div>
                      <span className="font-extrabold text-slate-950 block text-sm">{clerkProfile.name}</span>
                      <span className="text-slate-500 text-[10px] leading-none block mt-1">{clerkProfile.role} • Bureau Loop</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Upload Avatar Key Base64 URL</label>
                    <input
                      type="text"
                      value={clerkProfile.avatar}
                      onChange={(e) => setClerkProfile(p => ({ ...p, avatar: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded outline-none text-slate-900 text-[11px] font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Practitioner Fullname</label>
                      <input
                        type="text"
                        value={clerkProfile.name}
                        onChange={(e) => setClerkProfile(p => ({ ...p, name: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded outline-none text-slate-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Clerk Workspace Language</label>
                      <select
                        value={clerkLanguage}
                        onChange={(e) => setClerkLanguage(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded outline-none text-slate-900"
                      >
                        <option value="English (US)">English (US)</option>
                        <option value="Spanish (LatAm)">Español (LatAm)</option>
                        <option value="German (Berlin-Tech)">Deutsch (DE)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[9px] font-mono text-slate-550 block font-bold uppercase">Update Passwords Keys</span>
                  
                  <div>
                    <label className="block text-[9px] text-slate-400 font-mono mb-1 uppercase">Current Password</label>
                    <input
                      type="password"
                      defaultValue="••••••••••••"
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-400 font-mono mb-1 uppercase">New Security Password</label>
                    <input
                      type="password"
                      placeholder="e.g. ************"
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded outline-none"
                    />
                  </div>

                  <button type="button" onClick={() => alert("Station password keys updated successfully.")} className="w-full bg-slate-905 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 rounded-lg transition text-center shadow-xs">
                    Apply Workspace Updates
                  </button>
                </div>
              </div>

            </div>
          )}

        </div> {/* End Right Column */}
      </div> {/* End Grid Layout */}

    </div>
  );
}
