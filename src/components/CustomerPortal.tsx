type Invoice = { id: string; invoiceNumber?: string; customerName: string; amount: number; dueDate: string; status: string; items?: { description: string; price: number }[] };
type Appointment = { id: string; branchId?: string; customerName: string; serviceType: string; appointmentTime: string; status: string; customerEmail?: string };

import React, { useState, useRef, useEffect } from "react";
import { 
  User, Calendar, Clock, CreditCard, ShieldCheck, Download, 
  QrCode, RefreshCw, CheckCircle, PlusCircle, XCircle, Trash2, 
  Plus, Search, FileText, Upload, MessageSquare, Settings, 
  Lock, Camera, Bell, BookOpen, HeartHandshake, HelpCircle, 
  Send, Smartphone, Check, AlertCircle, Fingerprint, 
  Building, MapPin, ShieldAlert, ArrowRight, Printer, AlertTriangle, CheckSquare, Menu, X, Sun, Moon
} from "lucide-react";
import { Branch, NotaryDocument } from "../types";

interface CustomerPortalProps {
  branches: Branch[];
  appointments: Appointment[];
  onBookAppointment: (branchId: string, name: string, email: string, serviceType: string, time: string) => void;
  documents: NotaryDocument[];
  invoices: never[];
  onPayInvoice: (id: string) => void;
  onLogout: () => void;
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  priority: "low" | "medium" | "high";
  status: "open" | "resolved";
  createdAt: string;
}

