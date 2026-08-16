import React from "react";

export interface EmployeeAppointment {
  id: string;
  customer_name: string;
  service_type: string;
  appointmentTime: string;
  status: string;
}

export interface EmployeeAppointmentsTabProps {
  localAppointments: EmployeeAppointment[];
  handleCheckInCustomer: (id: string, customerName: string, serviceType: string) => void;
  handleReschedule: (id: string) => void;
  handleCancelAppointment: (id: string, customerName: string) => void;
  handleCreateAppointment: (event: React.FormEvent) => void;
  appForm: { customer_name: string; service_type: string; date: string; time: string };
  setAppForm: React.Dispatch<React.SetStateAction<{ customer_name: string; service_type: string; date: string; time: string }>>;
}

export default function EmployeeAppointmentsTab({
  localAppointments,
  handleCheckInCustomer,
  handleReschedule,
  handleCancelAppointment,
  handleCreateAppointment,
  appForm,
  setAppForm,
}: EmployeeAppointmentsTabProps) {
  return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Daily calendar list */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Today Appointment Schedules</span>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {localAppointments.map(ap => (
                    <div key={ap.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                      <div>
                        <span className="block font-bold text-slate-900 font-sans text-sm">{ap.customer_name}</span>
                        <span className="block text-blue-600 mt-1">{ap.service_type}</span>
                        <span className="block text-[10px] text-slate-500 font-mono mt-1">{ap.appointmentTime}</span>
                        <span className={`inline-block px-2 py-0.5 text-[9px] rounded-full font-bold uppercase tracking-wide mt-2 ${
                          ap.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                          ap.status === "canceled" ? "bg-red-50 text-red-700 border border-red-100" :
                          "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                        }`}>{ap.status}</span>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        {ap.status === "scheduled" && (
                          <>
                            <button onClick={() => handleCheckInCustomer(ap.id, ap.customer_name, ap.service_type)} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-1 px-2.5 rounded transition">
                              Check In Lobby
                            </button>
                            <button onClick={() => handleReschedule(ap.id)} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-bold py-1 px-2.5 rounded transition">
                              Reschedule
                            </button>
                            <button onClick={() => handleCancelAppointment(ap.id, ap.customer_name)} className="bg-white hover:bg-red-50 hover:text-red-600 text-slate-400 border border-slate-200 text-[10px] py-1 px-2.5 rounded transition">
                              Cancel Booking
                            </button>
                          </>
                        )}
                        {ap.status !== "scheduled" && (
                          <span className="text-[10px] text-slate-405 font-mono italic">No actions</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Book Appointment form */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Register New Appointment</span>
                
                <form onSubmit={handleCreateAppointment} className="space-y-3">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Client Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ahmed Ali"
                      value={appForm.customer_name}
                      onChange={(e) => setAppForm(p => ({ ...p, customer_name: e.target.value }))}
                      className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Notary Service Type</label>
                    <select
                      value={appForm.service_type}
                      onChange={(e) => setAppForm(p => ({ ...p, service_type: e.target.value }))}
                      className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none text-slate-900"
                    >
                      <option value="General Power of Attorney">General Power of Attorney</option>
                      <option value="Affidavit of Identity">Affidavit of Identity</option>
                      <option value="Deed of Escrow Settlement">Deed of Escrow Settlement</option>
                      <option value="Declaration Document">Declaration Document</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Schedule Date</label>
                      <input
                        type="date"
                        required
                        value={appForm.date}
                        onChange={(e) => setAppForm(p => ({ ...p, date: e.target.value }))}
                        className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono mb-1 uppercase">Appointment Time</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 10:30 AM"
                        value={appForm.time}
                        onChange={(e) => setAppForm(p => ({ ...p, time: e.target.value }))}
                        className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none text-slate-900"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white py-2.5 rounded-lg transition shadow-sm mt-4">
                    Book Appointment Slot
                  </button>
                </form>
              </div>

            </div>

  );
}
