import { useState, useEffect, useCallback } from "react";
import {
  CreditCard, CheckCircle2, Plus, X, Loader2, Ban, AlertTriangle
} from "lucide-react";
import { invoicesApi, type Invoice, type InvoiceStats, type PaymentMethod } from "../../api/invoices.api";
import { customersApi } from "../../api/documents.api";
import { branchesApi } from "../../api/tenants.api";
import { authApi } from "../../api/auth.api";
import type { Customer, Branch } from "../../types";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "other", label: "Other" },
];

type LineItemDraft = { description: string; quantity: number; unitPrice: number };

export default function CompanyAdminBilling() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const me = await authApi.me();
      setTenantId(me.tenantId);

      const [invRes, statsRes, custRes] = await Promise.all([
        invoicesApi.list(filter === "all" ? undefined : { status: filter as any }),
        invoicesApi.stats(),
        customersApi.list(),
      ]);
      setInvoices(invRes.invoices);
      setStats(statsRes);
      setCustomers(custRes.customers);

      if (me.tenantId) {
        const branchRes = await branchesApi.list(me.tenantId);
        setBranches(branchRes.branches);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handlePay = async (invoice: Invoice, method: PaymentMethod) => {
    setPayingId(invoice.id);
    setErrorMsg(null);
    try {
      const result = await invoicesApi.pay(invoice.id, method);
      setInvoices(prev => prev.map(inv => (inv.id === invoice.id ? result.invoice : inv)));
      setSelectedInvoice(result.invoice);
      await loadAll();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to record payment");
    } finally {
      setPayingId(null);
    }
  };

  const handleVoid = async (invoice: Invoice) => {
    if (!confirm(`Void invoice ${invoice.invoice_number}? This cannot be undone.`)) return;
    setErrorMsg(null);
    try {
      const result = await invoicesApi.void(invoice.id);
      setInvoices(prev => prev.map(inv => (inv.id === invoice.id ? result.invoice : inv)));
      setSelectedInvoice(result.invoice);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to void invoice");
    }
  };

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const statusStyle = (status: string) =>
    status === "paid"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : status === "overdue"
      ? "bg-rose-50 text-rose-700 border border-rose-200"
      : status === "void"
      ? "bg-slate-100 text-slate-500 border border-slate-200"
      : "bg-amber-50 text-amber-700 border border-amber-200";

  return (
    <div className="space-y-6" id="company-admin-billing-sub">

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {errorMsg}
        </div>
      )}

      {/* Finance header summary cards — real data from /api/invoices/stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 font-sans">Total Invoiced</span>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats ? fmt(stats.totalInvoicedCents) : "—"}
            </span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-sans font-medium">Collected</span>
            {stats && (
              <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono font-black">
                {stats.collectionRate}%
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-2xl font-bold text-emerald-600 tracking-tight">
              {stats ? fmt(stats.totalPaidCents) : "—"}
            </span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 font-sans">Outstanding</span>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-2xl font-bold text-amber-600 tracking-tight">
              {stats ? fmt(stats.totalOutstandingCents) : "—"}
            </span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 font-sans">Overdue</span>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-2xl font-bold text-rose-600 tracking-tight">
              {stats ? fmt(stats.totalOverdueCents) : "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Invoices</span>
            <div className="flex gap-2 items-center">
              {["all", "unpaid", "paid", "overdue", "void"].map(st => (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  className={`px-3 py-1 text-[11px] rounded transition uppercase font-mono font-bold outline-none cursor-pointer ${
                    filter === st
                      ? "bg-slate-900 border border-slate-950 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {st}
                </button>
              ))}
              <button
                onClick={() => setShowCreateModal(true)}
                className="ml-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-3 py-1.5 rounded flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-550">
                    <th className="p-4 font-bold">Invoice</th>
                    <th className="p-4 font-bold">Customer</th>
                    <th className="p-4 font-bold">Total</th>
                    <th className="p-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {loading ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
                  ) : invoices.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No invoices yet.</td></tr>
                  ) : (
                    invoices.map(inv => (
                      <tr
                        key={inv.id}
                        onClick={() => setSelectedInvoice(inv)}
                        className={`hover:bg-slate-50/50 transition cursor-pointer ${
                          selectedInvoice?.id === inv.id ? "bg-blue-50/20" : ""
                        }`}
                      >
                        <td className="p-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                        <td className="p-4">
                          <span className="font-bold block text-slate-900 font-sans">{inv.customer_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">Due: {inv.due_date}</span>
                        </td>
                        <td className="p-4 font-bold font-mono text-slate-800">{fmt(inv.total_cents)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-sans font-bold leading-none uppercase ${statusStyle(inv.effective_status)}`}>
                            {inv.effective_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Selected Invoice Details Drawer Pane */}
        {selectedInvoice ? (
          <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4" id="invoice-view-detail-box">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
              <div>
                <span className="text-[9px] font-mono text-blue-600 font-bold uppercase tracking-widest block">Notary Office Invoice</span>
                <h3 className="text-base font-sans font-bold text-slate-900 mt-1">Invoice {selectedInvoice.invoice_number}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Billed to: <span className="font-bold text-slate-750">{selectedInvoice.customer_name}</span></p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-[9px] font-mono text-slate-450 uppercase block font-bold tracking-wider">Line Items</span>
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-lg border border-slate-150">
                {selectedInvoice.items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center font-sans text-slate-700 text-[11px]">
                    <span className="font-medium">{item.description} {item.quantity > 1 ? `× ${item.quantity}` : ""}</span>
                    <span className="font-mono font-bold text-slate-900">{fmt(item.line_total_cents)}</span>
                  </div>
                ))}
                {selectedInvoice.tax_cents > 0 && (
                  <div className="flex justify-between items-center font-sans text-slate-500 text-[11px]">
                    <span>Tax</span>
                    <span className="font-mono">{fmt(selectedInvoice.tax_cents)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-200 font-sans font-bold text-slate-950 text-xs">
                  <span>Total</span>
                  <span className="font-mono text-xs">{fmt(selectedInvoice.total_cents)}</span>
                </div>
              </div>
            </div>

            {selectedInvoice.status === "paid" && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex gap-2 items-center text-emerald-700">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div className="leading-tight">
                  <span className="font-bold block text-[10px] tracking-wide uppercase">Paid</span>
                  <span className="text-[10px]">via {selectedInvoice.payment_method} on {selectedInvoice.paid_at?.slice(0, 10)}</span>
                </div>
              </div>
            )}

            {selectedInvoice.status === "unpaid" && (
              <div className="space-y-2">
                <span className="text-[9px] font-mono text-slate-450 uppercase block font-bold tracking-wider">Record Payment</span>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(pm => (
                    <button
                      key={pm.value}
                      disabled={payingId === selectedInvoice.id}
                      onClick={() => handlePay(selectedInvoice, pm.value)}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-[11px] py-2 rounded-lg flex items-center justify-center gap-1.5 transition"
                    >
                      {payingId === selectedInvoice.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                      {pm.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleVoid(selectedInvoice)}
                  className="w-full text-rose-600 hover:text-rose-700 text-[11px] font-bold py-1.5 flex items-center justify-center gap-1"
                >
                  <Ban className="w-3.5 h-3.5" /> Void Invoice
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-5 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-6 text-center italic text-slate-400 text-xs h-[300px] flex items-center justify-center">
            Select an invoice to view details or record a payment.
          </div>
        )}
      </div>

      {showCreateModal && tenantId && (
        <CreateInvoiceModal
          customers={customers}
          branches={branches}
          onClose={() => setShowCreateModal(false)}
          onCreated={async () => {
            setShowCreateModal(false);
            await loadAll();
          }}
        />
      )}
    </div>
  );
}

// ─── Create invoice modal ───────────────────────────────────────────────────
function CreateInvoiceModal({
  customers,
  branches,
  onClose,
  onCreated,
}: {
  customers: Customer[];
  branches: Branch[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [items, setItems] = useState<LineItemDraft[]>([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateItem = (idx: number, patch: Partial<LineItemDraft>) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const total = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

  const handleSubmit = async () => {
    setError(null);
    if (!customerId) { setError("Select a customer"); return; }
    const validItems = items.filter(it => it.description.trim() && it.unitPrice >= 0 && it.quantity > 0);
    if (validItems.length === 0) { setError("Add at least one line item"); return; }

    setSubmitting(true);
    try {
      await invoicesApi.create({
        customerId,
        branchId: branchId || undefined,
        dueDate,
        items: validItems.map(it => ({
          description: it.description.trim(),
          quantity: it.quantity,
          unitPriceCents: Math.round(it.unitPrice * 100),
        })),
      });
      onCreated();
    } catch (err: any) {
      setError(err?.message || "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900">New Invoice</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">{error}</div>}

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Customer</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5">
              <option value="">Select customer…</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Branch (optional)</label>
              <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5">
                <option value="">—</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Line Items</label>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                  <input
                    className="col-span-6 border border-slate-300 rounded px-2 py-1.5"
                    placeholder="Description"
                    value={it.description}
                    onChange={e => updateItem(idx, { description: e.target.value })}
                  />
                  <input
                    type="number" min={1}
                    className="col-span-2 border border-slate-300 rounded px-2 py-1.5"
                    value={it.quantity}
                    onChange={e => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                  />
                  <input
                    type="number" min={0} step={0.01}
                    className="col-span-3 border border-slate-300 rounded px-2 py-1.5"
                    placeholder="Unit $"
                    value={it.unitPrice}
                    onChange={e => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                  />
                  <button
                    className="col-span-1 text-slate-400 hover:text-rose-600"
                    onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setItems(prev => [...prev, { description: "", quantity: 1, unitPrice: 0 }])}
              className="mt-2 text-blue-600 hover:text-blue-700 text-[11px] font-bold flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add line
            </button>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-100 font-bold text-slate-900">
            <span>Total</span>
            <span className="font-mono">${total.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Create Invoice
        </button>
      </div>
    </div>
  );
}
