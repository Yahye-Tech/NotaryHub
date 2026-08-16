import React from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { NotaryDocument } from "../../types";
import { documentsApi } from "../../api/documents.api";
import { ApiException } from "../../api/client";

function formatDocumentStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/-/g, " ");
}

function getDocumentStatusClass(status: string): string {
  switch (status) {
    case "notarised":
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    case "signed":
    case "approved":
    case "pending_review":
    case "pending-signature":
      return "bg-amber-100 text-amber-850";
    case "rejected":
    case "revoked":
    case "expired":
      return "bg-red-100 text-red-800";
    default:
      return "bg-blue-100 text-blue-800";
  }
}

type QrVerificationResult = {
  status: "idle" | "success" | "fail";
  message: string;
  docTitle?: string;
  verifiedAt?: string;
};

type DocumentProgress = { percent: number; step: string };

export interface CustomerDocumentsTabProps {
  qrInputCode: string;
  setQrInputCode: React.Dispatch<React.SetStateAction<string>>;
  executeQRVerification: () => void;
  documentsLoading: boolean;
  allDocs: NotaryDocument[];
  selectedDoc: NotaryDocument | null;
  setSelectedDoc: React.Dispatch<React.SetStateAction<NotaryDocument | null>>;
  downloadUploadedFile: (id: string, name: string) => Promise<void>;
  qrVerificationResult: QrVerificationResult;
  setQrVerificationResult: React.Dispatch<React.SetStateAction<QrVerificationResult>>;
  getDocumentProgress: (status: string) => DocumentProgress;
}

export default function CustomerDocumentsTab({
  qrInputCode,
  setQrInputCode,
  executeQRVerification,
  documentsLoading,
  allDocs,
  selectedDoc,
  setSelectedDoc,
  downloadUploadedFile,
  qrVerificationResult,
  setQrVerificationResult,
  getDocumentProgress,
}: CustomerDocumentsTabProps) {
  return (
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
                    {documentsLoading && (
                      <div className="py-10 text-center text-xs text-slate-400">Loading document ledger…</div>
                    )}
                    {!documentsLoading && allDocs.length === 0 && (
                      <div className="py-10 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-xl">
                        No documents linked to your account yet. Visit a branch to start a notarisation request.
                      </div>
                    )}
                    {!documentsLoading && allDocs.map((doc) => (
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
                            <span className="text-[10px] font-mono text-slate-500">ID Serial: {doc.document_number}</span>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-sans font-bold uppercase ${getDocumentStatusClass(doc.status)}`}>
                            {formatDocumentStatusLabel(doc.status)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2 font-mono">
                          <span>Created Date: {doc.created_at?.slice(0, 10)}</span>
                          <div className="flex gap-1">
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const res = await documentsApi.get(doc.id);
                                  setSelectedDoc(res.document);
                                } catch (err) {
                                  alert(err instanceof ApiException ? err.message : "Failed to load document.");
                                }
                              }}
                              className="text-emerald-700 hover:underline px-1 font-sans"
                            >
                              [View]
                            </button>
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                const uploadIdMatch = doc.file_url?.match(/\/api\/uploads\/([^/]+)\/download/);
                                if (uploadIdMatch) {
                                  await downloadUploadedFile(uploadIdMatch[1], `${doc.document_number}-certificate.pdf`);
                                } else {
                                  alert("Certificate PDF not yet generated for this document. It's created automatically once notarised.");
                                }
                              }}
                              className="text-emerald-700 hover:underline px-1 font-sans"
                            >
                              [Download]
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                window.print();
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
                        <p className="whitespace-pre-wrap">{selectedDoc.content ?? "No content available for this document yet."}</p>
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
                          <span className="text-emerald-700 font-bold text-[9.5px] truncate max-w-[120px]">{selectedDoc.seal_code ?? "Not published"}</span>
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

  );
}
