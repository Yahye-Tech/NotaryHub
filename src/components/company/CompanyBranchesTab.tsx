import React from "react";
import { Building2 } from "lucide-react";
import { Branch } from "../../types";

export interface CompanyBranchesTabProps {
  activeTenantBranches: Branch[];
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  setBranchName: React.Dispatch<React.SetStateAction<string>>;
  setBranchAddress: React.Dispatch<React.SetStateAction<string>>;
  setBranchPhone: React.Dispatch<React.SetStateAction<string>>;
  handleBranchSubmit: (event: React.FormEvent) => void;
  handleToggleArchiveBranchLocal: (branchId: string) => Promise<void>;
  handleDeleteBranchLocal: (branchId: string, branchName: string) => void;
  editingBranch: Branch | null;
  setEditingBranch: React.Dispatch<React.SetStateAction<Branch | null>>;
  editBranchName: string;
  editBranchAddress: string;
  editBranchPhone: string;
  editBranchDesks: number;
  setEditBranchName: React.Dispatch<React.SetStateAction<string>>;
  setEditBranchAddress: React.Dispatch<React.SetStateAction<string>>;
  setEditBranchPhone: React.Dispatch<React.SetStateAction<string>>;
  setEditBranchDesks: React.Dispatch<React.SetStateAction<number>>;
  handleBranchEditSubmit: (event: React.FormEvent) => void;
  branchDeleteConfirmId: string | null;
  setBranchDeleteConfirmId: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function CompanyBranchesTab({
  activeTenantBranches,
  branchName,
  branchAddress,
  branchPhone,
  setBranchName,
  setBranchAddress,
  setBranchPhone,
  handleBranchSubmit,
  handleToggleArchiveBranchLocal,
  handleDeleteBranchLocal,
  editingBranch,
  setEditingBranch,
  editBranchName,
  editBranchAddress,
  editBranchPhone,
  editBranchDesks,
  setEditBranchName,
  setEditBranchAddress,
  setEditBranchPhone,
  setEditBranchDesks,
  handleBranchEditSubmit,
  branchDeleteConfirmId,
  setBranchDeleteConfirmId,
}: CompanyBranchesTabProps) {
  return (
            <div className="space-y-6" id="branches-admin-tab">
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <div>
                  <h3 className="text-sm font-sans font-bold text-slate-900">Manage Office Bureaus ({activeTenantBranches.length})</h3>
                  <p className="text-xs text-slate-550 font-sans mt-0.5">Define corporate branch counters and active witness schedules</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Branches Roster Table */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto text-xs text-slate-705">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                          <th className="p-4 font-bold">Office Name</th>
                          <th className="p-4 font-bold">Telephone</th>
                          <th className="p-4 font-bold">Address Link</th>
                          <th className="p-4 font-bold">Active Desks</th>
                          <th className="p-4 font-bold">Status</th>
                          <th className="p-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeTenantBranches.map(b => (
                          <tr key={b.id} className={`hover:bg-slate-50/50 ${b.status === "archived" ? "bg-slate-50/50 opacity-75" : ""}`}>
                            <td className="p-4 font-semibold text-slate-900 flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-indigo-600" />
                              <div className="flex flex-col">
                                <span>{b.name}</span>
                                {b.status === "archived" && <span className="text-[9px] font-mono text-amber-600 font-semibold">[Archived File]</span>}
                              </div>
                            </td>
                            <td className="p-4 font-mono select-all text-slate-600">
                              {b.phone}
                            </td>
                            <td className="p-4 text-slate-500 max-w-[150px] truncate">
                              {b.address}
                            </td>
                            <td className="p-4 font-mono font-bold">
                              {b.counters_count} counters
                            </td>
                            <td className="p-4">
                              {b.status === "archived" ? (
                                <span className="bg-slate-100 text-slate-700 border border-slate-200 font-sans font-bold px-2 py-0.5 rounded-full text-[9px]">
                                  Archived
                                </span>
                              ) : b.status === "suspended" ? (
                                <span className="bg-amber-50 text-amber-700 border border-amber-200 font-sans font-bold px-2 py-0.5 rounded-full text-[9px]">
                                  Suspended
                                </span>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-805 border border-emerald-200 font-sans font-bold px-2 py-0.5 rounded-full text-[9px]">
                                  Active Sched
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right space-x-1 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setEditingBranch(b);
                                  setEditBranchName(b.name);
                                  setEditBranchAddress(b.address);
                                  setEditBranchPhone(b.phone || "");
                                  setEditBranchDesks(b.counters_count);
                                }}
                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-755 px-2 py-1 rounded font-bold transition"
                                title="Edit office bureau layout"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleToggleArchiveBranchLocal(b.id)}
                                className={`text-[10px] px-2 py-1 rounded font-bold transition ${b.status === "archived" ? "bg-blue-50 text-blue-700 hover:bg-blue-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                              >
                                {b.status === "archived" ? "Restore" : "Archive"}
                              </button>
                              {branchDeleteConfirmId === b.id ? (
                                <span className="inline-flex gap-1.5 items-center">
                                  <button
                                    onClick={() => {
                                      handleDeleteBranchLocal(b.id, b.name);
                                      setBranchDeleteConfirmId(null);
                                    }}
                                    className="text-[10px] bg-red-650 hover:bg-red-700 text-white px-2 py-1 rounded font-bold transition shadow-xs cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setBranchDeleteConfirmId(null)}
                                    className="text-[10px] bg-slate-200 hover:bg-slate-350 text-slate-700 px-2 py-1 rounded font-bold transition cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setBranchDeleteConfirmId(b.id)}
                                  className="text-[10px] bg-rose-50 text-rose-700 hover:bg-rose-100 px-2 py-1 rounded font-bold transition cursor-pointer"
                                  title="Eradicate and cascade delete associated clerks"
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Register branch form sidebar */}
                <div className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4" id="register-branch-box">
                  <h4 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold">Register Physical Branch</h4>
                  
                  <form onSubmit={handleBranchSubmit} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Office Name *</label>
                      <input
                        type="text"
                        required
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        placeholder="e.g. Bosaso Branch 2"
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-lg outline-none focus:border-blue-500 hover:border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Street Address *</label>
                      <input
                        type="text"
                        required
                        value={branchAddress}
                        onChange={(e) => setBranchAddress(e.target.value)}
                        placeholder="e.g. Central Mogadishu blvd"
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-lg outline-none focus:border-blue-500 hover:border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Telephone contact</label>
                      <input
                        type="text"
                        value={branchPhone}
                        onChange={(e) => setBranchPhone(e.target.value)}
                        placeholder="e.g. +252 90 700 1100"
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-lg outline-none focus:border-blue-500 hover:border-slate-300"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-lg transition shrink-0"
                    >
                      Provision Bureau Office
                    </button>
                  </form>
                </div>

              </div>

              {/* Edit Branch Modal */}
              {editingBranch && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-250 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <h4 className="text-xs font-mono text-slate-500 uppercase font-bold tracking-widest flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-indigo-650" /> Update Bureau Layout
                      </h4>
                      <button 
                        onClick={() => setEditingBranch(null)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleBranchEditSubmit} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">Bureau Office Name *</label>
                        <input
                          type="text"
                          required
                          value={editBranchName}
                          onChange={(e) => setEditBranchName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">Office Street Address *</label>
                        <input
                          type="text"
                          required
                          value={editBranchAddress}
                          onChange={(e) => setEditBranchAddress(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">Telephone contact</label>
                        <input
                          type="text"
                          value={editBranchPhone}
                          onChange={(e) => setEditBranchPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">Work counters count (Desks)</label>
                        <input
                          type="number"
                          min="1"
                          max="15"
                          value={editBranchDesks}
                          onChange={(e) => setEditBranchDesks(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg outline-none font-mono"
                        />
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingBranch(null)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 font-bold p-2.5 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-2.5 rounded-lg"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>

  );
}