export default function CustomerPortal({
  branches,
  appointments,
  onBookAppointment,
  documents,
  invoices,
  onPayInvoice,
  onLogout
}: CustomerPortalProps) {
  // Sidebar state
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "appointments" | "documents" | "upload" | "payments" | "notifications" | "support" | "profile"
  >("dashboard");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("portal-theme-customer-portal") === "dark";
  });

  useEffect(() => {
    localStorage.setItem("portal-theme-customer-portal", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Logged-in Customer info context
  const [customerName, setCustomerName] = useState("Ahmed Ali");
  const [customerPhone, setCustomerPhone] = useState("+252 61 555-0144");
  const [customerEmail] = useState("ahmed.ali@example.com");
  const [customerPassword, setCustomerPassword] = useState("••••••••••••");
  const [avatarUrl, setAvatarUrl] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150");

  // Notifications channels preferences
  const [channelPrefs, setChannelPrefs] = useState({
    inApp: true,
    email: true,
    whatsapp: false,
    sms: true
  });

  // Verification center indicators
  const [verificationCenter] = useState({
    fingerprint: true,
    signature: true,
    identity: true
  });

  // Mock initial documents context
  const [customerDocuments, setCustomerDocuments] = useState<NotaryDocument[]>([
    {
      id: "doc-101",
      title: "Power of Attorney (Agent Authorization)",
      status: "completed",
      parties: ["Ahmed Ali", "Farah Omar"],
      content: "DURABLE POWER OF ATTORNEY\n\nI, Ahmed Ali, constitute Farah Omar my legal representative with absolute authorization regarding banking, deed execution, and physical property clearance in Bosaso branch territory...",
      createdAt: "2026-06-10",
      watermarkCode: "VERITAS-SEC-8820",
      hash: "8ae7c1b5055b8ef98cf85d564fa72c3b"
    },
    {
      id: "doc-102",
      title: "Affidavit of Dual Residency Certification",
      status: "pending-signature", // mapped dynamically to progress: "Under Review" / "Verification"
      parties: ["Ahmed Ali"],
      content: "AFFIDAVIT OF DUAL RESIDENCY\n\nI, Ahmed Ali, declare on sworn oath that I hold active residence records across Federal States of Somalia. Subscribed to notary verification desk...",
      createdAt: "2026-06-11",
      watermarkCode: "VERITAS-SEC-9241"
    },
    {
      id: "doc-103",
      title: "Corporate Authorization Placement Letter",
      status: "draft", // mapped dynamically: ready for pickup
      parties: ["Ahmed Ali", "Hassan Corp Ltd"],
      content: "AUTHORIZATION LETTER COVENANT\n\nThis letter formally authorizes representative courier pickup of registered customs and shipping container licenses within Bosaso Port Terminal...",
      createdAt: "2026-06-12"
    }
  ]);

  // Unified documents list (combining prop documents + local mocks with custom styling IDs)
  const allDocs = [...documents, ...customerDocuments].filter(
    (v, i, a) => a.findIndex(t => t.id === v.id) === i
  );

  // Active selected document for deep status tracking detail view
  const [selectedDoc, setSelectedDoc] = useState<NotaryDocument | null>(allDocs[0] || null);

  // QR Verification engine fields
  const [qrInputCode, setQrInputCode] = useState("");
  const [qrVerificationResult, setQrVerificationResult] = useState<{
    status: "idle" | "success" | "fail";
    message: string;
    docTitle?: string;
    verifiedAt?: string;
  }>({ status: "idle", message: "" });

  // Booking Flow Steps Context
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingCompany, setBookingCompany] = useState("Veritas Notary Bureau LLC");
  const [bookingBranchId, setBookingBranchId] = useState(branches[0]?.id ?? "");
  const [bookingService, setBookingService] = useState("Power of Attorney");
  const [bookingDate, setBookingDate] = useState("2026-06-25");
  const [bookingTime, setBookingTime] = useState("10:00 AM");

  // Notifications Stream
  const [notifications, setNotifications] = useState([
    {
      id: "not-01",
      title: "Appointment Spark Confirmed",
      text: "Your booking for 25 June 2026 at Bosaso Main Branch has been approved by the Registrar.",
      channel: "Email",
      time: "Today, 10:22 AM",
      unread: true
    },
    {
      id: "not-02",
      title: "Document Verified & Ready",
      text: "Power of Attorney (DOC-2026-00123) watermarked and published into secure digital vault.",
      channel: "In-App",
      time: "Yesterday, 04:15 PM",
      unread: false
    },
    {
      id: "not-03",
      title: "Payment Invoice Settle Receipt",
      text: "Payment of $25 received for invoice #INV-2026-00015. Copy dispatched to email.",
      channel: "SMS",
      time: "2 days ago",
      unread: false
    }
  ]);

  // Support Tickets State
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([
    {
      id: "tick-01",
      subject: "Biometric Fingerprint Re-Verification Request",
      category: "Biometric Failure",
      priority: "high",
      status: "open",
      createdAt: "2026-06-12"
    },
    {
      id: "tick-02",
      subject: "Download signature certified PDF package",
      category: "Portal Interface",
      priority: "low",
      status: "resolved",
      createdAt: "2026-06-08"
    }
  ]);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("General Question");
  const [ticketPriority, setTicketPriority] = useState<"low" | "medium" | "high">("medium");
  const [ticketDescription, setTicketDescription] = useState("");

  const [supportChats, setSupportChats] = useState<{ sender: "user" | "operator", text: string; time: string }[]>([
    { sender: "operator", text: "Hello! Welcome to Veritas Online Support Centre. How can we assist you with your notarization, invoice settlement, or queue check-in today?", time: "10:30 AM" }
  ]);
  const [supportInput, setSupportInput] = useState("");

  // Uploaded Files State
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([
    { id: "up-221", name: "National_ID_Ahmed_Ali.pdf", type: "National ID", size: "1.2 MB", uploadedAt: "2026-06-11" },
    { id: "up-222", name: "Utility_Bill_Chicago_Residency.jpg", type: "Utility Bill", size: "840 KB", uploadedAt: "2026-06-11" }
  ]);
  const [targetUploadCategory, setTargetUploadCategory] = useState("National ID");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Invoices list (Combines local with prop-driven)
  const [localInvoices, setLocalInvoices] = useState<Invoice[]>([
    {
      id: "inv-21",
      invoiceNumber: "INV-2026-00015",
      customerName: "Ahmed Ali",
      amount: 25.00,
      dueDate: "2026-06-12",
      status: "paid",
      items: [{ description: "Power of Attorney Document Certification", price: 25.00 }]
    },
    {
      id: "inv-22",
      invoiceNumber: "INV-2026-00030",
      customerName: "Ahmed Ali",
      amount: 45.00,
      dueDate: "2026-06-25",
      status: "unpaid",
      items: [{ description: "Affidavit & Digital Fingerprint Validation Surcharge", price: 45.00 }]
    }
  ]);

  const allInvoices = [...invoices, ...localInvoices].filter(
    (v, i, a) => a.findIndex(t => t.invoiceNumber === v.invoiceNumber) === i
  );

  // AI Assistant Chat state
  const [aiAssistantPrompt, setAiAssistantPrompt] = useState("");
  const [aiAssistantChats, setAiAssistantChats] = useState<{ sender: "user" | "ai"; text: string }[]>([
    { sender: "ai", text: "Hello Ahmed Ali, I am your dedicated Veritas AI Assistant. Feel free to ask me questions like:\n- *'What documents do I need for power of attorney?'*\n- *'How much does affidavit service cost?'*\n- *'When is my appointment?'*\n- *'What is the status of my document?'*" }
  ]);
  const [aiAssistantLoading, setAiAssistantLoading] = useState(false);

  // Auto scroll supports
  const supportEndRef = useRef<HTMLDivElement>(null);
  const aiEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supportEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [supportChats]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiAssistantChats]);

  // Handlers
  const handleAddNewApp = (e: React.FormEvent) => {
    e.preventDefault();
    onBookAppointment(bookingBranchId, customerName, customerEmail, bookingService, `${bookingDate} @ ${bookingTime}`);
    
    // Add success notification
    const branchName = branches.find(b => b.id === bookingBranchId)?.name || "Bosaso Main Branch";
    setNotifications(prev => [
      {
        id: "not-" + Date.now(),
        title: "Appointment Booked Successfully",
        text: `Your ${bookingService} appointment at ${branchName} is scheduled for ${bookingDate} at ${bookingTime}.`,
        channel: "In-App",
        time: "Just now",
        unread: true
      },
      ...prev
    ]);

    alert(`✓ Appointment Draft Synchronized!\nYour booking for ${bookingService} was recorded on the Veritas Ledger.\nDate: ${bookingDate}\nTime: ${bookingTime}\nBranch: ${branchName}`);
    setBookingStep(1); // Reset step 
    setActiveTab("dashboard"); // Go back to dashboard to review
  };

  const executeQRVerification = (customCode?: string) => {
    const code = customCode || qrInputCode;
    if (!code.trim()) {
      alert("Please specify a document digital ID serial number.");
      return;
    }

    const matched = allDocs.find(d => 
      d.id.toLowerCase().includes(code.toLowerCase()) || 
      d.watermarkCode?.toLowerCase().includes(code.toLowerCase()) ||
      code.toUpperCase() === "DOC-2026-00123"
    );

    if (matched || code.toUpperCase() === "DOC-2026-00123") {
      setQrVerificationResult({
        status: "success",
        message: "Valid Document ✓ cryptographically sealed by Veritas Notary.",
        docTitle: matched?.title || "Durable Power of Attorney",
        verifiedAt: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString()
      });
    } else {
      setQrVerificationResult({
        status: "fail",
        message: "❌ Document code mismatch. Serial number is not recognized in the active Veritas ledger."
      });
    }
  };

  const handleSupportChatSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportInput.trim()) return;
    const userText = supportInput;
    setSupportChats(prev => [...prev, { sender: "user", text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setSupportInput("");

    // Simple auto response chatbot response
    setTimeout(() => {
      let botResponse = "Thank you for contacting Veritas Support. An operator of Chicago/Bosaso team has been alerted and will correspond shortly. Your reference slot ticket ID is: " + Math.floor(Math.random() * 900) + 100;
      if (userText.toLowerCase().includes("pay") || userText.toLowerCase().includes("invoice")) {
        botResponse = "Understood. You can easily complete the invoice payments by visiting the 'Payments' module in your left navigation menu. We accept card processing powered safely by Stripe.";
      } else if (userText.toLowerCase().includes("fingerprint") || userText.toLowerCase().includes("biometrics")) {
        botResponse = "If your biometrics status shows outstanding, please request the physical clerk at check-in counter to capture and upload your dual-hash fingerprint record.";
      }
      setSupportChats(prev => [...prev, { sender: "operator", text: botResponse, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    }, 1100);
  };

  const handleTicketCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim()) return;
    const created: SupportTicket = {
      id: "tick-" + (Date.now() % 1000),
      subject: ticketSubject,
      category: ticketCategory,
      priority: ticketPriority,
      status: "open",
      createdAt: new Date().toISOString().substring(0, 10)
    };
    setSupportTickets(prev => [created, ...prev]);
    setTicketSubject("");
    setTicketDescription("");
    alert("✓ Customer relations case opened successfully! Veritas ticket ID logged.");
  };

  // AI Assistant trigger
  const handleAIAssistantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiAssistantPrompt.trim()) return;
    const userPrompt = aiAssistantPrompt;
    setAiAssistantChats(prev => [...prev, { sender: "user", text: userPrompt }]);
    setAiAssistantPrompt("");
    setAiAssistantLoading(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `As Ahmed Ali, I am asking a customer question: ${userPrompt}. Provide an answer focusing on power of attorney requirements, affidavit fees ($25 standard), or checking appointment slots.` }]
        })
      });
      const data = await response.json();
      if (data.success && data.reply) {
        setAiAssistantChats(prev => [...prev, { sender: "ai", text: data.reply }]);
      } else {
        throw new Error();
      }
    } catch {
      // Local smart mock fallback resolving requested sample prompts
      let fallbackText = "I have scanned the legal knowledge base. If you need details on our Bosaso branch, let me know.";
      const cleanPrompt = userPrompt.toLowerCase();
      if (cleanPrompt.includes("power of attorney") || cleanPrompt.includes("documents do i need")) {
        fallbackText = "💼 **Power of Attorney Requirements**:\nTo certify a Durable Power of Attorney document, you must present:\n1. A valid national ID or passport.\n2. Contact particulars and address profiles for both the Principal (Grantor) and the Agent.\n3. Digital signature overlay.\n4. Biometric fingerprint scan to sign-off compliance.";
      } else if (cleanPrompt.includes("affidavit") || cleanPrompt.includes("how much") || cleanPrompt.includes("cost")) {
        fallbackText = "💵 **Affidavit Service Costing**:\nStandard affidavit verification slots are charged at a flat desk fee of **$25.00 usd**. Optional biometrics captures or bulk certified printing spools can add a nominal fee, visible under the Payments checkout ledger.";
      } else if (cleanPrompt.includes("appointment") || cleanPrompt.includes("when is")) {
        fallbackText = "📅 **Your Active Booking Details**:\nYou have an upcoming appointment scheduled for **25 June 2026** at **10:00 AM** at our **Bosaso Main Branch** (Status: Confirmed). Please check into counter kiosk 15 minutes ahead of schedule!";
      } else if (cleanPrompt.includes("status of my document") || cleanPrompt.includes("status")) {
        fallbackText = "🔍 **Document Status Analytics**:\nYour recent *'Affidavit of Dual Residency Certification'* is currently **Under Review** by Clerk Elena Rostova. Your *'Power of Attorney'* is marked as **Completed** and is verified on the blockchain registry.";
      }
      setAiAssistantChats(prev => [...prev, { sender: "ai", text: fallbackText }]);
    } finally {
      setAiAssistantLoading(false);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };
  const triggerManualFile = () => {
    fileInputRef.current?.click();
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };
  const handleFiles = (files: FileList) => {
    const file = files[0];
    const newUpFile: UploadedFile = {
      id: "up-" + Math.floor(Math.random() * 900 + 100),
      name: file.name,
      type: targetUploadCategory,
      size: (file.size / 1024).toFixed(0) + " KB",
      uploadedAt: new Date().toISOString().substring(0, 10)
    };
    setUploadedFiles(prev => [newUpFile, ...prev]);
    // Notify
    setNotifications(prev => [
      {
        id: "not-" + Date.now(),
        title: "Attachment Uploaded",
        text: `Successfully uploaded ${file.name} as certified ${targetUploadCategory}.`,
        channel: "In-App",
        time: "Just now",
        unread: true
      },
      ...prev
    ]);
  };

  const deleteUploadedFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  // Mapping of dynamic progress bars based on document status
  const getDocumentProgress = (status: string) => {
    switch (status) {
      case "draft":
        return { percent: 20, step: "Submitted" };
      case "pending-signature":
        return { percent: 60, step: "Verification" };
      case "completed":
        return { percent: 100, step: "Completed" };
      default:
        return { percent: 40, step: "Under Review" };
    }
  };

  return (
    <div className={`space-y-6 p-1 dark-portal-wrapper ${isDarkMode ? "dark" : ""}`} id="client-secured-terminal">
      
      {/* Mobile Menu Action Bar for Customer */}
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
            <User className="w-5 h-5 text-emerald-600 animate-pulse" />
            <div className="text-left">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Customer Lobby</h2>
              <span className="text-[10px] text-slate-500 block">{customerName}</span>
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

      {/* Main Framework Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        
        {/* SIDEBAR - Desktop & Mobile responsive drawer */}
        <div 
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 md:border-none p-4 md:p-0 flex flex-col space-y-4 transform transition-transform duration-300 md:relative md:transform-none md:inset-auto md:w-auto md:col-span-1 overflow-y-auto h-full md:h-auto ${
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
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
            <div className="flex items-center justify-between px-2.5 mb-2 pb-2 border-b border-slate-100">
              <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase">CUSTOMER NAVIGATOR</span>
              
              {/* Theme Toggle Mode */}
              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-1 px-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition outline-none cursor-pointer flex items-center gap-1 hover:text-slate-800"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="w-3 h-3 text-amber-500" /> : <Moon className="w-3 h-3 text-indigo-650" />}
                <span className="text-[9px] font-bold font-sans">{isDarkMode ? "Light" : "Dark"}</span>
              </button>
            </div>
            
            <button
              onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                activeTab === "dashboard" ? "bg-slate-150 text-slate-900 font-extrabold border-l-4 border-emerald-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Building className="w-3.5 h-3.5" /> Dashboard Home
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 rounded-full font-bold">LIVE</span>
            </button>

            <button
              onClick={() => { setActiveTab("appointments"); setBookingStep(1); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                activeTab === "appointments" ? "bg-slate-150 text-slate-900 font-extrabold border-l-4 border-emerald-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Appointments
              </span>
              <span className="text-[10px] font-mono text-slate-400">Step</span>
            </button>

            <button
              onClick={() => { setActiveTab("documents"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                activeTab === "documents" ? "bg-slate-150 text-slate-900 font-extrabold border-l-4 border-emerald-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> My Documents
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full font-bold">{allDocs.length}</span>
            </button>

            <button
              onClick={() => { setActiveTab("upload"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === "upload" ? "bg-slate-150 text-slate-900 font-extrabold border-l-4 border-emerald-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> Upload ID & Bills
            </button>

            <button
              onClick={() => { setActiveTab("payments"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                activeTab === "payments" ? "bg-slate-150 text-slate-900 font-extrabold border-l-4 border-emerald-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5" /> Payments Center
              </span>
              {allInvoices.some(i => i.status === "unpaid") && (
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab("notifications"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                activeTab === "notifications" ? "bg-slate-150 text-slate-900 font-extrabold border-l-4 border-emerald-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5" /> Notifications
              </span>
              {notifications.some(n => n.unread) && (
                <span className="text-[10px] bg-amber-500 text-white px-1.5 rounded-full font-bold font-mono">
                  {notifications.filter(n => n.unread).length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab("support"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === "support" ? "bg-slate-150 text-slate-900 font-extrabold border-l-4 border-emerald-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Support Bureau
            </button>

            <button
              onClick={() => { setActiveTab("profile"); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === "profile" ? "bg-slate-150 text-slate-900 font-extrabold border-l-4 border-emerald-600 rounded-l-none" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Profile & Security
            </button>
          </div>

          {/* Secure Permissions Board of the Customer */}
          <div className="bg-slate-950 border border-slate-900 text-slate-300 rounded-2xl p-4 space-y-3.5 shadow-sm">
            <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold tracking-widest">ACCESS LEVEL SECURITY</span>
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Authorized Customer Session
            </div>
            
            <div className="space-y-1.5 text-[10px] font-sans">
              <div className="flex justify-between text-slate-400">
                <span>Book Appointments</span> <span className="text-emerald-400 font-bold">Allowed ✓</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Upload Documents</span> <span className="text-emerald-400 font-bold">Allowed ✓</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Pay Checkout Bills</span> <span className="text-emerald-400 font-bold">Allowed ✓</span>
              </div>
              <div className="flex justify-between text-slate-400 text-slate-500 border-t border-slate-900 pt-1.5">
                <span>Other Customer Data</span> <span className="text-red-500 font-bold">Forbidden ❌</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Corporation Reports</span> <span className="text-red-500 font-bold">Forbidden ❌</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Edit Approved Files</span> <span className="text-red-500 font-bold">Forbidden ❌</span>
              </div>
            </div>

            <div className="p-2 bg-slate-900 text-[9.5px] italic text-slate-400 rounded-lg">
              🔐 <b>ESIGN Compliant:</b> Under Act 2000, client electronic signatures are fully bound in our secure escrow registry.
            </div>
          </div>

          {/* Custom Logout button inside Customer Lobby panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm mt-3">
            <button
              onClick={() => { setIsMobileMenuOpen(false); onLogout(); }}
              className="w-full py-2 bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 border border-purple-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Leave Secure Lobby</span>
            </button>
          </div>
        </div>

        {/* Content Screens */}
        <div className="md:col-span-3 space-y-6">
          
          {/* SCREEN 1: DASHBOARD HOME */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* Client Quick Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs text-center">
                  <span className="block text-[10px] text-slate-500 font-mono uppercase font-bold tracking-wider">My Documents</span>
                  <span className="block text-2xl font-extrabold text-slate-950 mt-1">8</span>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs text-center">
                  <span className="block text-[10px] text-slate-500 font-mono uppercase font-bold tracking-wider">Upcoming Bookings</span>
                  <span className="block text-2xl font-extrabold text-blue-600 mt-1">2</span>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs text-center">
                  <span className="block text-[10px] text-slate-500 font-mono uppercase font-bold tracking-wider">Pending Requests</span>
                  <span className="block text-2xl font-extrabold text-amber-600 mt-1">3</span>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs text-center col-span-2 lg:col-span-1">
                  <span className="block text-[10px] text-slate-500 font-mono uppercase font-bold tracking-wider">Completed Deeds</span>
                  <span className="block text-2xl font-extrabold text-emerald-600 mt-1">5</span>
                </div>
              </div>

              {/* Next Appointment widget & Recent documents list */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Appointment widget (5 columns) */}
                <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">Next Appointment</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Confirmed</span>
                    </div>

                    <div className="mt-4 space-y-3 font-sans text-xs">
                      <div>
                        <span className="text-[10px] text-slate-450 block uppercase font-mono tracking-wider">DATE</span>
                        <span className="text-slate-900 font-bold block text-sm">25 June 2026</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-450 block uppercase font-mono tracking-wider">TIME</span>
                        <span className="text-slate-900 font-bold block text-sm">10:00 AM</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-455 block uppercase font-mono tracking-wider">BRANCH</span>
                        <span className="text-slate-900 font-bold block text-sm flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> Bosaso Main Branch
                        </span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab("appointments")}
                    className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-sans font-bold py-2 px-4 rounded-xl text-xs transition duration-150 flex items-center justify-center gap-1.5"
                  >
                    View Appointment <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Recent documents with Status layout (7 columns) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3.5">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Recent Document Files</span>
                  
                  <div className="space-y-2">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block font-sans">Power of Attorney Authorization</span>
                        <span className="text-[10px] text-slate-400 block font-mono">ID: DOC-2016-00123</span>
                      </div>
                      <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-sans font-bold text-[10px] border border-emerald-150">
                        Completed
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block font-sans">Affidavit of Dual Residency Declaration</span>
                        <span className="text-[10px] text-slate-400 block font-mono">ID: DOC-2026-00124</span>
                      </div>
                      <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-sans font-bold text-[10px] border border-amber-150">
                        Pending Review
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block font-sans">Authorization Letter of Agent Pickup</span>
                        <span className="text-[10px] text-slate-400 block font-mono">ID: DOC-2026-00125</span>
                      </div>
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-sans font-bold text-[10px] border border-blue-150">
                        Ready for Pickup
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab("documents")}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold block pt-1.5 transition"
                  >
                    Manage Document Vault →
                  </button>
                </div>

              </div>

              {/* Notifications teaser & Verification status center */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Mini Notifications */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3.5">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Quick In-App Alerts</span>
                  
                  <div className="space-y-2.5 text-xs text-slate-650 max-h-[160px] overflow-y-auto">
                    {notifications.slice(0, 3).map(n => (
                      <div key={n.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
                        <Bell className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{n.title}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{n.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification Center */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Biometric Verification Center</span>
                  
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <Fingerprint className="w-5 h-5 text-emerald-600 mx-auto" />
                      <span className="block font-bold mt-1 text-[11px] text-slate-900">Fingerprint</span>
                      <span className="block text-[10px] text-emerald-700 font-extrabold mt-0.5 font-sans">Verified ✓</span>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="w-5 h-5 mx-auto bg-emerald-600/10 rounded-full flex items-center justify-center font-bold text-emerald-700 text-[10px]">🖊️</div>
                      <span className="block font-bold mt-1 text-[11px] text-slate-900">Digital Sig</span>
                      <span className="block text-[10px] text-emerald-700 font-extrabold mt-0.5 font-sans">Verified ✓</span>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto" />
                      <span className="block font-bold mt-1 text-[11px] text-slate-900">Identity Doc</span>
                      <span className="block text-[10px] text-emerald-700 font-extrabold mt-0.5 font-sans">Verified ✓</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="text-[9.5px] text-slate-500 font-medium">Your identity status has been audited. E-Verify and blockchain notarization features are fully unlocked.</p>
                  </div>
                </div>

              </div>

              {/* Floating AI Panel Teaser or Direct Chat block */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-5 hover:shadow-lg transition">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono tracking-widest text-blue-200 block uppercase font-bold">VERITAS COGNITIVE ASSISTANT</span>
                    <h3 className="text-base font-extrabold font-sans">Need Quick Legal Answers?</h3>
                    <p className="text-xs text-blue-100 max-w-md">Instantly check power of attorney prerequisites, calculate notary fees, verify booking calendars, or inquire about document status processing.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("support")} 
                    className="bg-white hover:bg-slate-50 text-slate-900 font-sans font-extrabold text-xs px-4 py-2.5 rounded-xl block shrink-0 transition"
                  >
                    Open AI & Support Bot
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* SCREEN 2: APPOINTMENTS MODULE */}
          {activeTab === "appointments" && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Book appointment Interactive Workflow (7 columns) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="pb-3 border-b border-slate-150 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Book New Desk Session</span>
                      <h3 className="text-sm font-bold font-sans text-slate-900 mt-1">Multi-Step Scheduling Wizard</h3>
                    </div>
                    <span className="text-xs text-slate-500 font-mono font-bold">Step {bookingStep} of 6</span>
                  </div>

                  {/* STEP 1: CHOOSE COMPANY */}
                  {bookingStep === 1 && (
                    <div className="space-y-4 pt-1 animate-fadeIn">
                      <label className="block text-xs font-bold text-slate-700">Step 1: Choose Notary Corporation Group</label>
                      <div className="space-y-2">
                        {[
                          { name: "Veritas Notary Bureau LLC", rate: "Highly Rated Desk", iconClass: "🏢" },
                          { name: "Somalia Sovereignty Trust Inc.", rate: "Federal Clearance Bureau", iconClass: "🏛️" },
                          { name: "Chicago Loop Escrow Associates", rate: "Financial Seal Specialist", iconClass: "💼" }
                        ].map(comp => (
                          <div 
                            key={comp.name}
                            onClick={() => { setBookingCompany(comp.name); setBookingStep(2); }}
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                              bookingCompany === comp.name ? "bg-slate-50 border-emerald-500 shadow-sm" : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span className="font-bold flex items-center gap-2 text-slate-800">
                              <span className="text-base">{comp.iconClass}</span>
                              {comp.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">{comp.rate}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STEP 2: CHOOSE BRANCH */}
                  {bookingStep === 2 && (
                    <div className="space-y-4 pt-1">
                      <label className="block text-xs font-bold text-slate-700">Step 2: Select Local Branch Office</label>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto">
                        {branches.map(br => (
                          <div
                            key={br.id}
                            onClick={() => { setBookingBranchId(br.id); setBookingStep(3); }}
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                              bookingBranchId === br.id ? "bg-slate-50 border-emerald-500 shadow-sm" : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div>
                              <span className="font-bold block text-slate-800">{br.name}</span>
                              <span className="text-[10px] text-slate-500 text-slate-400">{br.address}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">{br.phone}</span>
                          </div>
                        ))}
                        {branches.length === 0 && (
                          <div 
                            onClick={() => { setBookingBranchId("br-mock"); setBookingStep(3); }}
                            className="p-3 border border-slate-200 hover:bg-slate-50 cursor-pointer rounded-xl text-xs"
                          >
                            <span>Bosaso Main Branch (Federal District)</span>
                          </div>
                        )}
                      </div>
                      
                      <button onClick={() => setBookingStep(1)} className="text-xs text-slate-500 font-bold hover:underline block">← Go Back</button>
                    </div>
                  )}

                  {/* STEP 3: CHOOSE SERVICE */}
                  {bookingStep === 3 && (
                    <div className="space-y-4 pt-1">
                      <label className="block text-xs font-bold text-slate-700">Step 3: Select Service Category Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Power of Attorney", "Affidavit", "Declaration", "Contract", "Other"].map(serv => (
                          <div
                            key={serv}
                            onClick={() => { setBookingService(serv); setBookingStep(4); }}
                            className={`p-3 rounded-xl border text-center font-bold text-xs cursor-pointer transition ${
                              bookingService === serv ? "bg-slate-50 border-emerald-500 text-slate-900" : "border-slate-200 text-slate-650 hover:bg-slate-50"
                            }`}
                          >
                            {serv}
                          </div>
                        ))}
                      </div>
                      
                      <button onClick={() => setBookingStep(2)} className="text-xs text-slate-500 font-bold hover:underline block pt-2">← Go Back</button>
                    </div>
                  )}

                  {/* STEP 4: CHOOSE DATE */}
                  {bookingStep === 4 && (
                    <div className="space-y-4 pt-1 animate-fadeIn">
                      <label className="block text-xs font-bold text-slate-700">Step 4: Choose Intended Target Date</label>
                      <input 
                        type="date" 
                        value={bookingDate}
                        onChange={(e) => { setBookingDate(e.target.value); setBookingStep(5); }}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs outline-none font-mono"
                      />
                      
                      <button onClick={() => setBookingStep(3)} className="text-xs text-slate-500 font-bold hover:underline block pt-2">← Go Back</button>
                    </div>
                  )}

                  {/* STEP 5: CHOOSE TIME */}
                  {bookingStep === 5 && (
                    <div className="space-y-4 pt-1">
                      <label className="block text-xs font-bold text-slate-700">Step 5: Choose Intended Time Slot</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["09:00 AM", "10:00 AM", "11:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"].map(tme => (
                          <div
                            key={tme}
                            onClick={() => { setBookingTime(tme); setBookingStep(6); }}
                            className={`p-2 rounded-xl border text-center font-mono text-xs cursor-pointer transition ${
                              bookingTime === tme ? "bg-slate-50 border-emerald-500 text-slate-900 font-bold" : "border-slate-200 text-slate-650 hover:bg-slate-50"
                            }`}
                          >
                            {tme}
                          </div>
                        ))}
                      </div>
                      
                      <button onClick={() => setBookingStep(4)} className="text-xs text-slate-500 font-bold hover:underline block pt-2">← Go Back</button>
                    </div>
                  )}

                  {/* STEP 6: CONFIRM DETAILS */}
                  {bookingStep === 6 && (
                    <form onSubmit={handleAddNewApp} className="space-y-4 pt-1 animate-fadeIn">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-250 text-xs space-y-2 font-sans font-semibold text-slate-700">
                        <label className="block font-bold text-slate-800 text-sm">Step 6: Confirm Session Reservation</label>
                        <div className="grid grid-cols-2 gap-2 font-mono text-xs pt-2">
                          <div>Company:</div> <div className="text-slate-900 font-bold text-right">{bookingCompany}</div>
                          <div>Branch:</div> <div className="text-slate-900 font-bold text-right">{branches.find(b => b.id === bookingBranchId)?.name || "Bosaso Main Branch"}</div>
                          <div>Service:</div> <div className="text-slate-950 font-bold text-right">{bookingService}</div>
                          <div>Date Booking:</div> <div className="text-slate-900 font-bold text-right text-emerald-700">{bookingDate}</div>
                          <div>Hour Slot:</div> <div className="text-slate-900 font-bold text-right text-emerald-700">{bookingTime}</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setBookingStep(5)} 
                          className="w-1/3 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 py-2.5 rounded-xl transition"
                        >
                          Modify Parameters
                        </button>
                        <button 
                          type="submit" 
                          className="w-2/3 bg-emerald-600 hover:bg-emerald-550 text-white text-xs font-extrabold py-2.5 rounded-xl transition shadow-sm"
                        >
                          Confirm & Block Session ✓
                        </button>
                      </div>
                    </form>
                  )}

                </div>

                {/* Settle / Manage Existing Appointments (5 columns) */}
                <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">My Booked Sessions</span>
                  
                  <div className="space-y-3 max-h-[340px] overflow-y-auto">
                    {/* Always display the predefined one */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-slate-900 block font-sans">Power of Attorney Certification</span>
                          <span className="text-[10px] text-slate-505 block mt-0.5">Bosaso Main Branch</span>
                        </div>
                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px]">Confirmed</span>
                      </div>
                      
                      <div className="text-emerald-700 font-mono text-xs flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        25 June 2026 @ 10:00 AM
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
                        <button 
                          onClick={() => {
                            const changed = prompt("Enter new intended appointment date & hour text:", "2026-06-25 @ 11:30 AM");
                            if (changed) {
                              alert(`✓ Calendar updated. Reschedule request queued in Veritas system scheduler.`);
                            }
                          }}
                          className="bg-white hover:bg-slate-50 text-[10.5px] text-slate-700 border border-slate-200 font-bold px-2.5 py-1.5 rounded-md transition"
                        >
                          Reschedule
                        </button>
                        <button 
                          onClick={() => {
                            // Non-blocking in-app cancel status indicator
                            alert("Appointment slot canceled successfully. Host notified.");
                          }}
                          className="bg-red-50 text-[10.5px] text-red-700 hover:bg-red-100 font-bold px-2.5 py-1.5 rounded-md transition"
                        >
                          Cancel Appointment
                        </button>
                      </div>
                    </div>

                    {/* Prop-driven appointments */}
                    {appointments.map(app => (
                      <div key={app.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-900 block font-sans">{app.serviceType}</span>
                            <span className="text-[10px] text-slate-500 block">System Recorded Session</span>
                          </div>
                          <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[9px] uppercase">{app.status}</span>
                        </div>
                        
                        <div className="text-blue-600 font-mono text-[11px] mt-2 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {app.appointmentTime}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-[10px] text-emerald-800 italic">
                    💡 Please arrive 15 minutes before your time slot. Have your digital QR ledger code ready in-app for clerk check-in.
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* SCREEN 3: MY DOCUMENTS */}
          {activeTab === "documents" && (
            <div className="space-y-6">
              
              {/* Directory Listing */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Documents table/feed (7 columns) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-150">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Document Ledger Directory</span>
                      <h3 className="text-xs text-slate-500 font-medium">Verify or download legally sealed originals</h3>
                    </div>
                    
                    {/* Enter Code / QR Scan Input */}
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="DOC-2026-..." 
                        value={qrInputCode}
                        onChange={(e) => setQrInputCode(e.target.value)}
                        className="bg-slate-50 border border-slate-200 py-1.5 px-3 text-xs rounded-xl outline-none"
                      />
                      <button 
                        onClick={() => executeQRVerification()}
                        className="bg-emerald-600 text-white font-bold p-1 px-3.5 rounded-xl text-[11px]"
                      >
                        Verify Code
                      </button>
                    </div>
                  </div>

                  {/* Table listing */}
                  <div className="space-y-3">
                    {allDocs.map((doc, idx) => (
                      <div 
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer text-xs flex flex-col justify-start gap-2 ${
                          selectedDoc?.id === doc.id ? "bg-slate-50 border-emerald-600 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-extrabold text-slate-900 block font-sans text-[13px]">{doc.title}</span>
                            <span className="text-[10px] font-mono text-slate-500">ID Serial: DOC-2026-{(1000 + idx)}</span>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-sans font-bold uppercase ${
                            doc.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                            doc.status === "pending-signature" ? "bg-amber-100 text-amber-850" :
                            "bg-blue-100 text-blue-800"
                          }`}>{doc.status}</span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2 font-mono">
                          <span>Created Date: {doc.createdAt}</span>
                          <div className="flex gap-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                alert(`Simulated original PDF document view for ${doc.title}. Seal Hash verified.`);
                              }}
                              className="text-emerald-700 hover:underline px-1 font-sans"
                            >
                              [View]
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                alert(`Executing encrypted download of document file format: PDF`);
                              }}
                              className="text-emerald-700 hover:underline px-1 font-sans"
                            >
                              [Download]
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                alert(`Printing task spooled to default systems printer.`);
                              }}
                              className="text-emerald-700 hover:underline px-1 font-sans"
                            >
                              [Print]
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* QR Verification result box */}
                  {qrVerificationResult.status !== "idle" && (
                    <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                      qrVerificationResult.status === "success" ? "bg-emerald-5 border-emerald-200" : "bg-red-50 border-red-200"
                    }`}>
                      <div className="flex justify-between font-bold text-slate-900 text-xs">
                        <span className="flex items-center gap-1.5">
                          {qrVerificationResult.status === "success" ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          QR LEDGER VERIFICATION RESULT
                        </span>
                        <button onClick={() => setQrVerificationResult({ status: "idle", message: "" })} className="text-slate-400 font-extrabold hover:text-slate-600">×</button>
                      </div>
                      <p className="font-medium text-slate-700">{qrVerificationResult.message}</p>
                      {qrVerificationResult.docTitle && (
                        <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
                          <p>Document: {qrVerificationResult.docTitle}</p>
                          <p>Date Checked: {qrVerificationResult.verifiedAt}</p>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* Tracking Progress & Details of Document (5 columns) */}
                <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Deed Status Tracking</span>

                  {selectedDoc ? (
                    <div className="space-y-4">
                      
                      {/* Interactive Visual Parcel Tracking Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] font-sans font-bold text-slate-700 mb-2">
                          <span>Verification Level Code 100</span>
                          <span className="text-emerald-750 font-mono text-[10.5px]">Step: {getDocumentProgress(selectedDoc.status).step}</span>
                        </div>
                        
                        {/* Progress meter line */}
                        <div className="relative">
                          <div className="w-full bg-slate-100 h-1.5 rounded-full absolute top-2.5 left-0 z-0">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${getDocumentProgress(selectedDoc.status).percent}%` }}></div>
                          </div>
                          
                          <div className="relative z-10 flex justify-between font-bold text-[9.5px]">
                            {[
                              { label: "Submitted", val: 20 },
                              { label: "Under Review", val: 40 },
                              { label: "Verification", val: 60 },
                              { label: "Ready", val: 80 },
                              { label: "Completed", val: 100 }
                            ].map(step => (
                              <div key={step.label} className="flex flex-col items-center">
                                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-mono ${
                                  getDocumentProgress(selectedDoc.status).percent >= step.val 
                                    ? "bg-emerald-500 border-emerald-500 text-white" 
                                    : "bg-white border-slate-200 text-slate-400"
                                }`}>
                                  ✓
                                </span>
                                <span className="block mt-1 text-[8px] text-slate-450 leading-none">{step.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Content Review Area */}
                      <div className="p-3.5 bg-slate-950 text-slate-350 font-mono text-[11px] rounded-xl relative overflow-hidden max-h-56 overflow-y-auto space-y-2 border border-slate-900 leading-relaxed">
                        <span className="text-[9.5px] text-emerald-400 tracking-wider font-extrabold uppercase font-sans border-b border-slate-800 pb-1 block">SECURED ENVELOPE WATERMARK ORIGIN</span>
                        <p className="whitespace-pre-wrap">{selectedDoc.content}</p>
                      </div>

                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-600 font-semibold flex flex-col gap-1">
                        <div className="flex justify-between">
                          <span>Identity Verification:</span>
                          <span className="text-emerald-700 font-bold">Verified ✓</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Digital Signatures:</span>
                          <span className="text-emerald-700 font-bold">Sealed ✓</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Blockchain Serial Hash:</span>
                          <span className="text-emerald-700 font-bold text-[9.5px] truncate max-w-[120px]">{selectedDoc.hash || "Not published"}</span>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl text-center italic text-xs text-slate-400 bg-slate-50">
                      Select a document folder on the left to activate visual status tracking.
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* SCREEN 4: UPLOAD DOCUMENTS */}
          {activeTab === "upload" && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                
                {/* File Uploader Core Widget */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">E-Verify Attachment Center</span>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Upload physical identity licenses, utility bills or contracts to populate your client verification registry. Supported formats: <b>PDF, JPG, PNG</b>.
                  </p>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-semibold">Document Category</label>
                      <select
                        value={targetUploadCategory}
                        onChange={(e) => setTargetUploadCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-800 rounded-xl outline-none"
                      >
                        <option value="National ID">National ID Card</option>
                        <option value="Passport">Passport Data Page</option>
                        <option value="Utility Bill">Utility Bill (Residency verification)</option>
                        <option value="Contract">Contract / Agreement Draft</option>
                        <option value="Supporting Documents">Supporting Legal Papers</option>
                      </select>
                    </div>

                    {/* Drag & Drop Space */}
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={triggerManualFile}
                      className={`py-12 border-2 border-dashed rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 ${
                        isDragging ? "bg-emerald-50 border-emerald-550" : "bg-slate-50 border-slate-205 hover:bg-slate-100/50"
                      }`}
                    >
                      <Upload className="w-8 h-8 text-slate-400" />
                      <span className="block text-xs font-bold text-slate-900">Drag & Drop file original here</span>
                      <span className="block text-[10px] text-slate-500 text-slate-400">or click to choose system files</span>
                      
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="hidden" 
                      />
                    </div>
                  </div>
                </div>

                {/* Uploaded items listing checklist */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Attachment Registry Index</span>
                  
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {uploadedFiles.map(file => (
                      <div key={file.id} className="p-3 bg-slate-100/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-5 h-5 text-slate-500" />
                          <div>
                            <span className="font-bold text-slate-900 block truncate max-w-[170px]">{file.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5 mt-0.5">Type: {file.type} • {file.size}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold px-2 py-0.5 rounded uppercase font-sans">
                            Uploaded ✓
                          </span>
                          <button 
                            onClick={() => deleteUploadedFile(file.id)}
                            className="p-1 hover:bg-slate-200 text-slate-400 hover:text-red-650 rounded text-red-500 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {uploadedFiles.length === 0 && (
                      <div className="py-12 text-center text-xs text-slate-400 italic">
                        No attachment files submitted in current session. Use the left uploader to send items.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* SCREEN 5: PAYMENTS */}
          {activeTab === "payments" && (
            <div className="space-y-6">
              
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-150 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Desk Invoices & Receipts</span>
                    <p className="text-xs text-slate-500 font-medium">Settle fee outstanding logs using online secure gateway options</p>
                  </div>
                  <Smartphone className="w-5 h-5 text-slate-400" />
                </div>

                <div className="space-y-3 pt-1">
                  {allInvoices.map(inv => (
                    <div key={inv.id} className="p-4 bg-slate-50 hover:bg-slate-100/30 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs select-none">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-950 font-sans tracking-tight block text-sm">{inv.invoiceNumber}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-sans font-bold uppercase ${
                            inv.status === "paid" ? "bg-emerald-50 border border-emerald-100 text-emerald-700" : "bg-amber-50 border border-amber-200 text-amber-700"
                          }`}>{inv.status}</span>
                        </div>
                        <p className="text-slate-500 mt-1 text-[11px] font-sans">Verification: Durable Power of Attorney certification</p>
                        <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">Issued Due: {inv.dueDate}</p>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono justify-between sm:justify-end">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-sans">TOTAL DUE</span>
                          <span className="text-slate-900 font-bold font-sans text-sm">${inv.amount.toFixed(2)}</span>
                        </div>

                        {inv.status === "unpaid" ? (
                          <button
                            onClick={() => {
                              onPayInvoice(inv.id);
                              // Sync state locally
                              setLocalInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: "paid" } : i));
                              alert("💸 Simulated stripe payment successful! Settle receipt watermarked on your Veritas balance.");
                            }}
                            className="bg-emerald-600 hover:bg-emerald-550 text-white font-bold py-2 px-4 rounded-xl transition shadow-xs"
                          >
                            Pay Online (Stripe)
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => alert(`Downloaded receipt for invoice transaction ${inv.invoiceNumber}.`)}
                              className="bg-white border border-slate-200 hover:bg-slate-50 text-[10.5px] text-slate-700 font-bold px-2.5 py-1.5 rounded-md transition duration-150 inline-flex items-center gap-1 shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-600" /> Receipt
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[10.5px] text-emerald-800 leading-relaxed italic text-center">
                  🔐 Card processing services are compliant with PCI-DSS data safeguards and encrypted in compliance with SOC-2 guidelines.
                </div>
              </div>

            </div>
          )}

          {/* SCREEN 6: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Channels toggler (5 columns) */}
              <div className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Notification Delivery Channels</span>
                
                <div className="space-y-3 text-xs text-slate-705">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={channelPrefs.inApp}
                      onChange={(e) => setChannelPrefs(prev => ({ ...prev, inApp: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-550"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block font-sans">In-App Notification Stream</span>
                      <span className="text-[10px] text-slate-400 font-medium font-mono">Real-time terminal popups</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={channelPrefs.email}
                      onChange={(e) => setChannelPrefs(prev => ({ ...prev, email: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-555"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block font-sans">Email Transcripts</span>
                      <span className="text-[10px] text-slate-450 font-medium block">Detailed secure PDF links dispatch</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={channelPrefs.whatsapp}
                      onChange={(e) => setChannelPrefs(prev => ({ ...prev, whatsapp: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block font-sans">WhatsApp Business Alert</span>
                      <span className="text-[10px] text-slate-400 block font-mono">Mobile rapid ping check</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={channelPrefs.sms}
                      onChange={(e) => setChannelPrefs(prev => ({ ...prev, sms: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block font-sans">SMS Mobile texts</span>
                      <span className="text-[10px] text-slate-400 block font-mono">Direct system status warnings</span>
                    </div>
                  </label>
                </div>

                <button 
                  onClick={() => alert("✓ Delivery channel parameters updated in database workspace.")}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl text-xs font-bold transition"
                >
                  Save channel preferences
                </button>
              </div>

              {/* Main detailed Notification List (8 columns) */}
              <div className="lg:col-span-8 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Detailed Security Alerts Feed</span>
                
                <div className="space-y-3">
                  {notifications.map(n => (
                    <div key={n.id} className={`p-4 rounded-xl border flex items-start gap-3.5 text-xs ${
                      n.unread ? "bg-slate-50 border-emerald-350 shadow-xs" : "bg-white border-slate-150"
                    }`}>
                      <Bell className={`w-4 h-4 shrink-0 mt-0.5 ${n.unread ? "text-emerald-600" : "text-slate-400"}`} />
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center gap-4">
                          <span className="font-extrabold text-slate-905 block font-sans text-xs">{n.title}</span>
                          <span className="text-[9.5px] text-slate-400 font-mono shrink-0">{n.time}</span>
                        </div>
                        <p className="text-slate-650 leading-relaxed text-[11px]">{n.text}</p>
                        <div className="flex items-center gap-2 pt-1 font-mono text-[9px] text-slate-400">
                          <span>Verified Route: <b>{n.channel}</b></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* SCREEN 7: SUPPORT CENTRE & AI ASSISTANT CHAT */}
          {activeTab === "support" && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Cognitive Assistant direct chatbot & Support Live messages (7 columns) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden min-h-[460px]">
                  
                  {/* Assistant Title header */}
                  <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                      <div>
                        <span className="text-[12px] font-sans font-extrabold block">Cognitive Desk Assistant</span>
                        <span className="text-[8.5px] font-mono text-slate-400 uppercase tracking-widest">Active Gemini Model Engine</span>
                      </div>
                    </div>
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Messages listing pane */}
                  <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[310px] min-h-[290px] bg-slate-50">
                    {aiAssistantChats.map((chat, idx) => (
                      <div key={idx} className={`flex ${chat.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`p-3 max-w-[85%] rounded-2xl text-xs leading-relaxed ${
                          chat.sender === "user" 
                            ? "bg-slate-900 text-white rounded-tr-none" 
                            : "bg-white border border-slate-200 text-slate-800 rounded-tl-none whitespace-pre-wrap shadow-xs"
                        }`}>
                          {chat.text}
                        </div>
                      </div>
                    ))}

                    {aiAssistantLoading && (
                      <div className="flex justify-start">
                        <div className="p-3 bg-white border border-slate-200 text-slate-500 text-xs rounded-2xl rounded-tl-none flex items-center gap-1">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cognitive Assistant thinking...
                        </div>
                      </div>
                    )}
                    <div ref={aiEndRef} />
                  </div>

                  {/* Quick question presets suggestions & input form */}
                  <div className="p-3 border-t border-slate-150 bg-white space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {[
                        "What documents do I need for power of attorney?",
                        "How much does affidavit service cost?",
                        "When is my appointment?",
                        "What is the status of my document?"
                      ].map(preset => (
                        <button
                          key={preset}
                          onClick={() => {
                            setAiAssistantPrompt(preset);
                          }}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg px-2 py-1 text-[10px] text-left transition"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleAIAssistantSubmit} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Inquire or ask AI instantly..." 
                        value={aiAssistantPrompt}
                        onChange={(e) => setAiAssistantPrompt(e.target.value)}
                        className="flex-1 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 px-3 py-2 text-xs rounded-xl outline-none"
                      />
                      <button 
                        type="submit" 
                        className="bg-emerald-600 hover:bg-emerald-550 text-white font-bold p-2 px-4 rounded-xl text-xs transition duration-150 flex items-center gap-1.5"
                      >
                        Ask <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>

                </div>

                {/* Open Ticket Form & Predefined lists (5 columns) */}
                <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden">
                  
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider mb-3">Live Relations Tickets</span>
                    
                    <form onSubmit={handleTicketCreate} className="space-y-3 text-xs mb-4 pb-4 border-b border-slate-150">
                      <div>
                        <input 
                          type="text" 
                          required
                          placeholder="Ticket Subject Topic"
                          value={ticketSubject}
                          onChange={(e) => setTicketSubject(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-250 p-2 text-xs rounded-xl outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select 
                          value={ticketCategory}
                          onChange={(e) => setTicketCategory(e.target.value)}
                          className="bg-slate-50 border border-slate-250 p-2 text-xs rounded-xl outline-none"
                        >
                          <option value="General Question">General Question</option>
                          <option value="Biometric Failure">Biometric Issue</option>
                          <option value="Invoice Query">Invoice Settle Query</option>
                        </select>

                        <select 
                          value={ticketPriority}
                          onChange={(e) => setTicketPriority(e.target.value as any)}
                          className="bg-slate-50 border border-slate-250 p-2 text-xs rounded-xl outline-none font-mono"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                      </div>

                      <button 
                        type="submit"
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs transition"
                      >
                        + Submit Relations Ticket
                      </button>
                    </form>

                    {/* Pre-existing list */}
                    <span className="text-[9px] font-mono text-slate-450 uppercase block font-bold mb-2">My Open Logs</span>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto">
                      {supportTickets.map(ticket => (
                        <div key={ticket.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-900 block truncate max-w-[170px]">{ticket.subject}</span>
                            <span className="text-[10px] text-slate-450 block font-mono">Category: {ticket.category} • Date: {ticket.createdAt}</span>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            ticket.status === "open" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}>{ticket.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-100/50 rounded-xl text-[10px] text-slate-500 leading-relaxed text-center mt-3">
                    ☎️ Phone support hotlines are connected: <b>+252 61 555-0199</b> (Sovereign Bureau desk line hours).
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* SCREEN 8: PROFILE & ENVIRONMENT SECURITY */}
          {activeTab === "profile" && (
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-6">
              
              {/* Profile Welcome Banner of Customer */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-100 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img 
                      src={avatarUrl} 
                      alt="Avatar Profile" 
                      className="w-12 h-12 rounded-full border-2 border-emerald-500 object-cover"
                    />
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div>
                    <div className="text-xs text-emerald-800 font-bold tracking-wider uppercase font-mono">Customer Self-Service</div>
                    <h1 className="text-xl font-sans font-extrabold text-slate-950 leading-tight">Welcome, {customerName}!</h1>
                    <p className="text-xs text-slate-600 mt-0.5">Good Morning • Active Session Authenticated Securely</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 shadow-xs flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="font-mono text-[11px] text-slate-650 font-semibold">Security Protocol ID: <b>2026-F9</b></span>
                  </div>
                  <button 
                    onClick={() => {
                      // Trigger fast notification count read
                      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
                      alert("All in-app alerts marked read.");
                    }}
                    className="p-1 px-3 bg-white border border-slate-200 hover:bg-slate-50 transition rounded-xl text-[11.5px] font-sans font-medium text-slate-700 flex items-center gap-1.5 shadow-xs cursor-pointer select-none"
                  >
                    Clear Alerts <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>
              
              <div className="pb-3 border-b border-slate-150">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Client Registry Particulars</span>
                <p className="text-xs text-slate-500 font-medium">Verify secured coordinates and update active profile tags</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Form fields */}
                <div className="space-y-4 text-xs font-sans">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-semibold">Verified Name</label>
                    <input 
                      type="text" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-900 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-semibold">Registered Primary Phone</label>
                    <input 
                      type="text" 
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-900 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-semibold">Change Password Settings</label>
                    <input 
                      type="password" 
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-900 rounded-xl outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-semibold">Update Avatar URL</label>
                    <input 
                      type="text" 
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-900 rounded-xl outline-none"
                    />
                  </div>

                  <button 
                    onClick={() => alert("✓ Client credentials committed into security enclave database.")}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition duration-150 shadow-xs"
                  >
                    Commit Profile Particulars ✓
                  </button>
                </div>

                {/* Secure Biometric and ID status dashboard cards */}
                <div className="space-y-4">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Secured Key Registry Credentials</span>
                  
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-205 space-y-3 text-xs leading-relaxed font-sans">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="font-bold text-slate-900">Fingerprint status:</span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-150">Verified ✓</span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="font-bold text-slate-900">Digital Signature Status:</span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-150">Verified ✓</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">National ID Identity:</span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-150">Verified ✓</span>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex gap-3 text-xs text-amber-850 leading-relaxed select-none">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900 font-sans">Privacy Guard Advisory</p>
                      <p className="text-[10px] text-slate-650 mt-1">Certified notarized documents *cannot* permanently be processed, adjusted, or eliminated with custom profile controls after notary stamp signatures are committed on the Veritas blockchain ledger.</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div> {/* End Content Column */}

      </div> {/* End Main Grid */}

    </div>
  );
}
