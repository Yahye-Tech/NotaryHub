import React from "react";
import { Plus, Eye, Ban, Trash2 } from "lucide-react";
import { Branch, Employee, Tenant } from "../../types";

export interface SuperAdminCompaniesTabProps {
  tenants: Tenant[];
  branches: Branch[];
  employees: Employee[];
  plansList: Array<{ code: Tenant["plan"]; price: number }>;
  globalSearchTerm: string;
  setActiveSubTab: (tab: string) => void;
  inspectOrganization: (id: string) => void;
  onToggleTenantStatus: (id: string) => void;
  onDeleteTenant: (id: string) => void;
}

export default function SuperAdminCompaniesTab({
  tenants,
  branches,
  employees,
  plansList,
  globalSearchTerm,
  setActiveSubTab,
  inspectOrganization,
  onToggleTenantStatus,
  onDeleteTenant,
}: SuperAdminCompaniesTabProps) {
  return (
              <div className="space-y-4" id="saas-view-companies">
                <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-2xl">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-450 uppercase tracking-widest">Companies Module</h3>
                    <p className="text-xs text-slate-500 mt-1">Core corporate tenant administration panel & White-labels</p>
                  </div>
                  
                  {/* Create tenant quick trigger */}
                  <button 
                    onClick={() => setActiveSubTab("settings")}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Initialize Company space
                  </button>
                </div>

                {/* Unified Premium Table layout listing of Companies */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-3.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Tenant directory database</span>
                    <span className="text-[10px] text-slate-500 font-sans tracking-tight">{tenants.length} organization tables segmented</span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 bg-slate-50/50 uppercase">
                          <th className="p-3.5 font-bold">Company Name / Logo</th>
                          <th className="p-3.5 font-bold">License tier</th>
                          <th className="p-3.5 font-bold">Billing Status</th>
                          <th className="p-3.5 font-bold text-center">Bureaus</th>
                          <th className="p-3.5 font-bold text-center">Staff</th>
                          <th className="p-3.5 font-bold text-right">MRR share</th>
                          <th className="p-3.5 font-bold text-center">Platform Control Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                        {tenants
                          .filter(t =>
                            !globalSearchTerm.trim() ||
                            t.name.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
                            t.subdomain.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
                            t.plan.toLowerCase().includes(globalSearchTerm.toLowerCase())
                          )
                          .map(tenant => {
                          const associatedBranches = branches.filter(b => b.tenant_id === tenant.id);
                          const associatedStaff = employees.filter(emp => associatedBranches.map(b => b.id).includes(emp.branch_id));
                          const baseTierCost = plansList.find(p => p.code === tenant.plan)?.price || 799;

                          return (
                            <tr key={tenant.id} className="hover:bg-slate-50/55 transition">
                              <td className="p-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-850 font-bold flex items-center justify-center border border-slate-150">
                                    {tenant.name.charAt(0)}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-900 block">{tenant.name}</span>
                                    <span className="text-blue-600 font-mono text-[10px] block mt-0.5">{tenant.subdomain}.notary.com</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  tenant.plan === "Enterprise" 
                                    ? "bg-slate-900 text-slate-50/90" 
                                    : tenant.plan === "Professional" 
                                    ? "bg-blue-50 text-blue-700" 
                                    : "bg-teal-50 text-teal-700"
                                }`}>{tenant.plan}</span>
                              </td>
                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                                  tenant.status === "active" 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-250" 
                                    : tenant.status === "suspended"
                                    ? "bg-rose-50 text-red-750 border-red-250"
                                    : "bg-amber-50 text-amber-700 border-amber-250"
                                }`}>{tenant.status}</span>
                              </td>
                              <td className="p-3.5 text-center font-bold text-slate-800">{associatedBranches.length}</td>
                              <td className="p-3.5 text-center font-bold text-slate-800">{associatedStaff.length || 2}</td>
                              <td className="p-3.5 text-right font-mono font-bold text-slate-900">${baseTierCost}.00</td>
                              <td className="p-3.5">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => inspectOrganization(tenant.id)}
                                    className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                                  >
                                    <Eye className="w-3 h-3 text-slate-400" /> Inspect
                                  </button>

                                  <button
                                    onClick={() => onToggleTenantStatus(tenant.id)}
                                    className={`p-1 hover:bg-slate-100 rounded-lg border transition ${
                                      tenant.status === "active" ? "text-amber-600 border-amber-100" : "text-emerald-600 border-emerald-100"
                                    }`}
                                    title="Toggle active status"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => onDeleteTenant(tenant.id)}
                                    className="p-1 hover:bg-red-50 text-rose-600 rounded-lg border border-red-100 transition"
                                    title="Eradicate space"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
              </div>
            
  );
}
