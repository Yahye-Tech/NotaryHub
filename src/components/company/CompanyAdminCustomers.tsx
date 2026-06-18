import React, { useState } from "react";
import { 
  Users, Search, UserPlus, CheckCircle2, FileText, 
  Clock, X, ShieldAlert, Fingerprint, PenTool, ExternalLink, ShieldCheck 
} from "lucide-react";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  nationalId: string;
  email: string;
  fingerprintStatus: "enrolled" | "pending";
  fingerprintHash?: string;
  signatureImg?: string;
  branchesVisited: string[];
  documentsCount: number;
  appointmentsCount: number;
  paymentsCount: number;
  history: { date: string; action: string; branch: string }[];
}

export default function CompanyAdminCustomers() {
  
  // Initial rich mock customer database state
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: "cust-01",
      name: "Ahmed Ali",
      phone: "+252 90 779 1111",
      nationalId: "NID-8942-A83B",
      email: "ahmed.ali@bosaso-trading.so",
      fingerprintStatus: "enrolled",
      fingerprintHash: "FP-MINUTIAE-8BE4A9F202B1D",
      signatureImg: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Jon_Foreman_Signature.png",
      branchesVisited: ["Bosaso Main Branch"],
      documentsCount: 8,
      appointmentsCount: 2,
      paymentsCount: 5,
      history: [
        { date: "2026-06-11", action: "Signed General Power of Attorney", branch: "Bosaso Main Branch" },
        { date: "2026-06-10", action: "Completed Fingerprint Biometric Enrollment", branch: "Bosaso Main Branch" },
        { date: "2026-06-08", action: "Paid Notarization Invoice $150.00", branch: "Bosaso Main Branch" }
      ]
    },
    {
      id: "cust-02",
      name: "Fartun Farah",
      phone: "+252 90 779 2222",
      nationalId: "NID-1049-C234",
      email: "fartun.farah@garowe-corp.so",
      fingerprintStatus: "enrolled",
      fingerprintHash: "FP-MINUTIAE-7FE3A5D4034AA",
      signatureImg: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Signature_of_Raffaele_Guglielmi.png",
      branchesVisited: ["Garowe Corporate Office", "Bosaso Main Branch"],
      documentsCount: 4,
      appointmentsCount: 1,
      paymentsCount: 3,
      history: [
        { date: "2026-06-09", action: "Approved Custom Agreement doc draft", branch: "Garowe Corporate Office" },
        { date: "2026-06-05", action: "Completed Passport photo visual confirmation", branch: "Garowe Corporate Office" }
      ]
    },
    {
      id: "cust-03",
      name: "Arthur Pendelton",
      phone: "+1 215 555 0192",
      nationalId: "NID-9923-US89",
      email: "arthur@pendelton-legal.org",
      fingerprintStatus: "enrolled",
      fingerprintHash: "FP-MINUTIAE-9AC3D2319F4",
      branchesVisited: ["Bosaso Main Branch"],
      documentsCount: 5,
      appointmentsCount: 3,
      paymentsCount: 2,
      history: [
        { date: "2026-06-12", action: "Requested Escrow Verification Flow", branch: "Bosaso Main Branch" },
        { date: "2026-06-02", action: "Registered as Corporate legal proxy", branch: "Bosaso Main Branch" }
      ]
    },
    {
      id: "cust-04",
      name: "Alexander Westmoreland",
      phone: "+1 610 555 3821",
      nationalId: "NID-4831-US55",
      email: "alex@westmoreland-holdings.co",
      fingerprintStatus: "pending",
      branchesVisited: ["Bosaso Main Branch"],
      documentsCount: 2,
      appointmentsCount: 2,
      paymentsCount: 1,
      history: [
        { date: "2026-06-12", action: "Completed OCR Passport Scan automatic validation", branch: "Bosaso Main Branch" }
      ]
    }
  ]);

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const handleSelectCustomer = (cust: Customer | null) => {
    setSelectedCustomer(cust);
    setRegistryStatus(null);
  };

  // New customer form state
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newNationalId, setNewNationalId] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [registryStatus, setRegistryStatus] = useState<string | null>(null);

  const handleRegisterCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim() || !newNationalId.trim()) {
      setFormError("Please enter Name, Phone and ID parameters to proceed.");
      return;
    }

    if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setFormError("Validation Error: Invalid Email Format.");
      return;
    }

    const cleanedNewPhone = newPhone.replace(/[\s()+-]/g, "");

    // Duplicate customer checking
    const exists = customers.find(c => 
      c.nationalId.trim().toLowerCase() === newNationalId.trim().toLowerCase() ||
      c.phone.replace(/[\s()+-]/g, "") === cleanedNewPhone ||
      (newEmail && c.email.trim().toLowerCase() === newEmail.trim().toLowerCase())
    );

    if (exists) {
      setFormError(`Warning: Duplicate Customer Detected! This National ID, Phone, or Email already matches an existing customer named "${exists.name}".`);
      return;
    }

    setFormError("");
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: newName,
      phone: newPhone,
      nationalId: newNationalId,
      email: newEmail || `${newName.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
      fingerprintStatus: "pending",
      branchesVisited: ["Bosaso Main Branch"],
      documentsCount: 0,
      appointmentsCount: 0,
      paymentsCount: 0,
      history: [
        { date: new Date().toISOString().substring(0, 10), action: "Customer registered on CRM", branch: "Bosaso Main Branch" }
      ]
    };

    setCustomers(prev => [...prev, newCust]);
    setNewName("");
    setNewPhone("");
    setNewNationalId("");
    setNewEmail("");
    setShowAddCustomer(false);
    setSelectedCustomer(newCust); // auto open profile card
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.nationalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6" id="company-admin-customers-sub">
      
      {/* Search Header Options */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-slate-50 border border-slate-200 p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            id="customer-glob-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search company customers by Name, Phone, National ID..."
            className="w-full bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-500 pl-9 pr-4 py-2 text-xs rounded-lg outline-none text-slate-900 font-sans"
          />
        </div>
        <button
          id="btn-register-new-customer"
          onClick={() => setShowAddCustomer(!showAddCustomer)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition outline-none cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Register Customer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Customer Directory List column */}
        <div className={selectedCustomer ? "lg:col-span-7" : "lg:col-span-12"}>
          
          {showAddCustomer && (
            <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-xl mb-6 space-y-4 shadow-sm" id="register-customer-form-block">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-mono text-blue-600 tracking-wider uppercase font-bold">Register Customer (Company-wide CRM)</h4>
                <button 
                  onClick={() => setShowAddCustomer(false)}
                  className="text-slate-400 hover:text-slate-600 outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRegisterCustomer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formError && (
                  <div className="md:col-span-2 text-xs text-red-600 bg-red-50 border border-red-100 p-2.5 rounded-lg font-medium" id="register-form-err">
                    {formError}
                  </div>
                )}
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold font-mono uppercase mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Ahmed Ali"
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 p-2 text-xs rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold font-mono uppercase mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. +252 90 779 1234"
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 p-2 text-xs rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold font-mono uppercase mb-1">National ID / Passport *</label>
                  <input
                    type="text"
                    required
                    value={newNationalId}
                    onChange={(e) => setNewNationalId(e.target.value)}
                    placeholder="e.g. NID-8942-A83B"
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 p-2 text-xs rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold font-mono uppercase mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. ahmed@trading.so"
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 p-2 text-xs rounded-lg outline-none"
                  />
                </div>

                <div className="md:col-span-2 pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(false)}
                    className="border border-slate-200 hover:bg-slate-50 px-4 py-2 text-xs rounded-lg font-sans text-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2 rounded-lg transition"
                  >
                    Complete Registration
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Directory Listings Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    <th className="p-4 font-bold">Client Name</th>
                    <th className="p-4 font-bold">National ID Info</th>
                    <th className="p-4 font-bold">Biometrics status</th>
                    <th className="p-4 font-bold">History stats</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCustomers.map(cust => (
                    <tr 
                      key={cust.id} 
                      className={`hover:bg-slate-50/70 transition cursor-pointer ${
                        selectedCustomer?.id === cust.id ? "bg-blue-50/30" : ""
                      }`}
                      onClick={() => handleSelectCustomer(cust)}
                    >
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{cust.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{cust.phone}</div>
                      </td>
                      <td className="p-4 font-mono text-[10px] text-slate-600">
                        {cust.nationalId}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold inline-flex items-center gap-1 ${
                          cust.fingerprintStatus === "enrolled" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-250 animate-pulse-once" 
                            : "bg-amber-50 text-amber-700 border border-amber-250"
                        }`}>
                          <Fingerprint className="w-3 h-3" />
                          {cust.fingerprintStatus === "enrolled" ? "Enrolled" : "Needs Enrollment"}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">
                        <div className="font-mono text-[10px]">Deeds: <span className="text-slate-800 font-bold">{cust.documentsCount}</span></div>
                        <div className="font-mono text-[10px] mt-0.5">Visits: <span className="text-slate-800 font-bold">{cust.branchesVisited.length}</span></div>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCustomer(cust);
                          }}
                          className="text-blue-600 hover:text-blue-500 font-bold text-[11px] hover:underline"
                        >
                          View Details &gt;
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                        No customer registrations found matching search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Selected Customer Profile Drawer Sidebar */}
        {selectedCustomer && (
          <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-5 flex flex-col justify-between" id="customer-profile-drawer">
            <div className="space-y-4">
              <div className="flex justify-between items-start header-box border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[9px] font-mono text-blue-600 uppercase font-black tracking-wider">Customer Profile Folder</span>
                  <h3 className="text-base font-sans font-bold text-slate-900 mt-1">{selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-550 font-mono mt-0.5">{selectedCustomer.email}</p>
                </div>
                <button 
                  onClick={() => handleSelectCustomer(null)}
                  className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-650 font-semibold outline-none"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Core Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Phone Number</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedCustomer.phone}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">National ID</span>
                  <p className="font-bold text-slate-800 font-mono mt-0.5">{selectedCustomer.nationalId}</p>
                </div>
              </div>

              {/* Biometrics Passport status */}
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-lg space-y-3.5">
                <h4 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Identity verification parameters
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  {/* Fingerprint sweep parameters */}
                  <div className="border border-slate-200 bg-white p-3 rounded-lg text-center flex flex-col items-center justify-center space-y-1">
                    <Fingerprint className={`w-6 h-6 ${selectedCustomer.fingerprintStatus === 'enrolled' ? 'text-emerald-500' : 'text-slate-300'}`} />
                    <span className="text-[10px] font-bold text-slate-800 block">Fingerprint Scan</span>
                    {selectedCustomer.fingerprintStatus === 'enrolled' ? (
                      <span className="text-[9px] font-mono text-emerald-600 font-bold">ENROLLED</span>
                    ) : (
                      <span className="text-[9px] font-mono text-amber-600 font-bold">PENDING REGISTRATION</span>
                    )}
                  </div>

                  {/* Signature graphic status */}
                  <div className="border border-slate-200 bg-white p-3 rounded-lg text-center flex flex-col items-center justify-center space-y-1">
                    <PenTool className={`w-6 h-6 ${selectedCustomer.signatureImg ? 'text-blue-500' : 'text-slate-300'}`} />
                    <span className="text-[10px] font-bold text-slate-800 block">Digital Signature</span>
                    {selectedCustomer.signatureImg ? (
                      <span className="text-[9px] font-mono text-blue-600 font-bold">VERIFIED SEAL</span>
                    ) : (
                      <span className="text-[9px] font-mono text-slate-400">PENDING CAPTURE</span>
                    )}
                  </div>
                </div>

                {/* Fingerprint key stamp */}
                {selectedCustomer.fingerprintHash && (
                  <div className="p-2 border border-emerald-100 bg-emerald-50/40 rounded text-[9px] font-mono text-emerald-800 flex justify-between items-center">
                    <span>Ledger Key: {selectedCustomer.fingerprintHash}</span>
                    <span className="font-bold block text-emerald-600 uppercase">Secure</span>
                  </div>
                )}

                {/* Signature Image Drawing preview */}
                {selectedCustomer.signatureImg && (
                  <div className="p-3 bg-white border border-slate-200 rounded text-center">
                    <span className="text-[9px] font-mono text-slate-400 block mb-1">REGISTERED HANDWRITTEN SIGNATURE</span>
                    <img 
                      src={selectedCustomer.signatureImg} 
                      alt="customer signature" 
                      referrerPolicy="no-referrer"
                      className="h-10 mx-auto object-contain select-none"
                    />
                  </div>
                )}
              </div>

              {/* Transactions History Logs */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase">Recent activity trail</h4>
                <div className="space-y-2 max-h-[140px] overflow-y-auto">
                  {selectedCustomer.history.map((hist, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg text-[11px] flex justify-between">
                      <div>
                        <p className="text-slate-800 font-medium">{hist.action}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{hist.branch}</p>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono shrink-0">{hist.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              {registryStatus && (
                <div className="p-3 bg-blue-50 border border-blue-150 rounded-lg text-[11px] text-blue-800 font-sans" id="registry-status-panel">
                  <span className="font-bold uppercase tracking-wider text-[9px] block mb-0.5 text-blue-700">Federal Registry Ledger</span>
                  {registryStatus}
                </div>
              )}

            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <button 
                onClick={() => {
                  setRegistryStatus(`Query initiated. Automated validation matched National ID "${selectedCustomer.nationalId}" with Somaliland National Civil Ledger (Status: ACTIVE).`);
                }}
                className="w-full bg-slate-900 border border-slate-950 text-white hover:bg-slate-850 p-2 text-xs font-sans font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Re-Verify NID Database
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
