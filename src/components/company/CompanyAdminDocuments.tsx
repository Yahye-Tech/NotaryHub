import React, { useState } from "react";
import { 
  FileText, Search, PlusCircle, AlertTriangle, Printer, 
  Trash2, FileSliders, Sparkles, Wand2, ShieldAlert, 
  Lock, RefreshCw, CheckCircle2, FileCheck, ArrowDownToLine,
  History, RotateCcw
} from "lucide-react";
import { NotaryDocument } from "../../types";

export default function CompanyAdminDocuments() {
  
  // Real-world initial documents list
  const [documents, setDocuments] = useState<NotaryDocument[]>([
    {
      id: "doc-101",
      title: "Special Power of Attorney - Ahmed Ali",
      status: "completed",
      parties: ["Ahmed Ali (Principal)", "Mustafa Gure (Proxy)"],
      content: `# SPECIAL POWER OF ATTORNEY
**Jurisdiction**: Puntland Notary Bureau, Bosaso District
**Status**: NOTARIZED & COMPLETED

KNOW ALL MEN BY THESE PRESENTS:
I, Ahmed Ali, of legal age, Somalian Citizen, hereby appoint Mustafa Gure as my true and legal attorney-in-fact to administer real estate plots located in Bosaso Port Area...

### NOTARIZATION DOCKET CERTIFICATE
This document has been subscribed and validated under fingerprint minutiae template registers matching Somaliland and Puntland national databases.
- Seal Watermark: **VERITAS-SECURE-9948**
- SHA256 Hash: **f38d34fcfa3b4d6986619ba649aa8df2**`,
      createdAt: "2026-06-11",
      hash: "f38d34fcfa3b4d6986619ba649aa8df2"
    },
    {
      id: "doc-102",
      title: "Affidavit of Sole Proprietorship - Fartun Farah",
      status: "pending-signature",
      parties: ["Fartun Farah (Affiant)"],
      content: `# AFFIDAVIT OF SOLE PROPRIETORSHIP
I, Fartun Farah, under legal deposition, hereby certify that I am the sole beneficial owner of Garowe Corporate Logistics Bureau registered under Puntland Commercial acts...`,
      createdAt: "2026-06-09"
    },
    {
      id: "doc-103",
      title: "General Escrow Agreement Draft",
      status: "draft",
      parties: ["Bosaso Port Authority", "Gulf Marine Logistics"],
      content: `# ESCROW SETTLEMENT AGREEMENT
Pre-draft for joint asset venture regarding vessel clearance, values held in trust under Veritas Escrow system standard...`,
      createdAt: "2026-06-05"
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDoc, setSelectedDoc] = useState<NotaryDocument | null>(documents[0]);

  // Document versioning and correction states
  const [docSubTab, setDocSubTab] = useState<"content" | "history" | "compare" | "edit">("content");
  const [editText, setEditText] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [selectedHistVersionNum, setSelectedHistVersionNum] = useState<number>(1);

  // Synchronize document state & auto-populate default versions array if missing
  React.useEffect(() => {
    if (selectedDoc) {
      setEditText(selectedDoc.content);
      if (!selectedDoc.versions || selectedDoc.versions.length === 0) {
        selectedDoc.versions = [
          {
            version_number: 1,
            created_by: "Michael Vance",
            created_at: (selectedDoc.createdAt || "2026-06-12") + " 10:00:00",
            title: selectedDoc.title,
            content: selectedDoc.content
          }
        ];
        selectedDoc.version_number = 1;
      }
      setSelectedHistVersionNum(selectedDoc.version_number || 1);
      setDocSubTab("content");
      setCorrectionReason("");
    }
  }, [selectedDoc]);

  // AI drafting states
  const [showCreator, setShowCreator] = useState(false);
  const [templateType, setTemplateType] = useState("Power of Attorney");
  const [grantor, setGrantor] = useState("");
  const [receiver, setReceiver] = useState("");
  const [jurisdiction, setJurisdiction] = useState("Puntland Notary Board, Bosaso");
  const [customParams, setCustomParams] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter lists
  const filteredDocs = documents.filter(doc => {
    if (doc.is_deleted === true) return false;
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.parties.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = selectedStatus === "all" || doc.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // AI Generation handler using server-side Gemini Proxy
  const handleTriggerAiDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantor.trim() || !receiver.trim()) {
      alert("Please fill out Grantor and Receiver fields to compile deed.");
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
          customPrompt: `Structure terms granting legal proxy under ${jurisdiction} statutes.`
        })
      });

      const data = await response.json();
      
      const newD: NotaryDocument = {
        id: `doc-${Date.now()}`,
        title: `${templateType} - ${grantor}`,
        status: "draft",
        parties: [grantor, receiver],
        content: data.document,
        createdAt: new Date().toISOString().substring(0, 10),
        watermarkCode: data.watermarkCode || "NOTARY-PENDING-SIGN"
      };

      setDocuments(prev => [newD, ...prev]);
      setSelectedDoc(newD);
      setShowCreator(false);
      setGrantor("");
      setReceiver("");
      setCustomParams("");
    } catch (err) {
      console.error(err);
      // fallback draft
      const fallbackDoc: NotaryDocument = {
        id: `doc-${Date.now()}`,
        title: `${templateType} Draft - ${grantor}`,
        status: "draft",
        parties: [grantor, receiver],
        content: `# DRAFT: ${templateType.toUpperCase()}
**Principal**: ${grantor}
**Attorney-in-Fact**: ${receiver}
**Jurisdiction**: ${jurisdiction}

Be it known that the Principal registers active consent granting representation authority to the named proxy. All credentials stand active under standard notary legal frameworks terms.`,
        createdAt: new Date().toISOString().substring(0, 10)
      };
      setDocuments(prev => [fallbackDoc, ...prev]);
      setSelectedDoc(fallbackDoc);
      setShowCreator(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // Safe delete handler: "Cannot permanently delete notarized/completed documents"
  const handleAttemptDelete = (doc: NotaryDocument) => {
    if (doc.status === "completed" || doc.status === "archived") {
      alert(`⚠️ ERROR: SECURITY PROTOCOL ENFORCEMENT\n\nUnder international notary guidelines and digital eIDAS frameworks, notarized deeds with cryptographic signature hashes are permanent and CANNOT be deleted or tampered with. This action has been blocked by security policies.`);
      return;
    }

    // Safely soft-delete draft document instantly on execution to keep audit history
    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: "COMPANY_ADMIN" } : d));
    setSelectedDoc(documents.find(d => d.id !== doc.id && !d.is_deleted) || null);
  };

  const handlePrintMock = (doc: NotaryDocument) => {
    alert(`Initializing high-precision PDF compiler...\n\nPrinting Watermarked Notarized Deed:\n"${doc.title}"\n\nDigital Verification Seal: ${doc.watermarkCode || "VERITAS-APPROVED"}\nOutput queue connected.`);
  };

  return (
    <div className="space-y-6" id="company-admin-docs-sub">
      
      {/* Search and Filters Segment */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-slate-50 border border-slate-200 p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            id="docs-glob-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents by title or parties involved..."
            className="w-full bg-white border border-slate-200 hover:border-slate-350 pr-4 pl-9 py-2 text-xs rounded-lg outline-none text-slate-900 font-sans"
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-slate-200 text-xs rounded-lg px-3 py-2 outline-none"
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed/Notarized</option>
            <option value="pending-signature">Pending Signature</option>
            <option value="draft">Drafts</option>
          </select>

          <button
            id="btn-trigger-ai-creator"
            onClick={() => setShowCreator(!showCreator)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition outline-none cursor-pointer"
          >
            <Sparkles className="w-4.5 h-4.5" />
            <span>AI Document Generator</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Document List (Left 6 Columns) */}
        <div className="lg:col-span-6 space-y-4">
          
          {showCreator && (
            <div className="bg-gradient-to-br from-indigo-50/40 to-blue-50/70 border border-blue-150 p-5 rounded-xl space-y-4" id="ai-doc-generator-box">
              <div className="flex justify-between items-center bg-blue-50/30 p-2 rounded-lg">
                <span className="text-[10px] font-mono text-blue-600 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Wand2 className="w-4 h-4 animate-spin-slow" /> Veritas Premium Legal AI
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded">V2</span>
              </div>

              <form onSubmit={handleTriggerAiDraft} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Select Legal Template</label>
                  <select
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                  >
                    <option value="Power of Attorney">Power of Attorney (POA)</option>
                    <option value="Affidavit">Affidavit / Sworn Deposition</option>
                    <option value="Declaration">Declaration / Self Certify</option>
                    <option value="Authorization Letter">Authorization Letter</option>
                    <option value="Contract">Bilateral Contract</option>
                    <option value="Agreement">Standard Agreement deed</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Grantor Name</label>
                    <input
                      type="text"
                      required
                      value={grantor}
                      onChange={(e) => setGrantor(e.target.value)}
                      placeholder="Principal Party Name"
                      className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Receiver Name / Proxy</label>
                    <input
                      type="text"
                      required
                      value={receiver}
                      onChange={(e) => setReceiver(e.target.value)}
                      placeholder="Attorney-in-Fact Name"
                      className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Legal Jurisdiction Framework</label>
                  <input
                    type="text"
                    required
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    placeholder="e.g. Puntland Notary Bureau, Bosaso"
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Special Clauses & Special Terms</label>
                  <textarea
                    rows={2}
                    value={customParams}
                    onChange={(e) => setCustomParams(e.target.value)}
                    placeholder="Specific transaction, bank escrow thresholds, limitation dates..."
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none font-sans"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreator(false)}
                    className="border border-slate-200 hover:bg-slate-50 px-4 py-2 text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-350 text-white font-bold text-xs px-5 py-2 rounded-lg flex items-center gap-1 transition"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Drafting Legal Language...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Compile and Draft
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Table display */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredDocs.map(doc => (
                <div 
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-4 hover:bg-slate-50/60 transition cursor-pointer flex justify-between items-center ${
                    selectedDoc?.id === doc.id ? "bg-blue-50/20" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-950 flex items-center gap-1.5 text-xs">
                      <FileText className="w-4 h-4 text-blue-600" />
                      {doc.title}
                    </h4>
                    <p className="text-[11px] text-slate-550 truncate max-w-sm font-sans">
                      Parties: {doc.parties?.join(", ") || "Corporate Office"}
                    </p>
                    <div className="flex gap-2 items-center text-[10px] font-mono text-slate-400">
                      <span>Created: {doc.createdAt}</span>
                      <span>•</span>
                      <span>ID: {doc.id}</span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-sans font-bold leading-none uppercase ${
                      doc.status === "completed" 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-250" 
                        : doc.status === "archived" 
                        ? "bg-slate-250 text-slate-600" 
                        : "bg-amber-50 text-amber-705 border border-amber-200"
                    }`}>
                      {doc.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAttemptDelete(doc);
                      }}
                      className="text-slate-400 hover:text-red-500 font-bold scale-90 transition p-1"
                      title="Erase record"
                    >
                      {doc.status === 'completed' || doc.status === 'archived' ? (
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
              {filteredDocs.length === 0 && (
                <div className="p-8 text-center text-slate-400 italic text-xs">
                  No notary files found.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Global Document Viewer Detail Pane (Right 6 Columns) */}
        {selectedDoc ? (
          <div className="lg:col-span-6 bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between" id="doc-active-detail-widget">
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[9px] font-mono text-blue-600 uppercase font-bold tracking-widest block">SECURED DOCUMENT READER</span>
                  <h3 className="text-sm font-sans font-bold text-slate-900 mt-1">{selectedDoc.title}</h3>
                  <div className="flex gap-2 items-center mt-1 text-[10px] text-slate-400 font-mono">
                    <span>STATUS: {selectedDoc.status.toUpperCase()}</span>
                    <span>•</span>
                    <span>Watermark: {selectedDoc.watermarkCode || "VERITAS-LEDGER-HASH"}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button 
                    onClick={() => handlePrintMock(selectedDoc)}
                    className="p-1.5 text-slate-650 hover:bg-slate-100 rounded-md outline-none"
                    title="Print watermarked proof"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => alert("Downloading document as secure cryptographical PDF...")}
                    className="p-1.5 text-slate-650 hover:bg-slate-100 rounded-md outline-none"
                    title="Download legal PDF"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Secure Deletion Blocked Notice Banner */}
              {(selectedDoc.status === "completed" || selectedDoc.status === "archived") && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex gap-2.5 items-start text-[11px] text-slate-650 leading-relaxed font-sans">
                  <ShieldAlert className="w-4.5 h-4.5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block uppercase font-sans text-[10px] tracking-wide flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-600" /> Permanent Archive Protection Active
                    </span>
                    Notarized document signatures and biometric minutiae indices cannot be permanently modified or deleted. Legally binding.
                  </div>
                </div>
              )}

              {/* Document Sub-tabs */}
              <div className="flex border-b border-slate-200 mt-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setDocSubTab("content")}
                  className={`px-3 py-1.5 text-[11px] font-bold border-b-2 -mb-px transition ${
                    docSubTab === "content" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Content View
                </button>
                <button
                  type="button"
                  onClick={() => setDocSubTab("history")}
                  className={`px-3 py-1.5 text-[11px] font-bold border-b-2 -mb-px transition ${
                    docSubTab === "history" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Change Log ({(selectedDoc.versions || []).length || 1})
                </button>
                <button
                  type="button"
                  onClick={() => setDocSubTab("compare")}
                  className={`px-3 py-1.5 text-[11px] font-bold border-b-2 -mb-px transition ${
                    docSubTab === "compare" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Diff Tool
                </button>
                <button
                  type="button"
                  onClick={() => setDocSubTab("edit")}
                  className={`px-3 py-1.5 text-[11px] font-bold border-b-2 -mb-px transition ${
                    docSubTab === "edit" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Log Revision
                </button>
              </div>

              {/* Tab Views */}
              {docSubTab === "content" && (
                <div className="bg-slate-50/70 border border-slate-150 p-5 rounded-lg text-xs leading-relaxed overflow-y-auto max-h-[300px] whitespace-pre-wrap font-sans text-slate-815 h-[300px]" id="doc-view-active">
                  {selectedDoc.content}
                </div>
              )}

              {docSubTab === "history" && (
                <div className="border border-slate-200 rounded-lg p-3 bg-white h-[300px] overflow-y-auto space-y-3 font-sans" id="doc-view-history">
                  <div className="text-[10px] uppercase font-mono text-slate-400 font-bold flex items-center gap-1"><History className="w-3.5 h-3.5" /> Correction History Timeline</div>
                  <div className="space-y-2">
                    {(selectedDoc.versions || []).map((v) => (
                      <div key={v.version_number} className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                            <FileCheck className="w-3.5 h-3.5 text-blue-600 animate-pulse" /> Version {v.version_number} {v.version_number === selectedDoc.version_number && <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded ml-2">ACTIVE</span>}
                          </div>
                          <div className="text-[10px] text-slate-450 mt-0.5 font-sans">
                            Modified: {v.created_at} by {v.created_by}
                          </div>
                          {v.version_number > 1 && (
                            <div className="text-[11px] text-indigo-700 mt-1 italic font-sans">
                              Reason: {v.title}
                            </div>
                          )}
                        </div>
                        {v.version_number !== selectedDoc.version_number && (
                          <button
                            type="button"
                            onClick={() => {
                              const confirmed = window.confirm(`Restore Document state to Version ${v.version_number}? This will revert active content.`);
                              if (confirmed) {
                                selectedDoc.content = v.content;
                                selectedDoc.version_number = v.version_number;
                                // Force state update
                                setSelectedDoc({ ...selectedDoc });
                                alert(`Successfully restored Draft/active text state to Version ${v.version_number}.`);
                              }
                            }}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 text-[10px] font-bold rounded-lg flex items-center gap-1 transition"
                          >
                            <RotateCcw className="w-3 h-3" /> Revert
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {docSubTab === "compare" && (
                <div className="border border-slate-200 rounded-lg p-3 bg-white h-[300px] overflow-y-auto space-y-2 text-xs" id="doc-view-compare">
                  <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">Comparison Matrix</div>
                  <div className="grid grid-cols-2 gap-2 h-full">
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-400 font-mono font-bold uppercase">ORIGINAL (V1)</label>
                      <div className="bg-red-50/50 p-2 text-[10.5px] leading-relaxed select-all whitespace-pre-wrap font-sans h-[220px] overflow-y-auto border border-red-100 rounded-md">
                        {selectedDoc.versions?.[0]?.content || selectedDoc.content}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] text-blue-600 font-bold font-mono uppercase">ACTIVE (V{selectedDoc.version_number || 1})</label>
                      <div className="bg-emerald-50/50 p-2 text-[10.5px] leading-relaxed select-all whitespace-pre-wrap font-sans h-[220px] overflow-y-auto border border-emerald-100 rounded-md">
                        {selectedDoc.content}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {docSubTab === "edit" && (
                <div className="border border-slate-200 rounded-lg p-3 bg-white h-[300px] overflow-y-auto space-y-3 text-xs" id="doc-view-edit">
                  <div className="text-[10.5px] uppercase font-mono text-slate-500 font-extrabold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Log Legal Modification Block
                  </div>
                  <p className="text-[11px] text-slate-550 leading-normal mb-2">
                    Direct changes publish immediately as a legally registered version index tracking author credentials.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Correction Content Text</label>
                      <textarea
                        rows={6}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none font-sans text-xs h-[100px] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-505 uppercase font-bold mb-1">Reason for Revision/Correction</label>
                      <input
                        type="text"
                        required
                        value={correctionReason}
                        onChange={(e) => setCorrectionReason(e.target.value)}
                        placeholder="e.g. Corrected spell checks & escrow fee guidelines"
                        className="w-full bg-white border border-slate-250 p-2 rounded-lg outline-none text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!correctionReason.trim()) {
                            alert("Validation Error: Please specify a reason for this legal correction.");
                            return;
                          }
                          if (editText === selectedDoc.content) {
                            alert("Validation Error: The editor content is identical to the current active content.");
                            return;
                          }
                          
                          const nextVerNum = (selectedDoc.versions?.length || 1) + 1;
                          const newVer = {
                            version_number: nextVerNum,
                            created_by: "Company Admin",
                            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
                            title: correctionReason,
                            content: editText
                          };
                          
                          selectedDoc.versions = [...(selectedDoc.versions || []), newVer];
                          selectedDoc.content = editText;
                          selectedDoc.version_number = nextVerNum;
                          setSelectedDoc({ ...selectedDoc });
                          setDocSubTab("content");
                          setCorrectionReason("");
                          alert(`Legal Document Revision successfully registered under Version ${nextVerNum}.`);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Seal Correction Version
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button 
                onClick={() => alert("Initializing digital notary check-in service flow...")}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-lg text-xs font-bold transition text-center"
              >
                Validate Verification History
              </button>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-6 bg-slate-50/30 border border-dashed border-slate-200 rounded-xl flex items-center justify-center p-8 text-slate-400 italic text-xs h-[400px]">
            Please choose a document from compliance roster tab to view secure parameters.
          </div>
        )}

      </div>

    </div>
  );
}
