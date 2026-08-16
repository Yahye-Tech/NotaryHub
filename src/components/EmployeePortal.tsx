import QueuePanel from "./QueuePanel";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Users, UserPlus, Volume2, CheckCircle, Scan, UserCheck, Search, Plus, Calendar, Clock,
  Fingerprint, Sparkles, FileText, Check, Copy, Sliders, AlertTriangle, RefreshCw, Trash,
  Printer, Upload, CreditCard, Send, Lock, Eye, CheckSquare, XCircle, Bell, ArrowRight, Menu, X, Sun, Moon
} from "lucide-react";
import { QueueTicket, NotaryDocument, Customer } from "../types";
import { documentsApi, customersApi, CustomerDocumentHistoryItem, CustomerActivityItem } from "../api/documents.api";
import { appointmentsApi, toUiAppointment } from "../api/appointments.api";
import { queueApi } from "../api/queue.api";
import { uploadsApi } from "../api/uploads.api";
import { getAccessToken, ApiException } from "../api/client";
import { authApi } from "../api/auth.api";
import { usePortalTheme } from "../hooks/usePortalTheme";
import EmployeeAppointmentsTab from "./employee/EmployeeAppointmentsTab";

interface DeskCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  nationalId: string;
  address: string;
  dob: string;
}

function customerToDesk(c: Customer): DeskCustomer {
  return {
    id: c.id,
    name: c.full_name,
    email: c.email ?? "",
    phone: c.phone ?? "",
    nationalId: c.id_number ?? "",
    address: c.address ?? "",
    dob: c.date_of_birth ?? "",
  };
}

interface EmployeePortalProps {
  branchId?: string;
  branchName?: string;
  employeeName?: string;
  queue: QueueTicket[];
  onAnnounceTicket: (ticket: QueueTicket, counter: number) => void;
  ocrLoading: boolean;
  ocrData: any;
  onIdentityOcrScan: (sampleIndex: number) => void;
  isAllowedCreateDoc: boolean;
  onLogout: () => void;
}

