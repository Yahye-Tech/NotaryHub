import React, { useState, useEffect, useCallback } from "react";
import {
  FileText, Search, Sparkles, Wand2, Plus,
  ShieldAlert, Lock, RefreshCw, CheckCircle2,
  FileCheck, ArrowDownToLine, History, AlertTriangle,
  RotateCcw, Trash2, ArrowRight, User, X,
  ChevronRight, Loader2, AlertCircle
} from "lucide-react";
import { NotaryDocument, Customer } from "../../types";
import { documentsApi, customersApi } from "../../api/documents.api";
import { Modal, CustomerForm, type CustomerFormData } from "../FormComponents";
import { ApiException } from "../../api/client";

// ── Status display helpers ────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", pending_review: "Pending Review", approved: "Approved",
  signed: "Signed", notarised: "Notarised", rejected: "Rejected",
  expired: "Expired", revoked: "Revoked",
};

const STATUS_COLORS: Record<string, string> = {
  notarised:      "bg-emerald-50 text-emerald-700 border border-emerald-200",
  approved:       "bg-blue-50 text-blue-700 border border-blue-200",
  signed:         "bg-indigo-50 text-indigo-700 border border-indigo-200",
  pending_review: "bg-amber-50 text-amber-700 border border-amber-200",
  rejected:       "bg-rose-50 text-rose-700 border border-rose-200",
  revoked:        "bg-rose-100 text-rose-800 border border-rose-300",
  draft:          "bg-slate-100 text-slate-600",
  expired:        "bg-slate-200 text-slate-500",
};

// Next valid transitions the UI exposes per current status
const NEXT_ACTIONS: Record<string, { label: string; status: string; color: string }[]> = {
  draft:          [{ label: "Submit for Review", status: "pending_review", color: "blue" }, { label: "Reject", status: "rejected", color: "rose" }],
  pending_review: [{ label: "Approve", status: "approved", color: "emerald" }, { label: "Reject", status: "rejected", color: "rose" }],
  approved:       [{ label: "Mark Signed", status: "signed", color: "indigo" }, { label: "Reject", status: "rejected", color: "rose" }],
  signed:         [{ label: "Notarise & Seal", status: "notarised", color: "emerald" }],
  rejected:       [{ label: "Reopen as Draft", status: "draft", color: "slate" }],
  notarised:      [],
  expired:        [],
  revoked:        [],
};

interface Props {
  branches?: { id: string; name: string }[];
  userRole?: string;
}

