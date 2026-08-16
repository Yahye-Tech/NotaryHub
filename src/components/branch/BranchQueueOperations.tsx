import React from "react";
import { QueueTicket } from "../../types";

export interface BranchQueueOperationsProps {
  localQueue: QueueTicket[];
  handleCallNext: () => void;
  handleManualCheckIn: () => void;
  handleTransferTicket: (id: string, counter: number) => void;
  handleSkipTicket: (id: string) => void;
  handleCompleteTicket: (id: string) => void;
  handleReopenTicket: (id: string) => void;
}

export default function BranchQueueOperations({
  localQueue,
  handleCallNext,
  handleManualCheckIn,
  handleTransferTicket,
  handleSkipTicket,
  handleCompleteTicket,
  handleReopenTicket,
}: BranchQueueOperationsProps) {
  return (
            <div className="space-y-6 animate-fadeIn" id="branch-queue-lobby">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Live Check-in Queue Manager</span>
                    <h3 className="text-sm font-sans font-bold text-slate-900 mt-0.5">Control lobby call pacing</h3>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleCallNext}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-xs transition"
                    >
                      Call Next Client
                    </button>
                    <button 
                      onClick={handleManualCheckIn}
                      className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-1.5 px-3 rounded-lg transition"
                    >
                      + Manual Check-in
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {localQueue.map(tkt => (
                    <div key={tkt.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-sans">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-white border border-slate-300 font-mono font-bold text-slate-800 text-[10px] px-2 py-0.5 rounded-md shadow-xs">{tkt.ticket_number}</span>
                          <h4 className="font-bold text-slate-900 text-sm">{tkt.customer_name}</h4>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono">
                          Checked-in: <b>{tkt.check_in_time}</b> • Requested: <b className="text-slate-700">{tkt.service_type}</b>
                          {tkt.called_counter && ` • Assigned Station: Counter ${tkt.called_counter}`}
                          {tkt.served_by && ` • Handled By: ${tkt.served_by}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          tkt.status === "calling" ? "bg-amber-100 text-amber-700 font-black animate-pulse" :
                          tkt.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                          tkt.status === "passed" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"
                        }`}>
                          {tkt.status}
                        </span>

                        {tkt.status === "waiting" && (
                          <div className="flex gap-1.5">
                            <button 
                              onClick={() => handleTransferTicket(tkt.id, 1)}
                              className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold p-1 px-2 rounded-md font-sans text-[11px]"
                            >
                              Call Post 1
                            </button>
                            <button 
                              onClick={() => handleTransferTicket(tkt.id, 2)}
                              className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold p-1 px-2 rounded-md font-sans text-[11px]"
                            >
                              Call Post 2
                            </button>
                            <button 
                              onClick={() => handleSkipTicket(tkt.id)}
                              className="text-red-600 hover:underline px-1 font-semibold text-[11px]"
                            >
                              Skip
                            </button>
                          </div>
                        )}

                        {tkt.status === "calling" && (
                          <button 
                            onClick={() => handleCompleteTicket(tkt.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-1 px-2.5 rounded-md font-sans text-[11px]"
                          >
                            Mark Completed
                          </button>
                        )}

                        {tkt.status === "passed" && (
                          <button 
                            onClick={() => handleReopenTicket(tkt.id)}
                            className="bg-white border border-slate-200 text-slate-700 font-bold p-1 px-2 rounded-md font-sans text-[11px]"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {localQueue.length === 0 && (
                    <p className="text-xs text-slate-500 italic text-center py-6">Lobby list is cleared. No customers currently waiting.</p>
                  )}
                </div>
              </div>
            </div>

  );
}
