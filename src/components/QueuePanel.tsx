import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Users, Bell, CheckCircle2, SkipForward, RotateCcw,
  X, Loader2, AlertCircle, RefreshCw, UserPlus, Volume2,
  Clock, BarChart3, ChevronRight, Circle
} from "lucide-react";
import { QueueTicket } from "../types";
import { queueApi, type QueueStats } from "../api/queue.api";
import { ApiException } from "../api/client";

const STATUS_STYLES: Record<string, string> = {
  waiting:   "bg-slate-100 text-slate-600",
  calling:   "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse",
  serving:   "bg-blue-50 text-blue-700 border border-blue-200",
  completed: "bg-emerald-50 text-emerald-700",
  passed:    "bg-slate-200 text-slate-500",
  cancelled: "bg-rose-50 text-rose-400 line-through",
};

const STATUS_LABELS: Record<string, string> = {
  waiting:   "Waiting",
  calling:   "Being Called",
  serving:   "In Service",
  completed: "Completed",
  passed:    "Passed",
  cancelled: "Cancelled",
};

const SERVICE_TYPES = [
  "Power of Attorney",
  "Affidavit",
  "Deed Signing",
  "Contract Notarisation",
  "Statutory Declaration",
  "Certified Copy",
  "Authentication",
  "General Enquiry",
];

interface Props {
  branchId?: string;
}

