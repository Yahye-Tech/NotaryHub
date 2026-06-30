import React, { useState, useEffect, useCallback } from "react";
import {
  Users, Search, UserPlus, FileText, X,
  ShieldAlert, ShieldCheck, ExternalLink, Loader2,
  AlertCircle, RefreshCw, Ban, CheckCircle2, Phone,
  Mail, MapPin, Calendar, IdCard, Clock
} from "lucide-react";
import { Customer } from "../../types";
import {
  customersApi,
  type CustomerDocumentHistoryItem,
  type CustomerActivityItem,
} from "../../api/documents.api";
import { Modal, CustomerForm, type CustomerFormData } from "../FormComponents";
import { ApiException } from "../../api/client";

const STATUS_STYLES: Record<string, string> = {
  active:      "bg-emerald-50 text-emerald-700 border border-emerald-200",
  suspended:   "bg-amber-50 text-amber-700 border border-amber-200",
  blacklisted: "bg-rose-50 text-rose-700 border border-rose-200",
};

const DOC_STATUS_STYLES: Record<string, string> = {
  notarised:      "bg-emerald-50 text-emerald-700",
  signed:         "bg-indigo-50 text-indigo-700",
  approved:       "bg-blue-50 text-blue-700",
  pending_review: "bg-amber-50 text-amber-700",
  rejected:       "bg-rose-50 text-rose-700",
  draft:          "bg-slate-100 text-slate-600",
};

