import React, { useState } from "react";
import { 
  TrendingUp, CreditCard, Landmark, DollarSign, 
  Receipt, ArrowUpRight, CheckCircle2, ShieldCheck, RefreshCw 
} from "lucide-react";
import { Invoice } from "../../types";

export default function CompanyAdminBilling() {
  
  // High fidelity business invoices list
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: "inv-201",
      invoiceNumber: "INV-229104",
      customerName: "Ahmed Ali",
      amount: 150.00,
      dueDate: "2026-06-25",
      status: "paid",
      items: [
        { description: "General Power of Attorney Notarization", price: 100 },
        { description: "Biometric Fingerprint Minutiae Stamp Duty", price: 50 }
      ]
    },
    {
      id: "inv-202",
      invoiceNumber: "INV-229105",
      customerName: "Fartun Farah",
      amount: 80.00,
      dueDate: "2026-06-20",
      status: "paid",
      items: [
        { description: "Custom Declaration Deed Verification", price: 80 }
      ]
    },
    {
      id: "inv-203",
      invoiceNumber: "INV-229106",
      customerName: "Arthur Pendelton",
      amount: 250.00,
      dueDate: "2026-06-28",
      status: "unpaid",
      items: [
        { description: "Escrow Contract Notarization Draft", price: 150 },
        { description: "Special Witness Board Registration Fee", price: 100 }
      ]
    },
    {
      id: "inv-204",
      invoiceNumber: "INV-229107",
      customerName: "Alexander Westmoreland",
      amount: 120.00,
      dueDate: "2026-06-02",
      status: "overdue",
      items: [
        { description: "Affidavit of Identity Verification Flow", price: 120 }
      ]
    }
  ]);

  const [filter, setFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(invoices[0]);

  const handlePayInvoiceSim = (id: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        alert(`Initializing payment processing...\n\nInvoice balance of $${inv.amount.toFixed(2)} has been recorded as PAID via cash/Stripe ledger reconciliation.`);
        const updated = { ...inv, status: "paid" as const };
        setSelectedInvoice(updated);
        return updated;
      }
      return inv;
    }));
  };

  const filteredInvoices = invoices.filter(inv => filter === "all" || inv.status === filter);

  // Stats calculation
  const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.amount, 0);
  const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((acc, inv) => acc + inv.amount, 0);
  const totalUnpaid = invoices.filter(inv => inv.status === 'unpaid').reduce((acc, inv) => acc + inv.amount, 0);

  return (
    <div className="space-y-6" id="company-admin-billing-sub">
      
      {/* Finance header summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-sans">Total Gross Issued</span>
            <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-120 px-2 py-0.5 rounded font-mono font-bold">Ledger Ledger</span>
          </div>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">${totalInvoiced.toFixed(2)}</span>
            <span className="text-xs text-slate-400">USD</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-sans font-medium">Settled / Collected</span>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-120 px-2 py-0.5 rounded font-mono font-black">94.2% Rate</span>
          </div>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-2xl font-bold text-emerald-600 tracking-tight">${totalPaid.toFixed(2)}</span>
            <span className="text-xs text-slate-400">Stripe/Cash</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-sans">Total Receivables Outstanding</span>
            <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-120 px-2 py-0.5 rounded font-mono">Unpaid invoice list</span>
          </div>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-2xl font-bold text-amber-600 tracking-tight">${totalUnpaid.toFixed(2)}</span>
            <span className="text-xs text-slate-400">Pending collections</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Invoice list table (7 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Roster Ledger</span>
            <div className="flex gap-2">
              {["all", "paid", "unpaid", "overdue"].map(st => (
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
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-550">
                    <th className="p-4 font-bold">Invoice Number</th>
                    <th className="p-4 font-bold">Client Name</th>
                    <th className="p-4 font-bold">Gross Total</th>
                    <th className="p-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredInvoices.map(inv => (
                    <tr 
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className={`hover:bg-slate-50/50 transition cursor-pointer ${
                        selectedInvoice?.id === inv.id ? "bg-blue-50/20" : ""
                      }`}
                    >
                      <td className="p-4 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-4">
                        <span className="font-bold block text-slate-900 font-sans">{inv.customerName}</span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">Due date: {inv.dueDate}</span>
                      </td>
                      <td className="p-4 font-bold font-mono text-slate-800">
                        ${inv.amount.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-sans font-bold leading-none uppercase ${
                          inv.status === "paid" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-250" 
                            : inv.status === "overdue" 
                            ? "bg-rose-50 text-rose-700 border border-rose-200" 
                            : "bg-amber-50 text-amber-705 border border-amber-200"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Selected Invoice Details Drawer Pane (5 Columns) */}
        {selectedInvoice ? (
          <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4" id="invoice-view-detail-box">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[9px] font-mono text-blue-600 font-bold uppercase tracking-widest block">Notary Office Bills Receipt</span>
              <h3 className="text-base font-sans font-bold text-slate-900 mt-1">Invoice {selectedInvoice.invoiceNumber}</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Billed to: <span className="font-bold text-slate-750">{selectedInvoice.customerName}</span></p>
            </div>

            {/* Bill List */}
            <div className="space-y-2 text-xs">
              <span className="text-[9px] font-mono text-slate-450 uppercase block font-bold tracking-wider">Itemized Fees Breakdowns</span>
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-lg border border-slate-150">
                {selectedInvoice.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center font-sans text-slate-700 text-[11px]">
                    <span className="font-medium">{item.description}</span>
                    <span className="font-mono font-bold text-slate-900">${item.price.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-slate-200 font-sans font-bold text-slate-950 font-sans text-xs">
                  <span>Gross Total</span>
                  <span className="font-mono text-xs">${selectedInvoice.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Stripe connection banner */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex gap-2 items-center text-slate-500">
              <CreditCard className="w-5 h-5 text-slate-400 shrink-0" />
              <div className="leading-tight">
                <span className="font-bold block text-slate-800 text-[10px] tracking-wide uppercase">Stripe Processing Platform</span>
                <span className="text-[10px]">Secure tokenized bank settlement active</span>
              </div>
            </div>

            {/* Pay action */}
            {selectedInvoice.status !== "paid" && (
              <button
                onClick={() => handlePayInvoiceSim(selectedInvoice.id)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition outline-none cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Record Cash / Card Payment</span>
              </button>
            )}

          </div>
        ) : (
          <div className="lg:col-span-5 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-6 text-center italic text-slate-400 text-xs h-[300px] flex items-center justify-center">
            Select an invoice to check details or post cash receipt balances.
          </div>
        )}

      </div>

    </div>
  );
}