export default function QueuePanel({ branchId }: Props) {
  const [tickets, setTickets]         = useState<QueueTicket[]>([]);
  const [stats, setStats]             = useState<QueueStats | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [actionLoading, setAction]    = useState<string | null>(null);

  // Check-in form
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [custName, setCustName]       = useState("");
  const [svcType, setSvcType]         = useState(SERVICE_TYPES[0]);
  const [checkingIn, setCheckingIn]   = useState(false);

  // Auto-refresh every 15 seconds
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await queueApi.list(branchId);
      setTickets(res.tickets);
      setStats(res.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const doAction = useCallback(async (
    id: string,
    fn: () => Promise<{ ticket: QueueTicket }>
  ) => {
    setAction(id);
    try {
      const res = await fn();
      setTickets(prev => prev.map(t => t.id === res.ticket.id ? res.ticket : t));
      await load(); // refresh stats
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Action failed");
    } finally {
      setAction(null);
    }
  }, [load]);

  const handleCallNext = useCallback(async () => {
    setAction("call-next");
    try {
      const res = await queueApi.callNext(branchId);
      setTickets(prev => prev.map(t => t.id === res.ticket.id ? res.ticket : t));
      await load();
    } catch (err) {
      const msg = err instanceof ApiException ? err.message : "Failed to call next";
      alert(msg);
    } finally {
      setAction(null);
    }
  }, [branchId, load]);

  const handleCheckIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;
    setCheckingIn(true);
    try {
      const res = await queueApi.checkIn({
        customerName: custName,
        serviceType: svcType,
        branchId,
      });
      setTickets(prev => [...prev, res.ticket]);
      setCustName("");
      setSvcType(SERVICE_TYPES[0]);
      setShowCheckIn(false);
      await load();
    } catch (err) {
      alert(err instanceof ApiException ? err.message : "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  }, [custName, svcType, branchId, load]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const today = new Date().toISOString().slice(0, 10);
  const todaysTickets = tickets.filter(t => t.ticket_date === today);
  const waiting   = todaysTickets.filter(t => t.status === "waiting");
  const active    = todaysTickets.filter(t => ["calling", "serving"].includes(t.status));
  const done      = todaysTickets.filter(t => ["completed", "passed", "cancelled"].includes(t.status));

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        <span className="text-sm">Loading queue…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Waiting",       value: stats.waiting,        color: "text-amber-600",   bg: "bg-amber-50 border-amber-200"   },
            { label: "In Service",    value: stats.serving,        color: "text-blue-600",    bg: "bg-blue-50 border-blue-200"     },
            { label: "Done Today",    value: stats.completedToday, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200"},
            { label: "Avg Wait",      value: stats.averageWaitMinutes != null ? `${stats.averageWaitMinutes}m` : "—",
              color: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
          ].map(k => (
            <div key={k.label} className={`border rounded-xl p-4 ${k.bg}`}>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wide block">{k.label}</span>
              <span className={`text-2xl font-bold ${k.color} block mt-0.5`}>{k.value}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={load} className="ml-1 underline font-semibold">Retry</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleCallNext}
          disabled={actionLoading === "call-next" || stats?.waiting === 0}
          className="bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition"
        >
          {actionLoading === "call-next"
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Bell className="w-3.5 h-3.5" />}
          Call Next
        </button>
        <button
          onClick={() => setShowCheckIn(!showCheckIn)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Check In Customer
        </button>
        <button onClick={load} className="border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs px-3 py-2.5 rounded-lg transition">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Check-in form */}
      {showCheckIn && (
        <form onSubmit={handleCheckIn}
          className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Customer Name *</label>
            <input
              type="text" required
              value={custName} onChange={e => setCustName(e.target.value)}
              placeholder="Full name or walk-in"
              className="w-full bg-white border border-slate-200 focus:border-blue-400 px-3 py-2.5 text-xs rounded-lg outline-none"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Service Type *</label>
            <select value={svcType} onChange={e => setSvcType(e.target.value)}
              className="w-full bg-white border border-slate-200 text-xs px-3 py-2.5 rounded-lg outline-none">
              {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={() => setShowCheckIn(false)}
              className="border border-slate-200 hover:bg-slate-50 text-xs px-4 py-2.5 rounded-lg">Cancel</button>
            <button type="submit" disabled={checkingIn}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5">
              {checkingIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Issue Ticket
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Waiting column */}
        <div>
          <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Waiting ({waiting.length})
          </h3>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {waiting.length === 0 ? (
              <p className="p-5 text-center text-xs text-slate-400 italic">No one waiting</p>
            ) : waiting.map(t => (
              <div key={t.id} className="p-3 flex justify-between items-center">
                <div>
                  <span className="font-mono text-sm font-bold text-slate-900">{t.ticket_number}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">{t.customer_name}</p>
                  <p className="text-[10px] text-slate-400">{t.service_type}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className="text-[9px] text-slate-400">
                    {new Date(t.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <button
                    onClick={() => doAction(t.id, () => queueApi.skip(t.id))}
                    disabled={actionLoading === t.id}
                    className="text-[10px] text-slate-400 hover:text-rose-500 transition flex items-center gap-0.5"
                    title="Skip"
                  >
                    {actionLoading === t.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <SkipForward className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active column */}
        <div>
          <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" /> Active ({active.length})
          </h3>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {active.length === 0 ? (
              <p className="p-5 text-center text-xs text-slate-400 italic">No active tickets</p>
            ) : active.map(t => (
              <div key={t.id} className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">{t.ticket_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${STATUS_STYLES[t.status]}`}>
                        {STATUS_LABELS[t.status]}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t.customer_name}</p>
                    {t.called_counter && (
                      <p className="text-[10px] text-blue-600 font-semibold mt-0.5">
                        Counter {t.called_counter}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {t.status === "calling" && (
                    <button
                      onClick={() => doAction(t.id, () => queueApi.markServing(t.id))}
                      disabled={actionLoading === t.id}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1"
                    >
                      {actionLoading === t.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <ChevronRight className="w-3 h-3" />}
                      Serving
                    </button>
                  )}
                  <button
                    onClick={() => doAction(t.id, () => queueApi.complete(t.id))}
                    disabled={actionLoading === t.id}
                    className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1"
                  >
                    {actionLoading === t.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <CheckCircle2 className="w-3 h-3" />}
                    Done
                  </button>
                  <button
                    onClick={() => doAction(t.id, () => queueApi.cancel(t.id))}
                    disabled={actionLoading === t.id}
                    className="p-1.5 border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Done / Passed column */}
        <div>
          <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Done Today ({done.length})
          </h3>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100">
            {done.length === 0 ? (
              <p className="p-5 text-center text-xs text-slate-400 italic">Nothing completed yet today</p>
            ) : done.map(t => (
              <div key={t.id} className="p-3 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-600">{t.ticket_number}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${STATUS_STYLES[t.status]}`}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t.customer_name}</p>
                </div>
                {t.status === "passed" && (
                  <button
                    onClick={() => doAction(t.id, () => queueApi.recall(t.id))}
                    disabled={actionLoading === t.id}
                    className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
                  >
                    {actionLoading === t.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <RotateCcw className="w-3 h-3" />}
                    Recall
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
