import React from "react";
import { Calendar } from "lucide-react";
import { Employee } from "../../types";

type BranchAppointment = {
  id: string;
  customer_name: string;
  customerEmail?: string;
  service_type: string;
  appointmentTime: string;
  status: string;
};

export interface BranchAppointmentsTabProps {
  localApps: BranchAppointment[];
  localEmployees: Array<Employee & { name?: string; role?: string }>;
  calendarScope: "today" | "week" | "month";
  setCalendarScope: React.Dispatch<React.SetStateAction<"today" | "week" | "month">>;
  handleCancelApp: (id: string) => void;
  triggerReassignApp: (appointment: BranchAppointment) => void;
  reassignAppTarget: BranchAppointment | null;
  reassignTargetEmp: string;
  setReassignTargetEmp: React.Dispatch<React.SetStateAction<string>>;
  executeReassignApp: () => void;
  setReassignAppTarget: React.Dispatch<React.SetStateAction<BranchAppointment | null>>;
}

export default function BranchAppointmentsTab({
  localApps,
  localEmployees,
  calendarScope,
  setCalendarScope,
  handleCancelApp,
  triggerReassignApp,
  reassignAppTarget,
  reassignTargetEmp,
  setReassignTargetEmp,
  executeReassignApp,
  setReassignAppTarget,
}: BranchAppointmentsTabProps) {
  return (
            <div className="space-y-6 animate-fadeIn" id="branch-appointments-panel">
              
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Bookings & Calendar Hub</span>
                    <h3 className="text-sm font-sans font-bold text-slate-900 mt-0.5">Manage appointment schedules & calendars</h3>
                  </div>

                  {/* Calendar View Scope options */}
                  <div className="flex bg-slate-50 p-1 border border-slate-200 rounded-lg text-xs font-sans font-semibold">
                    <button 
                      onClick={() => setCalendarScope("today")}
                      className={`px-3 py-1 rounded-md transition ${calendarScope === "today" ? "bg-white text-slate-950 shadow-sm font-bold" : "text-slate-500"}`}
                    >
                      Today
                    </button>
                    <button 
                      onClick={() => setCalendarScope("week")}
                      className={`px-3 py-1 rounded-md transition ${calendarScope === "week" ? "bg-white text-slate-950 shadow-sm font-bold" : "text-slate-500"}`}
                    >
                      Week
                    </button>
                    <button 
                      onClick={() => setCalendarScope("month")}
                      className={`px-3 py-1 rounded-md transition ${calendarScope === "month" ? "bg-white text-slate-950 shadow-sm font-bold" : "text-slate-500"}`}
                    >
                      Month
                    </button>
                  </div>
                </div>

                {/* Calendar list scoped */}
                <div className="space-y-3">
                  <div className="p-2.5 bg-indigo-50 border border-indigo-150 rounded-xl flex items-center justify-between text-xs font-semibold text-indigo-950">
                    <span>Active Display State: {calendarScope.toUpperCase()}'s Booked Operations</span>
                    <span>Total: {localApps.length} Itineraries</span>
                  </div>

                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
                    {localApps.map(app => (
                      <div key={app.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-sans">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-950 text-sm leading-tight">{app.customer_name}</h4>
                            <span className="text-[10px] text-slate-500 font-mono">{app.customerEmail}</span>
                          </div>
                        </div>

                        <div className="text-left sm:text-right font-mono">
                          <span className="text-indigo-700 block font-bold">{app.appointmentTime}</span>
                          <span className="text-slate-650 block text-[11px] font-sans">Deed requested: <b>{app.service_type}</b></span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                            app.status === "scheduled" ? "bg-blue-100 text-blue-700 border border-blue-200" :
                            app.status === "canceled" ? "bg-red-50 text-red-600" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {app.status}
                          </span>

                          {app.status === "scheduled" && (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => triggerReassignApp(app)}
                                className="bg-white border border-slate-200 hover:bg-slate-100 font-semibold p-1.5 rounded-lg text-[11px] text-slate-800 transition"
                              >
                                Reassign Desk
                              </button>
                              <button 
                                onClick={() => handleCancelApp(app.id)}
                                className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg text-[11px] font-bold transition"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calendar reassign popover — real assignment via appointmentsApi.update */}
                {reassignAppTarget && (
                  <div className="p-4 bg-slate-100 border border-slate-350 rounded-xl space-y-3 font-sans text-xs">
                    <p className="font-bold text-slate-800">Reassign {reassignAppTarget.customer_name}'s schedule desk:</p>
                    <div className="flex gap-2">
                      <select 
                        value={reassignTargetEmp}
                        onChange={(e) => setReassignTargetEmp(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs"
                      >
                        {localEmployees.map(e => (
                          <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                        ))}
                      </select>
                      <button 
                        onClick={executeReassignApp}
                        className="bg-indigo-600 text-white font-bold px-3 py-2 rounded-lg"
                      >
                        Assign Draft
                      </button>
                      <button 
                        onClick={() => setReassignAppTarget(null)}
                        className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

  );
}
