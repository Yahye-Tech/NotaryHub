import React from "react";
import { Printer, Trash } from "lucide-react";

export interface EmployeeDocumentCard {
  id: string;
  status: string;
  createdAt: string;
  title: string;
  content: string;
}

type NewDocumentForm = {
  type: string;
  principal: string;
  parties: string;
  title: string;
  content: string;
};

export interface EmployeeDocumentsTabProps {
  filteredDocs: EmployeeDocumentCard[];
  docSearchQuery: string;
  setDocSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  editDocId: string | null;
  editDocContent: string;
  setEditDocId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditDocContent: React.Dispatch<React.SetStateAction<string>>;
  handleEditDocumentSave: () => void;
  handlePrintDocument: (title: string) => void;
  handleDeleteDocument: (id: string) => void;
  handleCreateDocument: (event: React.FormEvent) => void;
  newDoc: NewDocumentForm;
  setNewDoc: React.Dispatch<React.SetStateAction<NewDocumentForm>>;
}

export default function EmployeeDocumentsTab({
  filteredDocs,
  docSearchQuery,
  setDocSearchQuery,
  editDocId,
  editDocContent,
  setEditDocId,
  setEditDocContent,
  handleEditDocumentSave,
  handlePrintDocument,
  handleDeleteDocument,
  handleCreateDocument,
  newDoc,
  setNewDoc,
}: EmployeeDocumentsTabProps) {
  return (
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

  );
}