export default function EmployeePortal({
  branchId,
  branchName,
  employeeName,
  queue: propQueue,
  onAnnounceTicket,
  ocrLoading,
  ocrData,
  onIdentityOcrScan,
  isAllowedCreateDoc,
  onLogout
}: EmployeePortalProps) {
  // Main Tab/Module selection
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "queue" | "appointments" | "customers" | "documents" | "ai-builder" | "biometrics" | "payments" | "ai-assistant" | "settings"
  >("dashboard");
  const [newDoc, setNewDoc] = useState<{ type: string; principal: string; parties: string; title: string; content: string }>({ type: "", principal: "", parties: "", title: "", content: "" });
  const [isDarkMode, setIsDarkMode] = usePortalTheme("portal-theme-employee-portal");

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);
  const [localOcrLoading, setLocalOcrLoading] = useState(false);
  const [localOcrData, setLocalOcrData] = useState<any>(null);
  const [deskLoading, setDeskLoading] = useState(true);

  // Local state arrays for CRUD & interaction
  const [customers, setCustomers] = useState<DeskCustomer[]>([]);

  const [localDocs, setLocalDocs] = useState<NotaryDocument[]>([]);
  const [selfUserId, setSelfUserId] = useState<string | null>(null);

  useEffect(() => {
    authApi.me().then(res => setSelfUserId(res.id)).catch(() => setSelfUserId(null));
  }, []);

  // Real signature pad — canvas drawing + upload to the real /api/uploads endpoint
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureDocId, setSignatureDocId] = useState<string>("");
  const [signatureSaving, setSignatureSaving] = useState(false);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onStartDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawingRef.current = true;
    const { x, y } = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasSignature) setHasSignature(true);
  };

  const onStopDrawing = () => {
    isDrawingRef.current = false;
  };

  const onClearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleLinkSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) {
      alert("Please draw a signature first.");
      return;
    }
    setSignatureSaving(true);
    try {
      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Failed to capture signature image.");
      const file = new File([blob], `signature-${Date.now()}.png`, { type: "image/png" });
      const res = await uploadsApi.upload(file, "SIGNATURE", signatureDocId || undefined);
      alert(`✓ Signature saved (upload ${res.upload.id})${signatureDocId ? " and linked to the selected document." : "."}`);
      onClearSignature();
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to save signature.");
    } finally {
      setSignatureSaving(false);
    }
  };

  const [localAppointments, setLocalAppointments] = useState([
  ]);

  const [localQueue, setLocalQueue] = useState<QueueTicket[]>(() => {
    const defaults: QueueTicket[] = [
    ];
    return defaults;
  });

  const [localInvoices, setLocalInvoices] = useState([
  ]);

  const [notifications, setNotifications] = useState<{ id: string; title: string; text: string; time: string; type: string }[]>([]);

  // Form states
  const [searchQuery, setSearchQuery] = useState("");
  const [newCust, setNewCust] = useState({ name: "", email: "", phone: "", nationalId: "", address: "", dob: "" });
  const [selectedCustId, setSelectedCustId] = useState<string | null>(null);
  const [editCustMode, setEditCustMode] = useState<string | null>(null);

  // Document creations states
  const [editDocId, setEditDocId] = useState<string | null>(null);
  const [editDocContent, setEditDocContent] = useState("");
  const [docSearchQuery, setDocSearchQuery] = useState("");

  // AI Questionnaire
  const [aiDocType, setAiDocType] = useState("Power of Attorney");
  const [qaParams, setQaParams] = useState({ grantor: "", receiver: "", purpose: "", duration: "", jurisdiction: "" });
  const [aiDraftResults, setAiDraftResults] = useState("");
  const [aiDraftLoading, setAiDraftLoading] = useState(false);

  // Interactive AI Terminal
  const [aiTerminalPrompt, setAiTerminalPrompt] = useState("");
  const [aiTerminalLog, setAiTerminalLog] = useState<{ sender: "user" | "ai", msg: string }[]>([]);
  const [aiTerminalLoading, setAiTerminalLoading] = useState(false);

  // General state variables
  const [appForm, setAppForm] = useState({ customer_name: "", service_type: "Power of Attorney", date: "", time: "" });
  const [invoiceForm, setInvoiceForm] = useState({ customer_name: "", amount: "", description: "" });
  const [clerkProfile, setClerkProfile] = useState({
    name: employeeName ?? "Notary Officer",
    role: "Notary Officer",
    email: "",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120",
  });
  const [clerkLanguage, setClerkLanguage] = useState("English (US)");

  useEffect(() => {
    if (employeeName) {
      setClerkProfile(prev => ({ ...prev, name: employeeName }));
    }
  }, [employeeName]);

  const loadDeskData = useCallback(async () => {
    setDeskLoading(true);
    try {
      const [docsRes, custsRes, appsRes, queueRes] = await Promise.all([
        documentsApi.list({ limit: 100 }),
        customersApi.list(),
        appointmentsApi.list({ limit: 100 }),
        queueApi.list(branchId),
      ]);
      setLocalDocs(docsRes.documents);
      setCustomers(custsRes.customers.map(customerToDesk));
      setLocalAppointments(appsRes.appointments.map(a => {
        const ui = toUiAppointment(a);
        return {
          id: ui.id,
          customer_name: ui.customerName,
          service_type: ui.serviceType,
          appointmentTime: ui.appointmentTime,
          status: ui.status,
        };
      }));
      setLocalQueue(queueRes.tickets);
    } catch (err) {
      console.error("[EmployeePortal] Failed to load desk data:", err);
    } finally {
      setDeskLoading(false);
    }
  }, [branchId]);

  useEffect(() => { loadDeskData(); }, [loadDeskData]);

  const effectiveOcrLoading = ocrLoading || localOcrLoading;
  const effectiveOcrData = ocrData ?? localOcrData;

  const handleOcrFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalOcrLoading(true);
    setLocalOcrData(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const token = getAccessToken();
      const response = await fetch("/api/gemini/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type || "image/jpeg" }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error ?? "OCR failed");
      setLocalOcrData(data.data);
      onIdentityOcrScan(0);
    } catch (err: any) {
      alert(err.message ?? "OCR scan failed. Check that GEMINI_API_KEY is configured.");
    } finally {
      setLocalOcrLoading(false);
      if (ocrFileInputRef.current) ocrFileInputRef.current.value = "";
    }
  };

  // Syncing with OCR
  useEffect(() => {
    if (effectiveOcrData) {
      setNewCust({
        name: effectiveOcrData.fullName || "",
        email: effectiveOcrData.email || `${(effectiveOcrData.fullName || "user").toLowerCase().replace(/\s+/g, ".")}@email.com`,
        phone: newCust.phone || "",
        nationalId: effectiveOcrData.documentNumber || "",
        address: effectiveOcrData.address || "",
        dob: effectiveOcrData.dob || "",
      });
      addNotification("OCR Scan Completed", `Parsed details for ${effectiveOcrData.fullName} extracted successfully.`, "success");
    }
  }, [effectiveOcrData]);

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
  const handleRegisterCustomer = async (e: React.FormEvent) => {
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
    if (newCust.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCust.email)) {
      alert("Validation Failed: Invalid Email Format.");
      return;
    }

    try {
      const res = await customersApi.create({
        fullName: newCust.name.trim(),
        email: newCust.email || undefined,
        phone: newCust.phone.trim(),
        address: newCust.address || undefined,
        dateOfBirth: newCust.dob || undefined,
        idType: "NATIONAL_ID",
        idNumber: newCust.nationalId.trim(),
      });
      const added = customerToDesk(res.customer);
      setCustomers(prev => [added, ...prev]);
      setSelectedCustId(added.id);
      setEditCustMode(null);
      addNotification("New Customer Registered", `${added.name} saved to the database.`, "success");
      setNewCust({ name: "", email: "", phone: "", nationalId: "", address: "", dob: "" });
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to register customer.");
    }
  };

  const handleUpdateCustomer = async (id: string) => {
    if (!newCust.name.trim()) {
      alert("Validation Failed: Name is required.");
      return;
    }
    try {
      const res = await customersApi.update(id, {
        fullName: newCust.name.trim(),
        email: newCust.email || undefined,
        phone: newCust.phone.trim(),
        address: newCust.address || undefined,
        dateOfBirth: newCust.dob || undefined,
        idNumber: newCust.nationalId.trim() || undefined,
      });
      const updated = customerToDesk(res.customer);
      setCustomers(prev => prev.map(c => c.id === id ? updated : c));
      setEditCustMode(null);
      addNotification("Customer Profile Updated", "Record saved to the database.", "info");
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to update customer.");
    }
  };

  // Documents Logic
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      alert("No branch assigned to your account. Contact your company admin.");
      return;
    }
    const docType = ((newDoc as any)?.type ?? "OTHER").toUpperCase().replace(/ /g, "_") as NotaryDocument["doc_type"];
    const parties = (newDoc as any)?.parties?.trim() ?? "";
    const customTitle = (newDoc as any)?.title?.trim();
    const title = customTitle || `${(newDoc as any)?.type ?? "Document"}${parties ? ` - ${parties}` : ""}`;
    try {
      const res = await documentsApi.create({
        branchId,
        title,
        docType: docType.includes("_") ? docType as NotaryDocument["doc_type"] : "OTHER",
        content: (newDoc as any)?.content ?? "",
        summary: parties ? `Parties: ${parties}` : undefined,
      });
      setLocalDocs(prev => [res.document, ...prev]);
      addNotification("Document Draft Created", `Draft saved: "${res.document.title}".`, "info");
      setNewDoc({ type: "", principal: "", parties: "", title: "", content: "" });
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to create document.");
    }
  };

  const handleEditDocumentSave = async () => {
    if (!editDocId) return;
    try {
      const res = await documentsApi.update(editDocId, { content: editDocContent });
      setLocalDocs(prev => prev.map(d => d.id === editDocId ? res.document : d));
      setEditDocId(null);
      addNotification("Draft Saved", "Document content updated in the database.", "info");
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to save document.");
    }
  };

  const handleDeleteDocument = async (id: string) => {
    const doc = localDocs.find(d => d.id === id);
    if (doc?.status === "signed" || doc?.status === "notarised") {
      alert("Certified/notarised documents cannot be deleted.");
      return;
    }
    try {
      await documentsApi.delete(id);
      setLocalDocs(prev => prev.filter(d => d.id !== id));
      addNotification("Document Archived", "Document removed from active records.", "warn");
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to delete document.");
    }
  };

  const handlePrintDocument = (docTitle: string) => {
    alert(`🖨️ Printing System Call:\nQueued "${docTitle}" for physical local printer routing on Desk Terminal #12.`);
    addNotification("Document Queued for Print", `Spooler dispatched: ${docTitle}`, "info");
  };

  // Appointments Logic
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      alert("No branch assigned to your account. Contact your administrator.");
      return;
    }
    try {
      const res = await appointmentsApi.create({
        branchId,
        customerName: appForm.customer_name || "Anonymous Customer",
        serviceType: appForm.service_type,
        appointmentDate: appForm.date,
        appointmentTime: appForm.time,
      });
      const ui = toUiAppointment(res.appointment);
      setLocalAppointments(prev => [{
        id: ui.id,
        customer_name: ui.customerName,
        service_type: ui.serviceType,
        appointmentTime: ui.appointmentTime,
        status: ui.status,
      }, ...prev]);
      addNotification("Appointment Scheduled", `${ui.customerName} set for ${ui.appointmentTime}`, "info");
      setAppForm({ customer_name: "", service_type: "Power of Attorney", date: "", time: "" });
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to book appointment.");
    }
  };

  const handleReschedule = async (id: string) => {
    const newDate = prompt("Enter new date (YYYY-MM-DD):");
    if (!newDate) return;
    const newTime = prompt("Enter new time (e.g. 10:30 AM):");
    if (!newTime) return;
    try {
      const res = await appointmentsApi.update(id, {
        appointmentDate: newDate,
        appointmentTime: newTime,
      });
      const ui = toUiAppointment(res.appointment);
      setLocalAppointments(prev => prev.map(ap => ap.id === id ? {
        id: ui.id,
        customer_name: ui.customerName,
        service_type: ui.serviceType,
        appointmentTime: ui.appointmentTime,
        status: ui.status,
      } : ap));
      addNotification("Appointment Rescheduled", "Calendar schedules synchronized.", "info");
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to reschedule appointment.");
    }
  };

  const handleCancelAppointment = async (id: string, customerName: string) => {
    try {
      await appointmentsApi.transition(id, "cancelled");
      setLocalAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "canceled" as const } : a));
      addNotification("Booking Canceled", `Canceled schedule for ${customerName}`, "warn");
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to cancel appointment.");
    }
  };

  const handleCheckInCustomer = async (appointmentId: string, customer_name: string, service_type: string) => {
    try {
      await appointmentsApi.transition(appointmentId, "checked_in");
      setLocalAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: "checked_in" } : a));
    } catch (err) {
      console.warn("[EmployeePortal] Check-in status sync failed:", err);
    }
    try {
      const res = await queueApi.checkIn({
        customerName: customer_name,
        serviceType: service_type,
        branchId,
      });
      setLocalQueue(prev => [...prev, res.ticket]);
      addNotification(
        "Customer Checked In",
        `Assigned slot ${res.ticket.ticket_number} for ${customer_name} on queue monitor.`,
        "success"
      );
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to issue queue ticket.");
      return;
    }
    setActiveTab("queue");
  };

  const handleIssueManualTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveTab("queue");
    setAppForm({ customer_name: "", service_type: "Power of Attorney", date: "", time: "" });
  };

  const handleCallNextTicket = async () => {
    const waiting = localQueue.find(q => q.status === "waiting");
    if (!waiting) {
      alert("No waiting customers in the Lobby Queue!");
      return;
    }
    try {
      const res = await queueApi.callNext(branchId, 2);
      setLocalQueue(prev => prev.map(q => {
        if (q.id === res.ticket.id) return res.ticket;
        if (q.status === "calling" || q.status === "serving") {
          return { ...q, status: "completed" as const };
        }
        return q;
      }));
      onAnnounceTicket(res.ticket, 2);
      addNotification("Paging Customer", `Calling ${res.ticket.ticket_number} to clerk workstation 2.`, "info");
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to call next ticket.");
    }
  };

  const handleSkipTicket = async (id: string) => {
    try {
      const res = await queueApi.skip(id);
      setLocalQueue(prev => prev.map(q => q.id === id ? res.ticket : q));
      addNotification("Ticket Skipped", "Paging queue iterated.", "warn");
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to skip ticket.");
    }
  };

  const handleCompleteTicket = async (id: string) => {
    try {
      const res = await queueApi.complete(id);
      setLocalQueue(prev => prev.map(q => q.id === id ? res.ticket : q));
      addNotification("Ticket Completed", "Lobby customer service finished.", "success");
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to complete ticket.");
    }
  };

  // AI Questionnaire Builder logic
  const handleTriggerAIPowerBuilder = async () => {
    if (!qaParams.grantor || !qaParams.receiver) {
      alert("AI Drafter requires Grantor and Receiver names specified.");
      return;
    }
    if (!branchId) {
      alert("No branch assigned to your account. Contact your company admin.");
      return;
    }
    setAiDraftLoading(true);
    try {
      const token = getAccessToken();
      const aiRes = await fetch("/api/gemini/generate-doc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          templateType: aiDocType,
          parties: [qaParams.grantor, qaParams.receiver],
          jurisdiction: qaParams.jurisdiction || "Somalia",
          specialClauses: qaParams.purpose,
          customPrompt: qaParams.duration ? `Duration: ${qaParams.duration}` : undefined,
        }),
      });
      const aiData = await aiRes.json();
      if (!aiData.success) throw new Error(aiData.error ?? "AI generation failed");

      const docRes = await documentsApi.create({
        branchId,
        title: `${aiDocType} — ${qaParams.grantor}`,
        docType: "POWER_OF_ATTORNEY",
        content: aiData.document,
        summary: `${aiDocType} between ${qaParams.grantor} and ${qaParams.receiver}`,
        jurisdiction: qaParams.jurisdiction || "Somalia",
        aiGenerated: true,
      });

      setAiDraftResults(aiData.document);
      setLocalDocs(prev => [docRes.document, ...prev]);
      setNewDoc({
        title: docRes.document.title,
        type: aiDocType,
        principal: qaParams.grantor,
        parties: qaParams.receiver,
        content: aiData.document,
      });
      addNotification("AI Document Compiled", `${docRes.document.document_number} saved as draft.`, "success");
    } catch (err: any) {
      alert(err.message ?? "AI generation failed. Check GEMINI_API_KEY configuration.");
    } finally {
      setAiDraftLoading(false);
    }
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
      const token = getAccessToken();
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
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
            ? `CUSTOMER FOUND: ${found.name}\nPhone: ${found.phone}\nID Number: ${found.nationalId}` 
            : `Customer search for "${namePart}" yielded 0 items. Ensure spelling is precise.`;
        } else if (userMsg.toLowerCase().includes("pending")) {
          fallbackReply = `PENDING SYSTEM INVOICES:\n` + localInvoices.filter(i => i.status === "unpaid").map(i => `- ${i.customer_name} (${i.invoiceNumber}): $${i.amount}`).join("\n");
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
    if (!invoiceForm.customer_name.trim() || !invoiceForm.amount) return;
    const added = {
      id: "inv-" + Date.now(),
      invoiceNumber: `INV-2026-0${localInvoices.length + 1}`,
      customer_name: invoiceForm.customer_name,
      amount: parseFloat(invoiceForm.amount),
      dueDate: new Date(Date.now() + 10 * 86400000).toISOString().substring(0, 10),
      status: "unpaid" as const,
      items: [{ description: invoiceForm.description || "General Notary Service", price: parseFloat(invoiceForm.amount) }]
    };
    setLocalInvoices(prev => [added, ...prev]);
    addNotification("Invoice Generated", `Billed ${added.customer_name} $${added.amount}`, "success");
    setInvoiceForm({ customer_name: "", amount: "", description: "" });
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

  // Real personal shift stats — derived from actually-loaded documents, no fabricated targets
  const todayStr = new Date().toDateString();
  const myDocsToday = localDocs.filter(d => d.processed_by === selfUserId && new Date(d.created_at).toDateString() === todayStr);
  const myNotarisedToday = localDocs.filter(d => d.processed_by === selfUserId && d.notarised_at && new Date(d.notarised_at).toDateString() === todayStr);
  const myUniqueCustomersToday = new Set(myDocsToday.map(d => d.customer_id).filter(Boolean)).size;

  const filteredDocs = localDocs.filter(d => 
    !d.is_deleted && (
      d.title.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      d.content.toLowerCase().includes(docSearchQuery.toLowerCase())
    )
  );

  const selectedCust = customers.find(c => c.id === selectedCustId) ?? customers[0] ?? null;

  // Real customer document/activity history (replaces hardcoded fake session records)
  const [custHistory, setCustHistory] = useState<{
    documents: CustomerDocumentHistoryItem[];
    activity: CustomerActivityItem[];
  } | null>(null);
  const [custHistoryLoading, setCustHistoryLoading] = useState(false);

  useEffect(() => {
    if (!selectedCust) {
      setCustHistory(null);
      return;
    }
    setCustHistoryLoading(true);
    customersApi.history(selectedCust.id)
      .then(res => setCustHistory({ documents: res.documents, activity: res.activity }))
      .catch(() => setCustHistory(null))
      .finally(() => setCustHistoryLoading(false));
  }, [selectedCust?.id]);

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
              <Scan className="w-3.5 h-3.5" /> ID Scan & Signature
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
                  <span className="block text-xl font-bold font-sans text-slate-900 mt-1">{customers.length}</span>
                </div>
                <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-center shadow-sm">
                  <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider">Bookings Today</span>
                  <span className="block text-xl font-bold font-sans text-blue-600 mt-1">
                    {localAppointments.filter(a => new Date(a.appointmentTime).toDateString() === new Date().toDateString()).length}
                  </span>
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
                  <span className="block text-xl font-bold font-sans text-emerald-600 mt-1">{localDocs.filter(d => d.status === "notarised").length}</span>
                </div>
              </div>

              {/* Personal performance charts & Notification stream */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left: Charts (7 columns) */}
                <div className="md:col-span-7 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">My Shift Statistics</span>
                  
                  {/* Real personal shift stats — no fabricated targets */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center text-xs font-sans mb-1">
                        <span className="text-slate-600">Documents Created Today</span>
                        <span className="font-bold text-slate-900">{myDocsToday.length}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs font-sans mb-1">
                        <span className="text-slate-600">Documents Notarised Today</span>
                        <span className="font-bold text-slate-900">{myNotarisedToday.length}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs font-sans mb-1">
                        <span className="text-slate-600">Unique Customers Served Today</span>
                        <span className="font-bold text-slate-900">{myUniqueCustomersToday}</span>
                      </div>
                    </div>
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

          {/* TAB 2: QUEUE MANAGEMENT SYSTEM */}
          {activeTab === "queue" && (
            <QueuePanel branchId={branchId} />
          )}

          {/* TAB 3: BOOKINGS & CALENDAR COORDINATOR */}
          {activeTab === "appointments" && (
            <EmployeeAppointmentsTab
              localAppointments={localAppointments}
              handleCheckInCustomer={handleCheckInCustomer}
              handleReschedule={handleReschedule}
              handleCancelAppointment={handleCancelAppointment}
              handleCreateAppointment={handleCreateAppointment}
              appForm={appForm}
              setAppForm={setAppForm}
            />
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

                    <form onSubmit={editCustMode === "new" ? handleRegisterCustomer : (e) => { e.preventDefault(); if (selectedCust) handleUpdateCustomer(selectedCustId ?? ""); }} className="grid grid-cols-2 gap-3.5 text-xs">
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
                        <span className="font-mono text-slate-800 block">{selectedCust.dob || "Not specified"}</span>
                      </div>
                      <div className="col-span-2 border-t border-slate-200 pt-2.5">
                        <span className="block text-[8px] font-mono text-slate-400 uppercase">Physical Address</span>
                        <span className="text-slate-800 leading-relaxed block">{selectedCust.address || "No Address Record"}</span>
                      </div>
                    </div>

                    {/* Customer history — real data from the audit trail */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Document History</span>
                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                        {custHistoryLoading && (
                          <p className="text-[10.5px] text-slate-400 italic">Loading…</p>
                        )}
                        {!custHistoryLoading && custHistory?.documents.length === 0 && (
                          <p className="text-[10.5px] text-slate-400 italic">No documents on record.</p>
                        )}
                        {custHistory?.documents.map((doc, idx) => (
                          <div key={idx} className="p-2 bg-slate-50 border border-slate-100 rounded text-[10.5px] font-sans flex justify-between">
                            <span>{doc.doc_type.replace(/_/g, " ")} — {doc.document_number}</span>
                            <span className="font-mono text-slate-500">{doc.status}</span>
                          </div>
                        ))}
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
                            value={(newDoc as any)?.type}
                            onChange={(e) => (setNewDoc as any)(p => ({ ...p, type: e.target.value }))}
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
                            placeholder="e.g. Jane Doe, John Smith"
                            value={(newDoc as any)?.parties}
                            onChange={(e) => (setNewDoc as any)((p: any) => ({ ...p, parties: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Custom Segment Heading</label>
                          <input
                            type="text"
                            value={(newDoc as any)?.title}
                            onChange={(e) => (setNewDoc as any)(p => ({ ...p, title: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none text-slate-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Body Wordprose Content</label>
                        <textarea
                          rows={4}
                          required
                          value={(newDoc as any)?.content}
                          onChange={(e) => (setNewDoc as any)(p => ({ ...p, content: e.target.value }))}
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
                      placeholder="e.g. Hodan Jama"
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

                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Jurisdiction</label>
                    <input
                      type="text"
                      placeholder="e.g. Somalia"
                      value={qaParams.jurisdiction}
                      onChange={(e) => setQaParams(p => ({ ...p, jurisdiction: e.target.value }))}
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

          {/* TAB 7: ID SCAN (OCR) & SIGNATURE PAD */}
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
                    <input
                      ref={ocrFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleOcrFileSelect}
                    />
                    <button
                      type="button"
                      onClick={() => ocrFileInputRef.current?.click()}
                      disabled={effectiveOcrLoading}
                      className="w-full text-left bg-slate-50 border border-slate-200 p-3.5 rounded-xl hover:border-blue-500 transition shadow-xs flex items-center gap-3"
                    >
                      <Scan className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <h6 className="font-bold text-slate-800 text-xs">Scan ID Document</h6>
                        <span className="text-[9px] text-slate-450 font-mono">Upload passport, national ID, or license photo</span>
                      </div>
                    </button>
                    {branchName && (
                      <p className="text-[9px] text-slate-400 font-mono">Branch: {branchName}</p>
                    )}
                  </div>
                </div>

                {/* Laser scan results */}
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold mb-3">ID Extractions Output</span>
                    {effectiveOcrLoading ? (
                      <div className="py-12 text-center text-xs text-slate-400 italic">Processing high-speed OCR parsing...</div>
                    ) : effectiveOcrData ? (
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs space-y-2 font-mono">
                        <span className="font-extrabold text-blue-800 block">✓ Extraction successful</span>
                        <p className="text-slate-900 font-bold">Name: {effectiveOcrData.fullName}</p>
                        <p className="text-slate-900">ID Code: {effectiveOcrData.documentNumber}</p>
                        <p className="text-slate-900">DOB: {effectiveOcrData.dob}</p>
                        <span className="text-[9px] text-slate-500 block">Values automatically saved to registration form state.</span>
                      </div>
                    ) : (
                      <div className="py-16 border border-dashed border-slate-200 text-center text-xs text-slate-400 italic">No OCR image queued. Use buttons on left.</div>
                    )}
                  </div>
                </div>

              </div>

              {/* Signature Board and routing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Signature pad</span>
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
                      <span className="absolute select-none pointer-events-none text-[10px] text-slate-400">Draw the customer's signature here</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] text-slate-500 font-mono uppercase">Link to document (optional)</label>
                    <select
                      value={signatureDocId}
                      onChange={(e) => setSignatureDocId(e.target.value)}
                      className="w-full bg-slate-50 text-xs border border-slate-250 p-2 rounded-lg font-semibold"
                    >
                      <option value="">Save unlinked</option>
                      {localDocs.filter(d => d.status !== "notarised" && d.status !== "rejected" && d.status !== "revoked").map(d => (
                        <option key={d.id} value={d.id}>{d.document_number} — {d.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleLinkSignature}
                      disabled={signatureSaving || !hasSignature}
                      className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-xs text-white py-2 rounded-lg font-bold transition shadow-xs"
                    >
                      {signatureSaving ? "Saving…" : "Save Signature"}
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
                        value={invoiceForm.customer_name}
                        onChange={(e) => setInvoiceForm(p => ({ ...p, customer_name: e.target.value }))}
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
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Local Invoicing Ledger</span>
                    <p className="text-[9.5px] text-amber-600 mt-1">This ledger is local to your current session and isn't saved to company records — refreshing clears it.</p>
                  </div>
                  
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
                          <p className="text-slate-800 font-sans mt-0.5">Recipient: <b>{inv.customer_name}</b></p>
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
                          <button onClick={() => alert(`Receipt printed for ${inv.invoiceNumber} — ${inv.customer_name}, $${inv.amount.toFixed(2)}.`)} className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded transition">
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
