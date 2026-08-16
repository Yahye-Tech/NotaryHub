import React from "react";
import { Tenant } from "../../types";

type SubscriptionPlan = {
  code: Tenant["plan"];
  name: string;
  price: number;
  activeCount: number;
  revenue: number;
  upgradeRate: string;
};

export interface SuperAdminSubscriptionsTabProps {
  plansList: SubscriptionPlan[];
  tenants: Tenant[];
  modifyPlanCost: (code: string, delta: number) => void;
  changeCompanySubscription: (id: string, plan: Tenant["plan"]) => void;
}

export default function SuperAdminSubscriptionsTab({
  plansList,
  tenants,
  modifyPlanCost,
  changeCompanySubscription,
}: SuperAdminSubscriptionsTabProps) {
  return (
              <div className="space-y-4" id="saas-view-subscriptions">
                {/* Subscription catalogue cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plansList.map(item => (
                    <div key={item.code} className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3.5 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">{item.name}</span>
                          <span className="text-xl font-extrabold text-slate-900 block mt-1.5 font-sans leading-none">${item.price}/mo</span>
                        </div>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">Auto-debit active</span>
                      </div>

                      <div className="text-[11px] text-slate-500 font-mono space-y-1 pt-3.5 border-t border-slate-100 leading-normal">
                        <div className="flex justify-between">
                          <span>Active Subscribers:</span>
                          <span className="font-bold text-slate-800">{item.activeCount} portals</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Aggregate MRR:</span>
                          <span className="font-bold text-slate-800">${item.revenue}.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Renewal rate:</span>
                          <span className="font-bold text-emerald-600">{item.upgradeRate}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => modifyPlanCost(item.code, -50)}
                          className="flex-1 py-1 rounded bg-slate-50 hover:bg-slate-100 text-[10px] border border-slate-200 font-semibold text-slate-700"
                        >
                          Reduce $50
                        </button>
                        <button
                          onClick={() => modifyPlanCost(item.code, 50)}
                          className="flex-1 py-1 rounded bg-slate-50 hover:bg-slate-100 text-[10px] border border-slate-200 font-semibold text-slate-700"
                        >
                          Raise $50
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subscriptions detail database table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-3.5 bg-slate-50 border-b border-slate-100 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    License Subscription roster List
                  </div>
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 font-mono text-[9px] uppercase text-slate-400">
                          <th className="p-3.5 font-bold">Subscriber Company</th>
                          <th className="p-3.5 font-bold">Assigned Tier</th>
                          <th className="p-3.5 font-bold">License Status</th>
                          <th className="p-3.5 font-bold">Monthly Rate</th>
                          <th className="p-3.5 font-bold text-center">Action commands</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tenants.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50/50">
                            <td className="p-3.5 font-bold text-slate-900">{t.name}</td>
                            <td className="p-3.5">
                              <select 
                                value={t.plan}
                                onChange={(e) => changeCompanySubscription(t.id, e.target.value as Tenant["plan"])}
                                className="bg-slate-50 border border-slate-200 px-2 py-1 text-[11px] rounded outline-none text-slate-800"
                              >
                                <option value="Basic">Basic ($299)</option>
                                <option value="Professional">Professional ($799)</option>
                                <option value="Enterprise">Enterprise ($1,999)</option>
                              </select>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                t.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
                              }`}>{t.status}</span>
                            </td>
                            <td className="p-3.5 font-mono font-bold text-[11.5px]">
                              ${t.plan === "Enterprise" ? "1,999" : t.plan === "Professional" ? "799" : "299"}.00
                            </td>
                            <td className="p-3.5 text-center">
                              <button 
                                onClick={() => alert(`Applied 10% administrative promotional discount code for ${t.name} updated subscription.`)}
                                className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-[10.5px] font-bold"
                              >
                                Apply Discount
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

  );
}
