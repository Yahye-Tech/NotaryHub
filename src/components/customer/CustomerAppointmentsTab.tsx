import React from "react";
import { Clock } from "lucide-react";
import { Branch } from "../../types";

export interface CustomerAppointment {
  id: string;
  branchId?: string;
  customerName: string;
  serviceType: string;
  appointmentTime: string;
  status: string;
  customerEmail?: string;
}

export interface CustomerAppointmentsTabProps {
  branches: Branch[];
  bookingStep: number;
  bookingCompany: string;
  bookingBranchId: string;
  bookingService: string;
  bookingDate: string;
  bookingTime: string;
  bookingSubmitting: boolean;
  setBookingStep: React.Dispatch<React.SetStateAction<number>>;
  setBookingCompany: React.Dispatch<React.SetStateAction<string>>;
  setBookingBranchId: React.Dispatch<React.SetStateAction<string>>;
  setBookingService: React.Dispatch<React.SetStateAction<string>>;
  setBookingDate: React.Dispatch<React.SetStateAction<string>>;
  setBookingTime: React.Dispatch<React.SetStateAction<string>>;
  handleAddNewApp: (event: React.FormEvent) => void;
  bookedAppointments: CustomerAppointment[];
  handleCancelAppointment: (id: string) => void;
}

export default function CustomerAppointmentsTab({
  branches,
  bookingStep,
  bookingCompany,
  bookingBranchId,
  bookingService,
  bookingDate,
  bookingTime,
  bookingSubmitting,
  setBookingStep,
  setBookingCompany,
  setBookingBranchId,
  setBookingService,
  setBookingDate,
  setBookingTime,
  handleAddNewApp,
  bookedAppointments,
  handleCancelAppointment,
}: CustomerAppointmentsTabProps) {
  return (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Book appointment Interactive Workflow (7 columns) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="pb-3 border-b border-slate-150 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Book New Desk Session</span>
                      <h3 className="text-sm font-bold font-sans text-slate-900 mt-1">Multi-Step Scheduling Wizard</h3>
                    </div>
                    <span className="text-xs text-slate-500 font-mono font-bold">Step {bookingStep} of 6</span>
                  </div>

                  {/* STEP 1: CHOOSE COMPANY */}
                  {bookingStep === 1 && (
                    <div className="space-y-4 pt-1 animate-fadeIn">
                      <label className="block text-xs font-bold text-slate-700">Step 1: Choose Notary Corporation Group</label>
                      <div className="space-y-2">
                        {[
                          { name: "Veritas Notary Bureau LLC", rate: "Highly Rated Desk", iconClass: "🏢" },
                          { name: "Somalia Sovereignty Trust Inc.", rate: "Federal Clearance Bureau", iconClass: "🏛️" },
                          { name: "Chicago Loop Escrow Associates", rate: "Financial Seal Specialist", iconClass: "💼" }
                        ].map(comp => (
                          <div 
                            key={comp.name}
                            onClick={() => { setBookingCompany(comp.name); setBookingStep(2); }}
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                              bookingCompany === comp.name ? "bg-slate-50 border-emerald-500 shadow-sm" : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span className="font-bold flex items-center gap-2 text-slate-800">
                              <span className="text-base">{comp.iconClass}</span>
                              {comp.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">{comp.rate}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STEP 2: CHOOSE BRANCH */}
                  {bookingStep === 2 && (
                    <div className="space-y-4 pt-1">
                      <label className="block text-xs font-bold text-slate-700">Step 2: Select Local Branch Office</label>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto">
                        {branches.map(br => (
                          <div
                            key={br.id}
                            onClick={() => { setBookingBranchId(br.id); setBookingStep(3); }}
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                              bookingBranchId === br.id ? "bg-slate-50 border-emerald-500 shadow-sm" : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div>
                              <span className="font-bold block text-slate-800">{br.name}</span>
                              <span className="text-[10px] text-slate-500 text-slate-400">{br.address}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">{br.phone}</span>
                          </div>
                        ))}
                        {branches.length === 0 && (
                          <div className="p-3 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 text-center">
                            No branches are available to book right now. Please check back later.
                          </div>
                        )}
                      </div>
                      
                      <button onClick={() => setBookingStep(1)} className="text-xs text-slate-500 font-bold hover:underline block">← Go Back</button>
                    </div>
                  )}

                  {/* STEP 3: CHOOSE SERVICE */}
                  {bookingStep === 3 && (
                    <div className="space-y-4 pt-1">
                      <label className="block text-xs font-bold text-slate-700">Step 3: Select Service Category Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Power of Attorney", "Affidavit", "Declaration", "Contract", "Other"].map(serv => (
                          <div
                            key={serv}
                            onClick={() => { setBookingService(serv); setBookingStep(4); }}
                            className={`p-3 rounded-xl border text-center font-bold text-xs cursor-pointer transition ${
                              bookingService === serv ? "bg-slate-50 border-emerald-500 text-slate-900" : "border-slate-200 text-slate-650 hover:bg-slate-50"
                            }`}
                          >
                            {serv}
                          </div>
                        ))}
                      </div>
                      
                      <button onClick={() => setBookingStep(2)} className="text-xs text-slate-500 font-bold hover:underline block pt-2">← Go Back</button>
                    </div>
                  )}

                  {/* STEP 4: CHOOSE DATE */}
                  {bookingStep === 4 && (
                    <div className="space-y-4 pt-1 animate-fadeIn">
                      <label className="block text-xs font-bold text-slate-700">Step 4: Choose Intended Target Date</label>
                      <input 
                        type="date" 
                        value={bookingDate}
                        onChange={(e) => { setBookingDate(e.target.value); setBookingStep(5); }}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs outline-none font-mono"
                      />
                      
                      <button onClick={() => setBookingStep(3)} className="text-xs text-slate-500 font-bold hover:underline block pt-2">← Go Back</button>
                    </div>
                  )}

                  {/* STEP 5: CHOOSE TIME */}
                  {bookingStep === 5 && (
                    <div className="space-y-4 pt-1">
                      <label className="block text-xs font-bold text-slate-700">Step 5: Choose Intended Time Slot</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["09:00 AM", "10:00 AM", "11:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"].map(tme => (
                          <div
                            key={tme}
                            onClick={() => { setBookingTime(tme); setBookingStep(6); }}
                            className={`p-2 rounded-xl border text-center font-mono text-xs cursor-pointer transition ${
                              bookingTime === tme ? "bg-slate-50 border-emerald-500 text-slate-900 font-bold" : "border-slate-200 text-slate-650 hover:bg-slate-50"
                            }`}
                          >
                            {tme}
                          </div>
                        ))}
                      </div>
                      
                      <button onClick={() => setBookingStep(4)} className="text-xs text-slate-500 font-bold hover:underline block pt-2">← Go Back</button>
                    </div>
                  )}

                  {/* STEP 6: CONFIRM DETAILS */}
                  {bookingStep === 6 && (
                    <form onSubmit={handleAddNewApp} className="space-y-4 pt-1 animate-fadeIn">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-250 text-xs space-y-2 font-sans font-semibold text-slate-700">
                        <label className="block font-bold text-slate-800 text-sm">Step 6: Confirm Session Reservation</label>
                        <div className="grid grid-cols-2 gap-2 font-mono text-xs pt-2">
                          <div>Company:</div> <div className="text-slate-900 font-bold text-right">{bookingCompany}</div>
                          <div>Branch:</div> <div className="text-slate-900 font-bold text-right">{branches.find(b => b.id === bookingBranchId)?.name || "Bosaso Main Branch"}</div>
                          <div>Service:</div> <div className="text-slate-950 font-bold text-right">{bookingService}</div>
                          <div>Date Booking:</div> <div className="text-slate-900 font-bold text-right text-emerald-700">{bookingDate}</div>
                          <div>Hour Slot:</div> <div className="text-slate-900 font-bold text-right text-emerald-700">{bookingTime}</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setBookingStep(5)} 
                          className="w-1/3 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 py-2.5 rounded-xl transition"
                        >
                          Modify Parameters
                        </button>
                        <button 
                          type="submit"
                          disabled={bookingSubmitting}
                          className="w-2/3 bg-emerald-600 hover:bg-emerald-550 disabled:opacity-60 text-white text-xs font-extrabold py-2.5 rounded-xl transition shadow-sm"
                        >
                          {bookingSubmitting ? "Booking…" : "Confirm & Block Session ✓"}
                        </button>
                      </div>
                    </form>
                  )}

                </div>

                {/* Settle / Manage Existing Appointments (5 columns) */}
                <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">My Booked Sessions</span>
                  
                  <div className="space-y-3 max-h-[340px] overflow-y-auto">
                    {/* Always display the predefined one */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-slate-900 block font-sans">Power of Attorney Certification</span>
                          <span className="text-[10px] text-slate-505 block mt-0.5">Bosaso Main Branch</span>
                        </div>
                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px]">Confirmed</span>
                      </div>
                      
                      <div className="text-emerald-700 font-mono text-xs flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        25 June 2026 @ 10:00 AM
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
                        <button 
                          onClick={() => {
                            const changed = prompt("Enter new intended appointment date & hour text:", "2026-06-25 @ 11:30 AM");
                            if (changed) {
                              alert(`✓ Calendar updated. Reschedule request queued in Veritas system scheduler.`);
                            }
                          }}
                          className="bg-white hover:bg-slate-50 text-[10.5px] text-slate-700 border border-slate-200 font-bold px-2.5 py-1.5 rounded-md transition"
                        >
                          Reschedule
                        </button>
                        <button 
                          onClick={() => {
                            const next = bookedAppointments.find(a => a.status === "scheduled");
                            if (next) handleCancelAppointment(next.id);
                          }}
                          disabled={!bookedAppointments.some(a => a.status === "scheduled")}
                          className="bg-red-50 text-[10.5px] text-red-700 hover:bg-red-100 font-bold px-2.5 py-1.5 rounded-md transition disabled:opacity-40"
                        >
                          Cancel Appointment
                        </button>
                      </div>
                    </div>

                    {/* Prop-driven appointments */}
                    {bookedAppointments.map(app => (
                      <div key={app.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-900 block font-sans">{app.serviceType}</span>
                            <span className="text-[10px] text-slate-500 block">System Recorded Session</span>
                          </div>
                          <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[9px] uppercase">{app.status}</span>
                        </div>
                        
                        <div className="text-blue-600 font-mono text-[11px] mt-2 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {app.appointmentTime}
                        </div>
                        {app.status === "scheduled" && (
                          <button
                            onClick={() => handleCancelAppointment(app.id)}
                            className="mt-2 text-[10px] text-red-600 hover:text-red-800 font-bold"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-[10px] text-emerald-800 italic">
                    💡 Please arrive 15 minutes before your time slot. Have your digital QR ledger code ready in-app for clerk check-in.
                  </div>
                </div>

              </div>

            </div>

  );
}
