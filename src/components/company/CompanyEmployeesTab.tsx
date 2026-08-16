import React from "react";
import { KeyRound, Plus, Users } from "lucide-react";
import { Branch, Employee } from "../../types";

export interface CompanyEmployeesTabProps {
  localEmployees: Employee[];
  localBranches: Branch[];
  activeTenantBranches: Branch[];
  empName: string;
  empEmail: string;
  empPassword: string;
  empPhone: string;
  empRole: Employee["job_role"];
  empSpecificRole: string;
  empBranchId: string;
  setEmpName: React.Dispatch<React.SetStateAction<string>>;
  setEmpEmail: React.Dispatch<React.SetStateAction<string>>;
  setEmpPassword: React.Dispatch<React.SetStateAction<string>>;
  setEmpPhone: React.Dispatch<React.SetStateAction<string>>;
  setEmpRole: React.Dispatch<React.SetStateAction<Employee["job_role"]>>;
  setEmpSpecificRole: React.Dispatch<React.SetStateAction<string>>;
  setEmpBranchId: React.Dispatch<React.SetStateAction<string>>;
  handleEmployeeSubmit: (event: React.FormEvent) => void;
  handleToggleEmployeeSuspendLocal: (id: string) => void;
  handleResetEmployeePasswordLocal: (id: string, name: string) => void;
  handleDeleteEmployeeLocal: (id: string, name: string) => void;
  editingEmployee: Employee | null;
  setEditingEmployee: React.Dispatch<React.SetStateAction<Employee | null>>;
  editEmpName: string;
  editEmpEmail: string;
  editEmpRole: Employee["job_role"];
  editEmpBranchId: string;
  setEditEmpName: React.Dispatch<React.SetStateAction<string>>;
  setEditEmpEmail: React.Dispatch<React.SetStateAction<string>>;
  setEditEmpRole: React.Dispatch<React.SetStateAction<Employee["job_role"]>>;
  setEditEmpBranchId: React.Dispatch<React.SetStateAction<string>>;
  handleEmployeeEditSubmit: (event: React.FormEvent) => void;
  employeeDeleteConfirmId: string | null;
  setEmployeeDeleteConfirmId: React.Dispatch<React.SetStateAction<string | null>>;
  isOnboardModalOpen: boolean;
  setIsOnboardModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function CompanyEmployeesTab({
  localEmployees,
  localBranches,
  activeTenantBranches,
  empName,
  empEmail,
  empPassword,
  empPhone,
  empRole,
  empSpecificRole,
  empBranchId,
  setEmpName,
  setEmpEmail,
  setEmpPassword,
  setEmpPhone,
  setEmpRole,
  setEmpSpecificRole,
  setEmpBranchId,
  handleEmployeeSubmit,
  handleToggleEmployeeSuspendLocal,
  handleResetEmployeePasswordLocal,
  handleDeleteEmployeeLocal,
  editingEmployee,
  setEditingEmployee,
  editEmpName,
  editEmpEmail,
  editEmpRole,
  editEmpBranchId,
  setEditEmpName,
  setEditEmpEmail,
  setEditEmpRole,
  setEditEmpBranchId,
  handleEmployeeEditSubmit,
  employeeDeleteConfirmId,
  setEmployeeDeleteConfirmId,
  isOnboardModalOpen,
  setIsOnboardModalOpen,
}: CompanyEmployeesTabProps) {
  return (
            <div className="space-y-6" id="employees-admin-tab">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <div>
                  <h3 className="text-sm font-sans font-bold text-slate-900">Configure Staff & Security permissions ({localEmployees.length})</h3>
                  <p className="text-xs text-slate-550 mt-0.5">Provision clerk authorization tokens and assign role parameters</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(true)}
                  className="bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shrink-0 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer select-none"
                >
                  <Plus className="w-4 h-4" />
                  <span>Onboard Staff Clerk</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Employee Table */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto text-xs text-slate-700">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                          <th className="p-4 font-bold">Clerk Name</th>
                          <th className="p-4 font-bold">Authorized Email</th>
                          <th className="p-4 font-bold">Target Branch</th>
                          <th className="p-4 font-bold">RBAC Authorization Keys</th>
                          <th className="p-4 font-bold">State Status</th>
                          <th className="p-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {localEmployees.map(e => {
                          const associatedBranch = localBranches.find(b => b.id === e.branch_id);
                          const jobRole = e.job_role as string;
                          const employeeStatus = e.status as string;
                          return (
                            <tr key={e.id} className={`hover:bg-slate-50/50 ${e.status === "suspended" ? "bg-slate-50/30 opacity-70" : ""}`}>
                              <td className="p-4 font-bold text-slate-900">
                                <div className="flex flex-col">
                                  <span>{e.full_name}</span>
                                </div>
                              </td>
                              <td className="p-4 font-mono select-all text-[11px] text-slate-550">
                                {e.email}
                              </td>
                              <td className="p-4 text-slate-650 font-bold font-sans">
                                {associatedBranch?.name || "Unassigned / Floater Office"}
                              </td>
                              <td className="p-4 font-bold font-mono text-indigo-650 text-[10px]">
                                {jobRole === "ADMIN" ? "ROLE_BRANCH_ADMIN" : `ROLE_${e.job_role}`}
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-sans font-bold leading-none uppercase ${
                                  employeeStatus === "available" 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-250" 
                                    : e.status === "suspended"
                                      ? "bg-rose-50 text-rose-800 border border-rose-200"
                                      : "bg-slate-200 text-slate-650"
                                }`}>
                                  {e.status}
                                </span>
                              </td>
                              <td className="p-4 text-right space-y-1 sm:space-y-0">
                                <div className="flex flex-wrap gap-1 justify-end">
                                  <button
                                    onClick={() => {
                                      setEditingEmployee(e);
                                      setEditEmpName(e.full_name);
                                      setEditEmpEmail(e.email);
                                      setEditEmpRole(e.job_role);
                                      setEditEmpBranchId(e.branch_id);
                                    }}
                                    className="text-[9.5px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-1 rounded font-bold transition"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleToggleEmployeeSuspendLocal(e.id)}
                                    className={`text-[9.5px] px-1.5 py-1 rounded font-bold transition ${
                                      e.status === "suspended" 
                                        ? "bg-green-50 text-green-700 hover:bg-green-150" 
                                        : "bg-red-50 text-red-700 hover:bg-red-150"
                                    }`}
                                  >
                                    {e.status === "suspended" ? "Unsuspend" : "Suspend"}
                                  </button>
                                  <button
                                    onClick={() => handleResetEmployeePasswordLocal(e.id, e.full_name)}
                                    className="text-[9.5px] bg-indigo-50 text-indigo-700 hover:bg-indigo-150 px-1.5 py-1 rounded font-bold transition flex items-center gap-0.5"
                                    title="Regenerate credentials and log reset"
                                  >
                                    <KeyRound className="w-2.5 h-2.5" /> Reset Pass
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (employeeDeleteConfirmId === e.id) {
                                        handleDeleteEmployeeLocal(e.id, e.full_name);
                                        setEmployeeDeleteConfirmId(null);
                                      } else {
                                        setEmployeeDeleteConfirmId(e.id);
                                      }
                                    }}
                                    className={`text-[9.5px] px-1.5 py-1 rounded font-bold transition ${
                                      employeeDeleteConfirmId === e.id
                                        ? "bg-red-650 text-white hover:bg-red-700"
                                        : "bg-slate-900 text-slate-100 hover:bg-slate-800"
                                    }`}
                                  >
                                    {employeeDeleteConfirmId === e.id ? "Confirm Delete?" : "Delete"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Onboard form sidebar */}
                <div className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4" id="onboard-employee-box">
                  <h4 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold">Onboard Staff Clerk</h4>
                  
                  <form onSubmit={handleEmployeeSubmit} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Clerk Full Name *</label>
                      <input
                        type="text"
                        required
                        value={empName}
                        onChange={(e) => setEmpName(e.target.value)}
                        placeholder="e.g. Elena Rostova"
                        className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Corporate Email Address *</label>
                      <input
                        type="email"
                        required
                        value={empEmail}
                        onChange={(e) => setEmpEmail(e.target.value)}
                        placeholder="clerk@bosaso-notary.com"
                        className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Assign Security Group (RBAC) *</label>
                      <select
                        value={empRole}
                        onChange={(e) => setEmpRole(e.target.value as Employee["job_role"])}
                        className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none cursor-pointer"
                      >
                        <option value="NOTARY_OFFICER">ROLE_NOTARY_OFFICER</option>
                        <option value="ADMIN">ROLE_BRANCH_ADMIN</option>
                        <option value="RECEPTIONIST">ROLE_RECEPTIONIST</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Assign Operational Role *</label>
                      <select
                        value={empSpecificRole}
                        onChange={(e) => setEmpSpecificRole(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none cursor-pointer"
                      >
                        <option value="Document Officer">Document Officer</option>
                        <option value="Receptionist">Receptionist</option>
                        <option value="Cashier">Cashier</option>
                        <option value="Notary Officer">Notary Officer</option>
                        <option value="Verification Officer">Verification Officer</option>
                        <option value="Customer Service">Customer Service</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Primary Branch Bureau Context *</label>
                      {activeTenantBranches.length > 0 ? (
                        <select
                          value={empBranchId}
                          onChange={(e) => setEmpBranchId(e.target.value)}
                          className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none cursor-pointer"
                        >
                          {activeTenantBranches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[10.5px] leading-relaxed font-sans">
                          ⚠️ No branches active. Add a branch first under the <strong>Branches</strong> tab before onboarding clerks.
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={activeTenantBranches.length === 0}
                      className={`w-full font-bold text-xs py-2.5 rounded-lg transition ${
                        activeTenantBranches.length === 0
                          ? "bg-slate-350 text-slate-500 cursor-not-allowed"
                          : "bg-indigo-650 hover:bg-indigo-600 text-white cursor-pointer"
                      }`}
                    >
                      Onboard Clerk Accounts
                    </button>
                  </form>
                </div>

              </div>

              {/* Edit Employee Modal */}
              {editingEmployee && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                  <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-250 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <h4 className="text-xs font-mono text-slate-500 uppercase font-bold tracking-widest flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-650" /> Edit Clerk Information
                      </h4>
                      <button 
                        onClick={() => setEditingEmployee(null)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleEmployeeEditSubmit} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">Staff Member Name *</label>
                        <input
                          type="text"
                          required
                          value={editEmpName}
                          onChange={(e) => setEditEmpName(e.target.value)}
                          className="w-full bg-slate-550/5 border border-slate-200 p-2.5 rounded-lg outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">Corporate Email Identity *</label>
                        <input
                          type="email"
                          required
                          value={editEmpEmail}
                          onChange={(e) => setEditEmpEmail(e.target.value)}
                          className="w-full bg-slate-550/5 border border-slate-200 p-2.5 rounded-lg outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">Security Role (RBAC Keys)</label>
                        <select
                          value={editEmpRole}
                          onChange={(e) => setEditEmpRole(e.target.value as Employee["job_role"])}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-lg outline-none cursor-pointer"
                        >
                          <option value="NOTARY_OFFICER">ROLE_NOTARY_OFFICER</option>
                          <option value="ADMIN">ROLE_BRANCH_ADMIN (Branch Administrator)</option>
                          <option value="RECEPTIONIST">ROLE_RECEPTIONIST</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">Re-Assign Branch Bureau Location</label>
                        <select
                          value={editEmpBranchId}
                          onChange={(e) => setEditEmpBranchId(e.target.value)}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-lg outline-none cursor-pointer"
                        >
                          {activeTenantBranches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingEmployee(null)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 font-bold p-2.5 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-indigo-650 hover:bg-indigo-600 text-white font-bold p-2.5 rounded-lg"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Onboard Employee Modal for Responsive Accessibility */}
              {isOnboardModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                  <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-250 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <h4 className="text-xs font-mono text-slate-505 uppercase font-bold tracking-widest flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-655 animate-pulse" /> Onboard Staff Clerk
                      </h4>
                      <button 
                        onClick={() => setIsOnboardModalOpen(false)}
                        className="text-slate-400 hover:text-slate-650 text-xs font-bold cursor-pointer transition p-1"
                        id="close-onboard-modal-btn"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleEmployeeSubmit} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-450 uppercase font-mono font-bold mb-1">Clerk Full Name *</label>
                        <input
                          type="text"
                          required
                          value={empName}
                          onChange={(e) => setEmpName(e.target.value)}
                          placeholder="e.g. Elena Rostova"
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg outline-none focus:border-indigo-505 font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-450 uppercase font-mono font-bold mb-1">Corporate Email Address *</label>
                        <input
                          type="email"
                          required
                          value={empEmail}
                          onChange={(e) => setEmpEmail(e.target.value)}
                          placeholder="clerk@bosaso-notary.com"
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg outline-none focus:border-indigo-505 font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-455 uppercase font-mono font-bold mb-1">Assign Security Group (RBAC) *</label>
                        <select
                          value={empRole}
                          onChange={(e) => setEmpRole(e.target.value as Employee["job_role"])}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-lg outline-none cursor-pointer font-semibold text-slate-800"
                        >
                          <option value="NOTARY_OFFICER">ROLE_NOTARY_OFFICER</option>
                          <option value="ADMIN">ROLE_BRANCH_ADMIN</option>
                          <option value="RECEPTIONIST">ROLE_RECEPTIONIST</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-455 uppercase font-mono font-bold mb-1">Assign Operational Role *</label>
                        <select
                          value={empSpecificRole}
                          onChange={(e) => setEmpSpecificRole(e.target.value)}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-lg outline-none cursor-pointer font-semibold text-slate-800"
                        >
                          <option value="Document Officer">Document Officer</option>
                          <option value="Receptionist">Receptionist</option>
                          <option value="Cashier">Cashier</option>
                          <option value="Notary Officer">Notary Officer</option>
                          <option value="Verification Officer">Verification Officer</option>
                          <option value="Customer Service">Customer Service</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-455 uppercase font-mono font-bold mb-1">Primary Branch Bureau Context *</label>
                        {activeTenantBranches.length > 0 ? (
                          <select
                            value={empBranchId}
                            onChange={(e) => setEmpBranchId(e.target.value)}
                            className="w-full bg-white border border-slate-200 p-2.5 rounded-lg outline-none cursor-pointer font-black text-slate-900"
                          >
                            {activeTenantBranches.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[10.5px] leading-relaxed font-sans">
                            ⚠️ No active branch offices exist under this company. Register a physical branch first under the <strong>Branches</strong> tab before onboarding.
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsOnboardModalOpen(false)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 font-bold p-2.5 rounded-lg cursor-pointer transition"
                          id="cancel-modal-btn"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={activeTenantBranches.length === 0}
                          className={`flex-1 text-white font-bold p-2.5 rounded-lg transition ${
                            activeTenantBranches.length === 0 
                              ? "bg-slate-300 text-slate-500 cursor-not-allowed" 
                              : "bg-indigo-650 hover:bg-indigo-600 cursor-pointer"
                          }`}
                          id="submit-onboard-btn"
                        >
                          Onboard Clerk
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>

  );
}
