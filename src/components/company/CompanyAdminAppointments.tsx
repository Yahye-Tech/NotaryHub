import React, { useState } from "react";
import { 
  Calendar, Clock, Search, BookOpen, UserCheck, 
  Trash2, Plus, CheckCircle, MapPin 
} from "lucide-react";
import { Appointment, Branch } from "../../types";

interface CompanyAdminAppointmentsProps {
  branches: Branch[];
}

export default function CompanyAdminAppointments({ branches }: CompanyAdminAppointmentsProps) {
  
  // Real dynamic appointments state
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: "ap-201",
      branchId: "br-01",
      customerName: "Ahmed Ali",
      customerEmail: "ahmed@trading.so",
      serviceType: "Power of Attorney (POA)",
      appointmentTime: "2026-06-15 @ 10:00 AM",
      status: "scheduled"
    },
    {
      id: "ap-202",
      branchId: "br-01",
      customerName: "Fartun Farah",
      customerEmail: "fartun@garowe-corp.so",
      serviceType: "Agreement / Contract Notarization",
      appointmentTime: "2026-06-15 @ 11:30 AM",
      status: "scheduled"
    },
    {
      id: "ap-203",
      branchId: "br-02",
      customerName: "Arthur Pendelton",
      customerEmail: "arthur@pendelton.org",
      serviceType: "Affidavit of Sworn Deposition",
      appointmentTime: "2026-06-16 @ 02:00 PM",
      status: "scheduled"
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [showBookForm, setShowBookForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Form fields
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [servType, setServType] = useState("Power of Attorney");
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || "br-01");
  const [appDate, setAppDate] = useState("2026-06-15");
  const [appTime, setAppTime] = useState("10:00 AM");

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!custName.trim()) {
      setErrorMessage("Please enter customer name.");
      return;
    }

    const newAp: Appointment = {
      id: `ap-${Date.now()}`,
      branchId: selectedBranchId,
      customerName: custName,
      customerEmail: custEmail || `${custName.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
      serviceType: servType,
      appointmentTime: `${appDate} @ ${appTime}`,
      status: "scheduled"
    };

    setAppointments(prev => [newAp, ...prev]);
    setCustName("");
    setCustEmail("");
    setSuccessMessage(`Scheduled appointment for ${custName} on ${appDate} at ${appTime} successfully.`);
    
    // Auto-hide the success message banner after 4 seconds
    setTimeout(() => {
      setSuccessMessage("");
    }, 4000);
  };

  const handleStatusChange = (id: string, status: Appointment["status"]) => {
    setAppointments(prev => prev.map(ap => ap.id === id ? { ...ap, status } : ap));
  };

  const filteredAps = appointments.filter(ap => 
    ap.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ap.serviceType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" id="company-admin-appointments-sub">
      
      {/* Header controls */}
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
        
        {/* Appointments directory list */}
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
                  {filteredAps.map(ap => {
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
                            {branchObj?.name || "Bosaso Main Branch"}
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
                            ap.status === "scheduled" 
                              ? "bg-blue-50 text-blue-700 border border-blue-200" 
                              : ap.status === "completed" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-250 font-medium" 
                              : "bg-slate-150 text-slate-500 font-medium"
                          }`}>
                            {ap.status}
                          </span>
                        </td>
                        <td className="p-4 text-right flex gap-1.5 justify-end">
                          {ap.status === "scheduled" && (
                            <>
                              <button
                                onClick={() => handleStatusChange(ap.id, "completed")}
                                className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-1 rounded text-[10px] font-sans font-bold hover:bg-emerald-100 transition"
                              >
                                Check In
                              </button>
                              <button
                                onClick={() => handleStatusChange(ap.id, "canceled")}
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

        {/* Dynamic booking form drawer side-by-side */}
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
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-lg transition outline-none cursor-pointer"
              >
                Book Visitor Slot
              </button>
            </form>
          </div>
        )}

      </div>

    </div>
  );
}