export default function CompanyAdminDocuments({ branches = [], userRole = "COMPANY_ADMIN" }: Props) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [documents, setDocuments]   = useState<NotaryDocument[]>([]);
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const [searchTerm, setSearchTerm]         = useState("");
  const [filterStatus, setFilterStatus]     = useState("all");
  const [selectedDoc, setSelectedDoc]       = useState<NotaryDocument | null>(null);
  const [docTab, setDocTab]                 = useState<"content" | "history" | "edit">("content");

  // Edit state
  const [editTitle, setEditTitle]     = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editJuris, setEditJuris]     = useState("");
  const [saving, setSaving]           = useState(false);

  // Transition state
  const [transitioning, setTransitioning]         = useState(false);
  const [showRejectModal, setShowRejectModal]      = useState(false);
  const [rejectionReason, setRejectionReason]      = useState("");
  const [pendingTransition, setPendingTransition]  = useState<string | null>(null);

  // AI generator
  const [showCreator, setShowCreator]   = useState(false);
  const [aiLoading, setAiLoading]       = useState(false);
  const [templateType, setTemplateType] = useState("Power of Attorney");
  const [grantor, setGrantor]           = useState("");
  const [receiver, setReceiver]         = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [clauses, setClauses]           = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  // Customer modal
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // New document modal
  const [showNewDoc, setShowNewDoc]   = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocType, setNewDocType]   = useState<NotaryDocument["doc_type"]>("POWER_OF_ATTORNEY");
  const [newDocBranch, setNewDocBranch] = useState(branches[0]?.id ?? "");
  const [newDocCustomer, setNewDocCustomer] = useState("");
  const [newDocJuris, setNewDocJuris] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [creatingDoc, setCreatingDoc] = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [docsRes, custsRes] = await Promise.all([
        documentsApi.list({ limit: 100 }),
        customersApi.list(),
      ]);
      setDocuments(docsRes.documents);
      setCustomers(custsRes.customers);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  useEffect(() => {
    if (selectedDoc) {
      setEditTitle(selectedDoc.title);
      setEditContent(selectedDoc.content ?? "");
      setEditSummary(selectedDoc.summary ?? "");
      setEditJuris(selectedDoc.jurisdiction ?? "");
      setDocTab("content");
    }
  }, [selectedDoc?.id]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filteredDocs = documents.filter(d => {
    if (d.is_deleted) return false;
    const matchSearch = !searchTerm ||
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((d as any).customer_name ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "all" || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocBranch) { alert("Please select a branch."); return; }
    setCreatingDoc(true);
    try {
      const res = await documentsApi.create({
        branchId: newDocBranch,
        title: newDocTitle,
        docType: newDocType,
        content: newDocContent || undefined,
        jurisdiction: newDocJuris || undefined,
        customerId: newDocCustomer || undefined,
      });
      setDocuments(prev => [res.document, ...prev]);
      setSelectedDoc(res.document);
      setShowNewDoc(false);
      setNewDocTitle(""); setNewDocContent(""); setNewDocJuris("");
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to create document");
    } finally {
      setCreatingDoc(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      const res = await documentsApi.update(selectedDoc.id, {
        title: editTitle, content: editContent,
        summary: editSummary, jurisdiction: editJuris,
      });
      setDocuments(prev => prev.map(d => d.id === res.document.id ? res.document : d));
      setSelectedDoc(res.document);
      setDocTab("content");
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleTransition = async (newStatus: string) => {
    if (!selectedDoc) return;
    if (newStatus === "rejected") {
      setPendingTransition(newStatus);
      setShowRejectModal(true);
      return;
    }
    setTransitioning(true);
    try {
      const res = await documentsApi.transition(
        selectedDoc.id,
        newStatus as NotaryDocument["status"]
      );
      setDocuments(prev => prev.map(d => d.id === res.document.id ? res.document : d));
      setSelectedDoc(res.document);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Transition failed");
    } finally {
      setTransitioning(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedDoc || !pendingTransition) return;
    if (!rejectionReason.trim()) { alert("Rejection reason required."); return; }
    setTransitioning(true);
    try {
      const res = await documentsApi.transition(
        selectedDoc.id,
        "rejected",
        rejectionReason
      );
      setDocuments(prev => prev.map(d => d.id === res.document.id ? res.document : d));
      setSelectedDoc(res.document);
      setShowRejectModal(false);
      setRejectionReason("");
      setPendingTransition(null);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Rejection failed");
    } finally {
      setTransitioning(false);
    }
  };

  const handleDelete = async (doc: NotaryDocument) => {
    if (["notarised", "signed"].includes(doc.status)) {
      alert("Notarised and signed documents are permanently protected and cannot be deleted.");
      return;
    }
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await documentsApi.delete(doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      if (selectedDoc?.id === doc.id) setSelectedDoc(null);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Delete failed");
    }
  };

  const handleAiDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantor || !receiver) { alert("Grantor and Receiver are required."); return; }
    if (!newDocBranch && branches.length === 0) { alert("No branch available. Create a branch first."); return; }
    setAiLoading(true);
    try {
      const aiRes = await fetch("/api/gemini/generate-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          templateType, parties: [grantor, receiver],
          jurisdiction, specialClauses: clauses,
        }),
      });
      const aiData = await aiRes.json();
      if (!aiData.success) throw new Error(aiData.error ?? "AI generation failed");

      // Save to DB immediately as a real draft
      const docRes = await documentsApi.create({
        branchId: branches[0]?.id ?? newDocBranch,
        title: `${templateType} — ${grantor}`,
        docType: "POWER_OF_ATTORNEY",
        content: aiData.document,
        summary: `${templateType} between ${grantor} and ${receiver}`,
        jurisdiction,
        customerId: selectedCustomerId || undefined,
        aiGenerated: true,
      });
      setDocuments(prev => [docRes.document, ...prev]);
      setSelectedDoc(docRes.document);
      setShowCreator(false);
      setGrantor(""); setReceiver(""); setClauses("");
    } catch (err: any) {
      alert(err.message ?? "AI generation failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddCustomer = async (data: CustomerFormData) => {
    const res = await customersApi.create({
      fullName: data.fullName, email: data.email, phone: data.phone,
      dateOfBirth: data.dateOfBirth, nationality: data.nationality,
      address: data.address, city: data.city, country: data.country,
      idType: data.idType as any, idNumber: data.idNumber,
      idIssueDate: data.idIssueDate, idExpiryDate: data.idExpiryDate,
      idIssuingAuthority: data.idIssuingAuthority, notes: data.notes,
    });
    setCustomers(prev => [...prev, res.customer]);
    setShowAddCustomer(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        <span className="text-sm">Loading documents…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm p-4 rounded-xl">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Failed to load</p>
          <p className="text-xs mt-0.5">{error}</p>
          <button onClick={loadDocuments} className="text-xs mt-2 font-semibold underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by title, doc number, or customer…"
            className="w-full bg-white border border-slate-200 pl-9 pr-4 py-2 text-xs rounded-lg outline-none" />
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-200 text-xs rounded-lg px-3 py-2 outline-none">
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button onClick={() => setShowAddCustomer(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition">
            <User className="w-3.5 h-3.5" /> Add Customer
          </button>
          <button onClick={() => setShowNewDoc(true)}
            className="bg-slate-900 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition">
            <Plus className="w-3.5 h-3.5" /> New Document
          </button>
          <button onClick={() => setShowCreator(!showCreator)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition">
            <Sparkles className="w-3.5 h-3.5" /> AI Generate
          </button>
        </div>
      </div>

      {/* AI Creator */}
      {showCreator && (
        <div className="bg-indigo-50/60 border border-indigo-200 p-5 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase tracking-widest flex items-center gap-1">
              <Wand2 className="w-3.5 h-3.5" /> Veritas AI Document Generator
            </span>
            <button onClick={() => setShowCreator(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleAiDraft} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Template</label>
              <select value={templateType} onChange={e => setTemplateType(e.target.value)}
                className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none text-xs">
                <option>Power of Attorney</option>
                <option>Affidavit</option>
                <option>Declaration</option>
                <option>Authorization Letter</option>
                <option>Contract</option>
                <option>Agreement</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Customer</label>
              <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}
                className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none text-xs">
                <option value="">— No customer linked —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Grantor *</label>
              <input required value={grantor} onChange={e => setGrantor(e.target.value)}
                placeholder="Principal party name"
                className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Receiver / Proxy *</label>
              <input required value={receiver} onChange={e => setReceiver(e.target.value)}
                placeholder="Attorney-in-fact"
                className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Jurisdiction</label>
              <input value={jurisdiction} onChange={e => setJurisdiction(e.target.value)}
                placeholder="Puntland Bureau, Bosaso"
                className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Special Clauses</label>
              <input value={clauses} onChange={e => setClauses(e.target.value)}
                placeholder="Specific terms, limitations…"
                className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none text-xs" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowCreator(false)}
                className="px-4 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={aiLoading}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs px-5 py-2 rounded-lg flex items-center gap-1.5 transition">
                {aiLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Drafting…</>
                           : <><Sparkles className="w-3.5 h-3.5" /> Draft & Save</>}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Document list */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {filteredDocs.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs italic">
                {documents.length === 0
                  ? "No documents yet. Create one manually or use AI Generator."
                  : "No documents match your search."}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredDocs.map(doc => (
                  <div key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-4 cursor-pointer hover:bg-slate-50 transition flex justify-between items-start gap-3 ${
                      selectedDoc?.id === doc.id ? "bg-blue-50/40 border-l-2 border-l-blue-500" : ""
                    }`}>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        {doc.title}
                      </h4>
                      {(doc as any).customer_name && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          <User className="w-3 h-3 inline mr-0.5" />
                          {(doc as any).customer_name}
                        </p>
                      )}
                      <div className="flex gap-2 text-[10px] font-mono text-slate-400 mt-1">
                        <span>{doc.document_number}</span>
                        <span>·</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        {doc.ai_generated && <span className="text-indigo-500">· AI</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase whitespace-nowrap ${STATUS_COLORS[doc.status] ?? ""}`}>
                        {STATUS_LABELS[doc.status]}
                      </span>
                      {doc.seal_code && (
                        <span className="text-[9px] font-mono text-emerald-600">
                          🔏 Sealed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Document viewer */}
        {selectedDoc ? (
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">

            {/* Header */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${STATUS_COLORS[selectedDoc.status]}`}>
                      {STATUS_LABELS[selectedDoc.status]}
                    </span>
                    {selectedDoc.ai_generated && (
                      <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                        AI Generated
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedDoc.title}</h3>
                  <div className="flex gap-3 text-[10px] text-slate-400 font-mono mt-0.5">
                    <span>{selectedDoc.document_number}</span>
                    {selectedDoc.seal_code && (
                      <span className="text-emerald-600 font-bold">SEAL: {selectedDoc.seal_code}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleDelete(selectedDoc)}
                    title="Delete"
                    className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition">
                    {["notarised","signed"].includes(selectedDoc.status)
                      ? <Lock className="w-4 h-4" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                  <button onClick={loadDocuments} title="Refresh"
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Workflow actions */}
              {NEXT_ACTIONS[selectedDoc.status]?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {NEXT_ACTIONS[selectedDoc.status].map(action => (
                    <button
                      key={action.status}
                      onClick={() => handleTransition(action.status)}
                      disabled={transitioning}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50 ${
                        action.color === "emerald"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : action.color === "rose"
                          ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                          : action.color === "indigo"
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                          : action.color === "blue"
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}>
                      {transitioning
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <ChevronRight className="w-3.5 h-3.5" />}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}

              {selectedDoc.status === "notarised" && (
                <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Notarised on {selectedDoc.notarised_at
                      ? new Date(selectedDoc.notarised_at).toLocaleDateString()
                      : "—"} · Seal: {selectedDoc.seal_code}
                  </span>
                </div>
              )}

              {selectedDoc.status === "rejected" && selectedDoc.rejection_reason && (
                <div className="mt-3 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Rejected: {selectedDoc.rejection_reason}</span>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-4">
              {(["content", "edit", "history"] as const).map(tab => (
                <button key={tab} onClick={() => setDocTab(tab)}
                  className={`px-3 py-2.5 text-[11px] font-bold border-b-2 -mb-px transition capitalize ${
                    docTab === tab
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}>
                  {tab === "content" ? "Document Content"
                   : tab === "edit" ? "Edit"
                   : "Info"}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-4 flex-1 overflow-y-auto max-h-96">
              {docTab === "content" && (
                <div className="text-xs leading-relaxed whitespace-pre-wrap text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 min-h-40">
                  {selectedDoc.content || <span className="italic text-slate-400">No content. Switch to Edit tab to add content.</span>}
                </div>
              )}

              {docTab === "edit" && (
                <div className="space-y-3">
                  {["notarised","signed"].includes(selectedDoc.status) ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <Lock className="w-4 h-4" />
                      This document is locked and cannot be edited.
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Title</label>
                        <input type="text" value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white p-2.5 text-xs rounded-lg outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Jurisdiction</label>
                        <input type="text" value={editJuris}
                          onChange={e => setEditJuris(e.target.value)}
                          placeholder="e.g. Puntland Notary Bureau"
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white p-2.5 text-xs rounded-lg outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Content</label>
                        <textarea rows={8} value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white p-2.5 text-xs rounded-lg outline-none resize-none" />
                      </div>
                      <div className="flex justify-end">
                        <button onClick={handleSaveEdit} disabled={saving}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition">
                          {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                                  : <><CheckCircle2 className="w-3.5 h-3.5" /> Save Changes</>}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {docTab === "history" && (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Created",    value: new Date(selectedDoc.created_at).toLocaleString() },
                      { label: "Updated",    value: new Date(selectedDoc.updated_at).toLocaleString() },
                      { label: "Type",       value: selectedDoc.doc_type.replace(/_/g, " ") },
                      { label: "Language",   value: selectedDoc.language.toUpperCase() },
                      { label: "Customer",   value: (selectedDoc as any).customer_name ?? "Not linked" },
                      { label: "Processed By", value: (selectedDoc as any).processed_by_name ?? "—" },
                      { label: "Reviewed By",  value: (selectedDoc as any).reviewed_by_name ?? "—" },
                      { label: "Signed At",    value: selectedDoc.signed_at ? new Date(selectedDoc.signed_at).toLocaleDateString() : "—" },
                      { label: "Notarised At", value: selectedDoc.notarised_at ? new Date(selectedDoc.notarised_at).toLocaleDateString() : "—" },
                      { label: "Expires At",   value: selectedDoc.expires_at ? new Date(selectedDoc.expires_at).toLocaleDateString() : "—" },
                    ].map(row => (
                      <div key={row.label} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                        <span className="text-[9px] text-slate-400 uppercase font-semibold block">{row.label}</span>
                        <span className="text-slate-800 font-medium">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 bg-slate-50/30 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs italic min-h-64">
            Select a document from the list to view and manage it.
          </div>
        )}
      </div>

      {/* New Document Modal */}
      {showNewDoc && (
        <Modal title="New Document" subtitle="Create a blank document draft" onClose={() => setShowNewDoc(false)}>
          <form onSubmit={handleCreateDoc} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide block mb-1">Title *</label>
              <input type="text" required value={newDocTitle}
                onChange={e => setNewDocTitle(e.target.value)}
                placeholder="e.g. Power of Attorney — Hodan Jama"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white p-2.5 text-sm rounded-xl outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide block mb-1">Document Type *</label>
                <select required value={newDocType}
                  onChange={e => setNewDocType(e.target.value as NotaryDocument["doc_type"])}
                  className="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-xl outline-none">
                  {(["POWER_OF_ATTORNEY","AFFIDAVIT","DEED","CONTRACT","WILL",
                     "STATUTORY_DECLARATION","CERTIFIED_COPY","AUTHENTICATION","APOSTILLE","OTHER"] as const).map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide block mb-1">Branch *</label>
                <select required value={newDocBranch}
                  onChange={e => setNewDocBranch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-xl outline-none">
                  <option value="">— Select branch —</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide block mb-1">Customer</label>
              <select value={newDocCustomer} onChange={e => setNewDocCustomer(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-xl outline-none">
                <option value="">— No customer linked —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide block mb-1">Jurisdiction</label>
              <input value={newDocJuris} onChange={e => setNewDocJuris(e.target.value)}
                placeholder="e.g. Puntland Legal Bureau"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white p-2.5 text-sm rounded-xl outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide block mb-1">Initial Content (optional)</label>
              <textarea rows={3} value={newDocContent}
                onChange={e => setNewDocContent(e.target.value)}
                placeholder="Paste or type initial document text…"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white p-2.5 text-sm rounded-xl outline-none resize-none" />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowNewDoc(false)}
                className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={creatingDoc}
                className="px-6 py-2.5 text-sm bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl font-semibold flex items-center gap-2">
                {creatingDoc ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                             : <><Plus className="w-4 h-4" /> Create Document</>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <Modal title="Reject Document" subtitle="Provide a reason for rejection" onClose={() => { setShowRejectModal(false); setRejectionReason(""); }}>
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              The employee will see this reason and can reopen the document as a draft.
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide block mb-1">Rejection Reason *</label>
              <textarea rows={3} value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="e.g. Missing witness signatures, incorrect jurisdiction stated…"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white p-2.5 text-sm rounded-xl outline-none resize-none" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowRejectModal(false); setRejectionReason(""); }}
                className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
              <button onClick={handleConfirmReject} disabled={transitioning || !rejectionReason.trim()}
                className="px-6 py-2.5 text-sm bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl font-semibold flex items-center gap-2">
                {transitioning ? <><Loader2 className="w-4 h-4 animate-spin" /> Rejecting…</>
                               : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <Modal title="Add New Customer" subtitle="Customer will be available to link to documents"
          onClose={() => setShowAddCustomer(false)} maxWidth="max-w-3xl">
          <CustomerForm onSubmit={handleAddCustomer} onCancel={() => setShowAddCustomer(false)} />
        </Modal>
      )}
    </div>
  );
}
