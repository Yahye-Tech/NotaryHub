import React, { useState } from "react";
import {
  FileText, Search, Sparkles, Wand2,
  ShieldAlert, Lock, RefreshCw, CheckCircle2,
  FileCheck, ArrowDownToLine, History,
  RotateCcw, Printer, Trash2, AlertTriangle
} from "lucide-react";
import { NotaryDocument } from "../../types";

// Local version tracking type — not persisted to DB yet (Step 5 scope)
interface DocVersion {
  version_number: number;
  created_by: string;
  created_at: string;
  reason: string;
  content: string;
}

// Extend NotaryDocument locally for UI-only version tracking
interface DocumentWithVersions extends NotaryDocument {
  _versions?: DocVersion[];
  _activeVersion?: number;
}

export default function CompanyAdminDocuments() {

  // Start empty — documents come from the API (wired in Step 5)
  const [documents, setDocuments] = useState<DocumentWithVersions[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDoc, setSelectedDoc] = useState<DocumentWithVersions | null>(null);
  const [docSubTab, setDocSubTab] = useState<"content" | "history" | "compare" | "edit">("content");
  const [editText, setEditText] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  // AI drafting states
  const [showCreator, setShowCreator] = useState(false);
  const [templateType, setTemplateType] = useState("Power of Attorney");
  const [grantor, setGrantor] = useState("");
  const [receiver, setReceiver] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [customParams, setCustomParams] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  React.useEffect(() => {
    if (selectedDoc) {
      setEditText(selectedDoc.content ?? "");
      setDocSubTab("content");
      setCorrectionReason("");
    }
  }, [selectedDoc?.id]);

  // Filter documents
  const filteredDocs = documents.filter(doc => {
    if (doc.is_deleted) return false;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.summary ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || doc.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // AI generation
  const handleTriggerAiDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantor.trim() || !receiver.trim()) {
      alert("Please fill out Grantor and Receiver fields.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/gemini/generate-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType,
          parties: [grantor, receiver],
          jurisdiction,
          specialClauses: customParams,
          customPrompt: `Structure terms granting legal proxy under ${jurisdiction} statutes.`,
        }),
      });

      const data = await response.json();
      const now = new Date().toISOString();

      const newDoc: DocumentWithVersions = {
        id: `local-${Date.now()}`,
        tenant_id: "",
        branch_id: "",
        customer_id: null,
        processed_by: null,
        reviewed_by: null,
        document_number: `DRAFT-${Date.now()}`,
        title: `${templateType} — ${grantor}`,
        doc_type: "POWER_OF_ATTORNEY",
        status: "draft",
        content: data.document ?? "",
        summary: `${templateType} between ${grantor} and ${receiver}`,
        jurisdiction,
        language: "en",
        file_url: null,
        seal_code: data.watermarkCode ?? null,
        ai_generated: true,
        issued_at: null,
        expires_at: null,
        signed_at: null,
        notarised_at: null,
        created_at: now,
        updated_at: now,
        is_deleted: false,
      };

      setDocuments(prev => [newDoc, ...prev]);
      setSelectedDoc(newDoc);
      setShowCreator(false);
      setGrantor("");
      setReceiver("");
      setCustomParams("");
    } catch (err) {
      console.error("[DocGen] Error:", err);
      alert("AI document generation failed. Please ensure a Gemini API key is configured.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Soft delete — only drafts can be deleted
  const handleAttemptDelete = (doc: DocumentWithVersions) => {
    if (doc.status === "notarised" || doc.status === "signed") {
      alert(
        "SECURITY PROTOCOL: Notarised documents with cryptographic seals cannot be deleted. " +
        "This is enforced by eIDAS digital compliance standards."
      );
      return;
    }
    if (!window.confirm(`Delete draft "${doc.title}"? This cannot be undone.`)) return;
    setDocuments(prev =>
      prev.map(d =>
        d.id === doc.id
          ? { ...d, is_deleted: true, deleted_at: new Date().toISOString() }
          : d
      )
    );
    if (selectedDoc?.id === doc.id) {
      setSelectedDoc(filteredDocs.find(d => d.id !== doc.id) ?? null);
    }
  };

  // Log a revision (local only until Step 5 wires to API)
  const handleSealRevision = () => {
    if (!selectedDoc) return;
    if (!correctionReason.trim()) {
      alert("Please specify a reason for this correction.");
      return;
    }
    if (editText === selectedDoc.content) {
      alert("The content is identical to the current version.");
      return;
    }

    const existingVersions = selectedDoc._versions ?? [
      {
        version_number: 1,
        created_by: "Company Admin",
        created_at: selectedDoc.created_at,
        reason: "Initial version",
        content: selectedDoc.content ?? "",
      },
    ];
    const nextNum = existingVersions.length + 1;
    const newVersion: DocVersion = {
      version_number: nextNum,
      created_by: "Company Admin",
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      reason: correctionReason,
      content: editText,
    };

    const updated: DocumentWithVersions = {
      ...selectedDoc,
      content: editText,
      updated_at: new Date().toISOString(),
      _versions: [...existingVersions, newVersion],
      _activeVersion: nextNum,
    };

    setDocuments(prev => prev.map(d => (d.id === updated.id ? updated : d)));
    setSelectedDoc(updated);
    setDocSubTab("content");
    setCorrectionReason("");
    alert(`Revision registered as Version ${nextNum}.`);
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      draft: "Draft",
      pending_review: "Pending Review",
      approved: "Approved",
      signed: "Signed",
      notarised: "Notarised",
      rejected: "Rejected",
      expired: "Expired",
      revoked: "Revoked",
    };
    return map[status] ?? status;
  };

  const statusColor = (status: string) => {
    if (status === "notarised" || status === "approved") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (status === "signed") return "bg-blue-50 text-blue-700 border border-blue-200";
    if (status === "rejected" || status === "revoked") return "bg-rose-50 text-rose-700 border border-rose-200";
    if (status === "draft") return "bg-slate-100 text-slate-600";
    return "bg-amber-50 text-amber-700 border border-amber-200";
  };

  return (
    <div className="space-y-6">

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-slate-50 border border-slate-200 p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search documents by title or summary…"
            className="w-full bg-white border border-slate-200 pr-4 pl-9 py-2 text-xs rounded-lg outline-none text-slate-900"
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-white border border-slate-200 text-xs rounded-lg px-3 py-2 outline-none"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_review">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="signed">Signed</option>
            <option value="notarised">Notarised</option>
            <option value="rejected">Rejected</option>
            <option value="revoked">Revoked</option>
          </select>

          <button
            onClick={() => setShowCreator(!showCreator)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-4 h-4" />
            AI Document Generator
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left: list */}
        <div className="lg:col-span-6 space-y-4">

          {/* AI Creator panel */}
          {showCreator && (
            <div className="bg-gradient-to-br from-indigo-50/40 to-blue-50/70 border border-blue-200 p-5 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-blue-600 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Wand2 className="w-4 h-4" /> Veritas AI Legal Document Generator
                </span>
              </div>

              <form onSubmit={handleTriggerAiDraft} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Legal Template</label>
                  <select
                    value={templateType}
                    onChange={e => setTemplateType(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                  >
                    <option value="Power of Attorney">Power of Attorney (POA)</option>
                    <option value="Affidavit">Affidavit / Sworn Deposition</option>
                    <option value="Declaration">Declaration / Self Certify</option>
                    <option value="Authorization Letter">Authorization Letter</option>
                    <option value="Contract">Bilateral Contract</option>
                    <option value="Agreement">Standard Agreement</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Grantor Name</label>
                    <input
                      type="text" required
                      value={grantor} onChange={e => setGrantor(e.target.value)}
                      placeholder="Principal Party"
                      className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Receiver / Proxy</label>
                    <input
                      type="text" required
                      value={receiver} onChange={e => setReceiver(e.target.value)}
                      placeholder="Attorney-in-Fact"
                      className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Jurisdiction</label>
                  <input
                    type="text" required
                    value={jurisdiction} onChange={e => setJurisdiction(e.target.value)}
                    placeholder="e.g. Puntland Notary Bureau, Bosaso"
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Special Clauses</label>
                  <textarea
                    rows={2} value={customParams} onChange={e => setCustomParams(e.target.value)}
                    placeholder="Specific terms, limitations, dates…"
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button" onClick={() => setShowCreator(false)}
                    className="border border-slate-200 hover:bg-slate-50 px-4 py-2 text-xs rounded-lg"
                  >Cancel</button>
                  <button
                    type="submit" disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs px-5 py-2 rounded-lg flex items-center gap-1 transition"
                  >
                    {isGenerating
                      ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Drafting…</>
                      : <><Sparkles className="w-3.5 h-3.5" /> Compile & Draft</>
                    }
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Document list */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredDocs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  {documents.length === 0
                    ? "No documents yet. Use the AI Generator to draft your first document."
                    : "No documents match your search."
                  }
                </div>
              ) : filteredDocs.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-4 hover:bg-slate-50 transition cursor-pointer flex justify-between items-center ${
                    selectedDoc?.id === doc.id ? "bg-blue-50/30" : ""
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs truncate">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      {doc.title}
                    </h4>
                    {doc.summary && (
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{doc.summary}</p>
                    )}
                    <div className="flex gap-2 items-center text-[10px] font-mono text-slate-400">
                      <span>{doc.document_number}</span>
                      <span>•</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2 shrink-0 ml-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${statusColor(doc.status)}`}>
                      {statusLabel(doc.status)}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); handleAttemptDelete(doc); }}
                      className="text-slate-400 hover:text-rose-500 transition p-1"
                      title="Delete document"
                    >
                      {doc.status === "notarised" || doc.status === "signed"
                        ? <Lock className="w-3.5 h-3.5" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: document viewer */}
        {selectedDoc ? (
          <div className="lg:col-span-6 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">

            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[9px] font-mono text-blue-600 uppercase font-bold tracking-widest block">
                  SECURED DOCUMENT READER
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1">{selectedDoc.title}</h3>
                <div className="flex gap-2 items-center mt-1 text-[10px] text-slate-400 font-mono">
                  <span>STATUS: {selectedDoc.status.toUpperCase()}</span>
                  {selectedDoc.seal_code && <><span>•</span><span>SEAL: {selectedDoc.seal_code}</span></>}
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => window.print()}
                  className="p-1.5 hover:bg-slate-100 rounded-md"
                  title="Print"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  onClick={() => alert("PDF download will be available once documents are saved to the database.")}
                  className="p-1.5 hover:bg-slate-100 rounded-md"
                  title="Download PDF"
                >
                  <ArrowDownToLine className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Notarised lock notice */}
            {(selectedDoc.status === "notarised" || selectedDoc.status === "signed") && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex gap-2 items-start text-[11px] text-slate-600">
                <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 text-[10px] uppercase flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Permanent Archive Protection Active
                  </span>
                  Notarised documents cannot be modified or deleted under eIDAS compliance standards.
                </div>
              </div>
            )}

            {/* Sub-tabs */}
            <div className="flex border-b border-slate-200">
              {(["content", "history", "compare", "edit"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDocSubTab(tab)}
                  className={`px-3 py-1.5 text-[11px] font-bold border-b-2 -mb-px transition capitalize ${
                    docSubTab === tab
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab === "history"
                    ? `Change Log (${(selectedDoc._versions ?? []).length || 1})`
                    : tab === "compare" ? "Diff Tool"
                    : tab === "edit" ? "Log Revision"
                    : "Content View"
                  }
                </button>
              ))}
            </div>

            {/* Content */}
            {docSubTab === "content" && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-xs leading-relaxed overflow-y-auto max-h-72 whitespace-pre-wrap">
                {selectedDoc.content || <span className="italic text-slate-400">No content available.</span>}
              </div>
            )}

            {docSubTab === "history" && (
              <div className="border border-slate-200 rounded-lg p-3 h-72 overflow-y-auto space-y-2">
                <div className="text-[10px] uppercase font-mono text-slate-400 font-bold flex items-center gap-1">
                  <History className="w-3.5 h-3.5" /> Correction History
                </div>
                {(selectedDoc._versions ?? [
                  { version_number: 1, created_by: "System", created_at: selectedDoc.created_at, reason: "Initial version", content: selectedDoc.content ?? "" }
                ]).map(v => (
                  <div key={v.version_number} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                        Version {v.version_number}
                        {v.version_number === (selectedDoc._activeVersion ?? 1) && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded ml-1">ACTIVE</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{v.created_at} by {v.created_by}</div>
                      {v.reason && v.version_number > 1 && (
                        <div className="text-[11px] text-indigo-700 mt-0.5 italic">{v.reason}</div>
                      )}
                    </div>
                    {v.version_number !== (selectedDoc._activeVersion ?? 1) && (
                      <button
                        onClick={() => {
                          if (!window.confirm(`Restore to Version ${v.version_number}?`)) return;
                          const updated = { ...selectedDoc, content: v.content, _activeVersion: v.version_number };
                          setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
                          setSelectedDoc(updated);
                          alert(`Restored to Version ${v.version_number}.`);
                        }}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg flex items-center gap-1 transition"
                      >
                        <RotateCcw className="w-3 h-3" /> Revert
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {docSubTab === "compare" && (
              <div className="border border-slate-200 rounded-lg p-3 h-72 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2 h-full">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block">ORIGINAL (V1)</label>
                    <div className="bg-rose-50/50 p-2 text-[10px] leading-relaxed whitespace-pre-wrap border border-rose-100 rounded-md h-56 overflow-y-auto">
                      {selectedDoc._versions?.[0]?.content ?? selectedDoc.content}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-blue-600 font-bold font-mono uppercase block">
                      ACTIVE (V{selectedDoc._activeVersion ?? 1})
                    </label>
                    <div className="bg-emerald-50/50 p-2 text-[10px] leading-relaxed whitespace-pre-wrap border border-emerald-100 rounded-md h-56 overflow-y-auto">
                      {selectedDoc.content}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {docSubTab === "edit" && (
              <div className="border border-slate-200 rounded-lg p-3 h-72 overflow-y-auto space-y-3 text-xs">
                <div className="text-[10px] uppercase font-mono text-slate-500 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Log Legal Modification
                </div>
                <textarea
                  rows={5}
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none text-xs h-28 focus:bg-white"
                />
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Reason for Revision</label>
                  <input
                    type="text"
                    value={correctionReason}
                    onChange={e => setCorrectionReason(e.target.value)}
                    placeholder="e.g. Corrected escrow fee guidelines"
                    className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none text-xs"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleSealRevision}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Seal Correction Version
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-6 bg-slate-50/30 border border-dashed border-slate-200 rounded-xl flex items-center justify-center p-8 text-slate-400 italic text-xs h-96">
            Select a document to view its content and manage revisions.
          </div>
        )}
      </div>
    </div>
  );
}