export default function CompanyAdminCustomers() {
  // ── Directory state ───────────────────────────────────────────────────────
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // ── Selected customer + history ───────────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer]   = useState<Customer | null>(null);
  const [docHistory, setDocHistory]               = useState<CustomerDocumentHistoryItem[]>([]);
  const [activity, setActivity]                   = useState<CustomerActivityItem[]>([]);
  const [historyLoading, setHistoryLoading]       = useState(false);

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);

  // ── Load directory ────────────────────────────────────────────────────────
  const loadCustomers = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await customersApi.list(search);
      setCustomers(res.customers);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => loadCustomers(searchTerm || undefined), 350);
    return () => clearTimeout(timer);
  }, [searchTerm, loadCustomers]);

  // ── Load history when a customer is selected ──────────────────────────────
  const loadHistory = useCallback(async (customerId: string) => {
    setHistoryLoading(true);
    try {
      const res = await customersApi.history(customerId);
      setDocHistory(res.documents);
      setActivity(res.activity);
    } catch (err) {
      console.error("[Customers] History load failed:", err);
      setDocHistory([]);
      setActivity([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleSelectCustomer = (cust: Customer | null) => {
    setSelectedCustomer(cust);
    if (cust) loadHistory(cust.id);
  };

  // ── Create customer ───────────────────────────────────────────────────────
  const handleAddCustomer = async (data: CustomerFormData) => {
    const res = await customersApi.create({
      fullName: data.fullName, email: data.email || undefined, phone: data.phone || undefined,
      dateOfBirth: data.dateOfBirth || undefined, nationality: data.nationality || undefined,
      address: data.address || undefined, city: data.city || undefined, country: data.country,
      idType: data.idType as any, idNumber: data.idNumber || undefined,
      idIssueDate: data.idIssueDate || undefined, idExpiryDate: data.idExpiryDate || undefined,
      idIssuingAuthority: data.idIssuingAuthority || undefined, notes: data.notes || undefined,
    });
    setCustomers(prev => [...prev, res.customer].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    setShowAddCustomer(false);
    setSelectedCustomer(res.customer);
    loadHistory(res.customer.id);
  };

  // ── Status changes ────────────────────────────────────────────────────────
  const handleSetStatus = async (status: Customer["status"], reason?: string) => {
    if (!selectedCustomer) return;
    setStatusSaving(true);
    try {
      const res = await customersApi.update(selectedCustomer.id, {
        status,
        blacklistReason: reason,
      });
      setCustomers(prev => prev.map(c => c.id === res.customer.id ? res.customer : c));
      setSelectedCustomer(res.customer);
      setShowBlacklistModal(false);
      setBlacklistReason("");
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDelete = async (cust: Customer) => {
    if (!window.confirm(`Remove "${cust.full_name}" from the customer directory?`)) return;
    try {
      await customersApi.delete(cust.id);
      setCustomers(prev => prev.filter(c => c.id !== cust.id));
      if (selectedCustomer?.id === cust.id) setSelectedCustomer(null);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Failed to delete customer");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        <span className="text-sm">Loading customers…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-slate-50 border border-slate-200 p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, phone, or ID number…"
            className="w-full bg-white border border-slate-200 focus:border-blue-400 pl-9 pr-4 py-2.5 text-xs rounded-lg outline-none text-slate-900"
          />
        </div>
        <button
          onClick={() => setShowAddCustomer(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Register Customer
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            {error}
            <button onClick={() => loadCustomers()} className="ml-2 underline font-semibold">Retry</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Directory */}
        <div className={selectedCustomer ? "lg:col-span-7" : "lg:col-span-12"}>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    <th className="p-4 font-bold">Customer</th>
                    <th className="p-4 font-bold">ID Document</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold">Documents</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {customers.map(cust => (
                    <tr
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className={`hover:bg-slate-50/70 transition cursor-pointer ${
                        selectedCustomer?.id === cust.id ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{cust.full_name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {cust.phone ?? cust.email ?? "—"}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-[10px] text-slate-600">
                        {cust.id_number ?? "—"}
                        {cust.id_type && (
                          <div className="text-[9px] text-slate-400 font-sans mt-0.5">
                            {cust.id_type.replace(/_/g, " ")}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${STATUS_STYLES[cust.status]}`}>
                          {cust.status === "blacklisted" && <Ban className="w-3 h-3" />}
                          {cust.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">
                        <span className="font-mono text-[11px] font-bold text-slate-800">
                          {(cust as any).document_count ?? 0}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={e => { e.stopPropagation(); handleSelectCustomer(cust); }}
                          className="text-blue-600 hover:text-blue-500 font-bold text-[11px] hover:underline"
                        >
                          View &gt;
                        </button>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-400 italic text-xs">
                        {searchTerm
                          ? "No customers match your search."
                          : "No customers registered yet. Click \"Register Customer\" to add the first one."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Customer profile drawer */}
        {selectedCustomer && (
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">

            {/* Header */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold inline-flex items-center gap-1 mb-2 ${STATUS_STYLES[selectedCustomer.status]}`}>
                    {selectedCustomer.status === "blacklisted" && <Ban className="w-3 h-3" />}
                    {selectedCustomer.status}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{selectedCustomer.full_name}</h3>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-1 rounded-md text-slate-400 hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedCustomer.status === "blacklisted" && (selectedCustomer as any).blacklist_reason && (
                <div className="mt-3 flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] p-2.5 rounded-lg">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {(selectedCustomer as any).blacklist_reason}
                </div>
              )}

              {/* Contact grid */}
              <div className="grid grid-cols-2 gap-2.5 mt-4 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-700 truncate">{selectedCustomer.phone ?? "—"}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-700 truncate">{selectedCustomer.email ?? "—"}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg flex items-center gap-2">
                  <IdCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-700 font-mono truncate">{selectedCustomer.id_number ?? "—"}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-700 truncate">
                    {selectedCustomer.id_expiry_date
                      ? `Expires ${new Date(selectedCustomer.id_expiry_date).toLocaleDateString()}`
                      : "No expiry on file"}
                  </span>
                </div>
              </div>

              {selectedCustomer.address && (
                <div className="mt-2.5 p-2.5 bg-slate-50 rounded-lg flex items-start gap-2 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-700">{selectedCustomer.address}</span>
                </div>
              )}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto max-h-96 p-5 space-y-5">

              {historyLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
                </div>
              ) : (
                <>
                  {/* Document history — real DB data */}
                  <div>
                    <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Document History ({docHistory.length})
                    </h4>
                    {docHistory.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No documents created for this customer yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {docHistory.map(doc => (
                          <div key={doc.document_id} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex justify-between items-center">
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-slate-800 truncate">{doc.title}</p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                {doc.document_number} · {doc.branch_name}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ml-2 ${DOC_STATUS_STYLES[doc.status] ?? "bg-slate-100 text-slate-500"}`}>
                              {doc.status.replace(/_/g, " ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Activity trail — real audit_logs data */}
                  <div>
                    <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Activity Trail
                    </h4>
                    {activity.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No recorded activity yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {activity.map((a, i) => (
                          <div key={i} className="bg-slate-50 border border-slate-200 p-2 rounded-lg flex justify-between items-center text-[10px]">
                            <span className="text-slate-700">
                              {a.action.replace(/_/g, " ")}
                              {a.actor_name && <span className="text-slate-400"> · by {a.actor_name}</span>}
                            </span>
                            <span className="text-slate-400 font-mono shrink-0 ml-2">
                              {new Date(a.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-slate-100 flex gap-2">
              {selectedCustomer.status === "blacklisted" ? (
                <button
                  onClick={() => handleSetStatus("active")}
                  disabled={statusSaving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition"
                >
                  {statusSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Restore Customer
                </button>
              ) : (
                <button
                  onClick={() => setShowBlacklistModal(true)}
                  className="flex-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition"
                >
                  <Ban className="w-3.5 h-3.5" /> Blacklist
                </button>
              )}
              <button
                onClick={() => handleDelete(selectedCustomer)}
                className="px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add customer modal */}
      {showAddCustomer && (
        <Modal title="Register New Customer" subtitle="Add a customer to your company directory"
          onClose={() => setShowAddCustomer(false)} maxWidth="max-w-3xl">
          <CustomerForm onSubmit={handleAddCustomer} onCancel={() => setShowAddCustomer(false)} />
        </Modal>
      )}

      {/* Blacklist modal */}
      {showBlacklistModal && selectedCustomer && (
        <Modal title="Blacklist Customer" subtitle={selectedCustomer.full_name}
          onClose={() => { setShowBlacklistModal(false); setBlacklistReason(""); }}>
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              Blacklisted customers cannot have new documents created for them until restored.
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide block mb-1">Reason *</label>
              <textarea rows={3} value={blacklistReason}
                onChange={e => setBlacklistReason(e.target.value)}
                placeholder="e.g. Provided fraudulent identification documents"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white p-2.5 text-sm rounded-xl outline-none resize-none" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowBlacklistModal(false); setBlacklistReason(""); }}
                className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleSetStatus("blacklisted", blacklistReason)}
                disabled={statusSaving || !blacklistReason.trim()}
                className="px-6 py-2.5 text-sm bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl font-semibold flex items-center gap-2">
                {statusSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Confirm Blacklist
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
