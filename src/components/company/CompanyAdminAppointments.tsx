type Appointment = { id: string; customerName: string; serviceType: string; appointmentTime: string; status: string; branchId?: string; customerEmail?: string };

import React, { useState, useEffect, useCallback } from "react";
import { 
  Calendar, Clock, Search, BookOpen, UserCheck, 
  Trash2, Plus, CheckCircle, MapPin, Loader2, AlertCircle
} from "lucide-react";
import { Branch } from "../../types";
import { appointmentsApi, toUiAppointment } from "../../api/appointments.api";
import { ApiException } from "../../api/client";

interface CompanyAdminAppointmentsProps {
  branches: Branch[];
}

export default function CompanyAdminAppointments({ branches }: CompanyAdminAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [showBookForm, setShowBookForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [servType, setServType] = useState("Power of Attorney (POA)");
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id ?? "");
  const [appDate, setAppDate] = useState(new Date().toISOString().slice(0, 10));
  const [appTime, setAppTime] = useState("10:00 AM");

  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await appointmentsApi.list({ limit: 100 });
      setAppointments(res.appointments.map(toUiAppointment));
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!custName.trim()) {
      setErrorMessage("Please enter customer name.");
      return;
    }
    if (!selectedBranchId) {
      setErrorMessage("Please select a branch.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await appointmentsApi.create({
        branchId: selectedBranchId,
        customerName: custName.trim(),
        customerEmail: custEmail || undefined,
        serviceType: servType,
        appointmentDate: appDate,
        appointmentTime: appTime,
      });
      setAppointments(prev => [toUiAppointment(res.appointment), ...prev]);
      setCustName("");
      setCustEmail("");
      setSuccessMessage(`Scheduled appointment for ${res.appointment.customer_name} on ${appDate} at ${appTime}.`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setErrorMessage(err instanceof ApiException ? err.message : "Failed to book appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, action: "check_in" | "cancel") => {
    try {
      const status = action === "check_in" ? "checked_in" : "cancelled";
      const res = await appointmentsApi.transition(id, status);
      setAppointments(prev =>
        prev.map(ap => ap.id === id ? toUiAppointment(res.appointment) : ap)
      );
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to update appointment status.");
    }
  };

  const filteredAps = appointments.filter(ap => 
    ap.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ap.serviceType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading appointments…
      </div>
    );
  }

  return (
    <div className="space-y-6" id="company-admin-appointments-sub">
      
      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-slate-50 border border-slate-200 p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            id="ap-glob-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search scheduled visitor appointments by name or service type..."
            className="w-full bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-500 pl-9 pr-4 py-2 text-xs rounded-lg outline-none text-slate-900 font-sans"
          />
        </div>
        <button
          id="btn-book-ap"
          onClick={() => setShowBookForm(!showBookForm)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition outline-none cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Book Appointment</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <div className={showBookForm ? "lg:col-span-8" : "lg:col-span-12"}>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-550">
                    <th className="p-4 font-bold">Scheduled Visitor</th>
                    <th className="p-4 font-bold">Office Branch Location</th>
                    <th className="p-4 font-bold">Selected Notary Class</th>
                    <th className="p-4 font-bold">Date & Time</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No appointments scheduled yet.
                      </td>
                    </tr>
                  ) : filteredAps.map(ap => {
                    const branchObj = branches.find(b => b.id === ap.branchId);
                    return (
                      <tr key={ap.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{ap.customerName}</div>
                          <div className="text-[10px] text-slate-400 font-sans">{ap.customerEmail}</div>
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-slate-800 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            {branchObj?.name || "—"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-650 font-bold font-sans">
                          {ap.serviceType}
                        </td>
                        <td className="p-4 font-mono text-[11px] text-slate-600">
                          {ap.appointmentTime}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-sans font-bold leading-none uppercase ${
                            ap.status === "scheduled" || ap.status === "checked_in"
                              ? "bg-blue-50 text-blue-700 border border-blue-200" 
                              : ap.status === "completed" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-250 font-medium" 
                              : "bg-slate-150 text-slate-500 font-medium"
                          }`}>
                            {ap.status}
                          </span>
                        </td>
                        <td className="p-4 text-right flex gap-1.5 justify-end">
                          {(ap.status === "scheduled" || ap.status === "confirmed") && (
                            <>
                              <button
                                onClick={() => handleStatusChange(ap.id, "check_in")}
                                className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-1 rounded text-[10px] font-sans font-bold hover:bg-emerald-100 transition"
                              >
                                Check In
                              </button>
                              <button
                                onClick={() => handleStatusChange(ap.id, "cancel")}
                                className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1 rounded text-[10px] font-semibold hover:bg-slate-205 transition"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showBookForm && (
          <div className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4" id="book-new-appointment-form">
            <h3 className="text-xs font-mono font-bold text-slate-450 uppercase tracking-wider">Book Client Appointment</h3>
            
            <form onSubmit={handleBookSubmit} className="space-y-3.5 text-xs">
              {errorMessage && (
                <div className="p-2.5 bg-red-50 border border-red-100 text-red-700 text-[11px] rounded-lg font-medium" id="ap-err-lbl">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] rounded-lg font-medium" id="ap-succ-lbl">
                  {successMessage}
                </div>
              )}
              <div>
                <label className="block text-[10px] text-slate-505 uppercase font-mono font-bold mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Ahmed Ali"
                  className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-505 uppercase font-mono font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="e.g. customer@domain.so"
                  className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-505 uppercase font-mono font-bold mb-1">Service Type *</label>
                <select
                  value={servType}
                  onChange={(e) => setServType(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                >
                  <option value="Power of Attorney (POA)">Power of Attorney (POA)</option>
                  <option value="Affidavit Statement">Affidavit Statement</option>
                  <option value="Witness Declaration">Witness Declaration</option>
                  <option value="Escrow Contract">Escrow Contract</option>
                  <option value="Other Certification">Other Certification</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-505 uppercase font-mono font-bold mb-1">Target Bureau Office *</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-550 uppercase font-bold mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={appDate}
                    onChange={(e) => setAppDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-550 uppercase font-bold mb-1">Time *</label>
                  <input
                    type="text"
                    required
                    value={appTime}
                    onChange={(e) => setAppTime(e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-xs py-2.5 rounded-lg transition outline-none cursor-pointer"
              >
                {submitting ? "Booking…" : "Book Visitor Slot"}
              </button>
            </form>
          </div>
        )}

      </div>

    </div>
  );
}
