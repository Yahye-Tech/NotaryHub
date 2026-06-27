// ─── NotaryHub Production Forms ──────────────────────────────────────────────
// All forms match the real database schema exactly.
// No fake fields. No missing fields. No placeholders.

import React, { useState, useRef } from "react";
import {
  User, Mail, Phone, Lock, Hash, Camera, Briefcase,
  Building2, MapPin, Shield, ToggleLeft, ToggleRight,
  Loader2, AlertCircle, CheckCircle, Eye, EyeOff,
  Globe, CreditCard, FileText, X
} from "lucide-react";
import type { Employee, Branch, Tenant } from "../types";

// ─── Shared field components ──────────────────────────────────────────────────

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

function Field({ label, required, children, hint }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full bg-slate-50 border border-slate-200 focus:border-blue-400 focus:bg-white text-sm px-3.5 py-2.5 rounded-xl outline-none transition text-slate-900 placeholder-slate-400";

const selectClass =
  "w-full bg-slate-50 border border-slate-200 focus:border-blue-400 text-sm px-3.5 py-2.5 rounded-xl outline-none transition text-slate-900";

// ─── Password visibility toggle ───────────────────────────────────────────────

function PasswordInput({
  value,
  onChange,
  placeholder = "Min 8 chars, uppercase, number, special char",
  autoComplete = "new-password",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${inputClass} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── Photo upload (returns base64) ────────────────────────────────────────────

function PhotoUpload({
  value,
  onChange,
  name,
}: {
  value: string | null;
  onChange: (base64: string | null) => void;
  name: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-3">
      <div
        onClick={() => ref.current?.click()}
        className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 flex items-center justify-center cursor-pointer overflow-hidden transition shrink-0"
      >
        {value ? (
          <img src={value} alt={name} className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-5 h-5 text-slate-400" />
        )}
      </div>
      <div className="text-xs text-slate-500 space-y-1">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="text-blue-600 font-semibold hover:underline"
        >
          Upload photo
        </button>
        <p className="text-[10px] text-slate-400">JPG, PNG · Max 2MB</p>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-rose-500 text-[10px] hover:underline flex items-center gap-0.5"
          >
            <X className="w-3 h-3" /> Remove
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// EMPLOYEE FORM
// Fields: Full Name, Username, Email, Password, Phone, Employee ID,
//         Photo, Role, Branch, Department, 2FA, Status
// ═════════════════════════════════════════════════════════════════════════════

export interface EmployeeFormData {
  fullName: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  employeeId: string;
  photo: string | null;
  jobRole: Employee["job_role"];
  branchId: string;
  department: string;
  assignedCounter: string;
  require2fa: boolean;
  status: "active" | "suspended" | "offline";
}

interface EmployeeFormProps {
  branches: Branch[];
  initial?: Partial<EmployeeFormData>;
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  onCancel: () => void;
  mode?: "create" | "edit";
}

export function EmployeeForm({ branches, initial, onSubmit, onCancel, mode = "create" }: EmployeeFormProps) {
  const [form, setForm] = useState<EmployeeFormData>({
    fullName:        initial?.fullName        ?? "",
    username:        initial?.username        ?? "",
    email:           initial?.email           ?? "",
    password:        initial?.password        ?? "",
    phone:           initial?.phone           ?? "",
    employeeId:      initial?.employeeId      ?? `EMP-${Date.now().toString().slice(-6)}`,
    photo:           initial?.photo           ?? null,
    jobRole:         initial?.jobRole         ?? "NOTARY_OFFICER",
    branchId:        initial?.branchId        ?? branches[0]?.id ?? "",
    department:      initial?.department      ?? "Notary Operations",
    assignedCounter: initial?.assignedCounter ?? "",
    require2fa:      initial?.require2fa      ?? false,
    status:          initial?.status          ?? "active",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const set = <K extends keyof EmployeeFormData>(key: K, val: EmployeeFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!form.fullName.trim())  { setError("Full name is required."); return; }
    if (!form.email.trim())     { setError("Email is required."); return; }
    if (!form.branchId)         { setError("Please select a branch."); return; }
    if (mode === "create") {
      if (!form.password)       { setError("Password is required."); return; }
      if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    }

    setLoading(true);
    try {
      await onSubmit(form);
    } catch (err: any) {
      setError(err.message ?? "Failed to save employee.");
    } finally {
      setLoading(false);
    }
  };

  const deptOptions = [
    "Notary Operations",
    "Customer Services",
    "Document Processing",
    "Compliance & Legal",
    "Administration",
    "Finance",
    "IT Support",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {error && (
        <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Photo */}
      <Field label="Profile Photo">
        <PhotoUpload
          value={form.photo}
          onChange={v => set("photo", v)}
          name={form.fullName || "Employee"}
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Full Name */}
        <Field label="Full Name" required>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              required
              value={form.fullName}
              onChange={e => set("fullName", e.target.value)}
              placeholder="Ahmed Hassan Omar"
              className={`${inputClass} pl-10`}
            />
          </div>
        </Field>

        {/* Username */}
        <Field label="Username" hint="Used for login, no spaces">
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={form.username}
              onChange={e => set("username", e.target.value.toLowerCase().replace(/\s+/g, ""))}
              placeholder="ahmed.hassan"
              className={`${inputClass} pl-10 font-mono`}
            />
          </div>
        </Field>

        {/* Email */}
        <Field label="Email Address" required>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              required
              value={form.email}
              onChange={e => set("email", e.target.value)}
              placeholder="ahmed.hassan@company.com"
              className={`${inputClass} pl-10`}
              autoComplete="off"
            />
          </div>
        </Field>

        {/* Phone */}
        <Field label="Phone Number">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="tel"
              value={form.phone}
              onChange={e => set("phone", e.target.value)}
              placeholder="+252 61 234 5678"
              className={`${inputClass} pl-10`}
            />
          </div>
        </Field>

        {/* Password — only required on create */}
        <Field
          label={mode === "create" ? "Password" : "New Password (leave blank to keep)"}
          required={mode === "create"}
        >
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <PasswordInput
              value={form.password}
              onChange={v => set("password", v)}
            />
          </div>
        </Field>

        {/* Employee ID */}
        <Field label="Employee ID" hint="Auto-generated, can be edited">
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={form.employeeId}
              onChange={e => set("employeeId", e.target.value)}
              placeholder="EMP-000001"
              className={`${inputClass} pl-10 font-mono`}
            />
          </div>
        </Field>

        {/* Role */}
        <Field label="Role" required>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={form.jobRole}
              onChange={e => set("jobRole", e.target.value as Employee["job_role"])}
              className={`${selectClass} pl-10`}
            >
              <option value="NOTARY_OFFICER">Notary Officer</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="BRANCH_ADMIN">Branch Admin</option>
            </select>
          </div>
        </Field>

        {/* Branch */}
        <Field label="Branch" required>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              required
              value={form.branchId}
              onChange={e => set("branchId", e.target.value)}
              className={`${selectClass} pl-10`}
            >
              <option value="">— Select branch —</option>
              {branches.filter(b => b.status === "active").map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </Field>

        {/* Department */}
        <Field label="Department">
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={form.department}
              onChange={e => set("department", e.target.value)}
              className={`${selectClass} pl-10`}
            >
              {deptOptions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </Field>

        {/* Assigned Counter */}
        <Field label="Assigned Counter / Desk" hint="Leave blank to auto-assign">
          <input
            type="number"
            min={1}
            max={99}
            value={form.assignedCounter}
            onChange={e => set("assignedCounter", e.target.value)}
            placeholder="e.g. 3"
            className={inputClass}
          />
        </Field>
      </div>

      {/* 2FA */}
      <Field label="Two-Factor Authentication (2FA)">
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Require 2FA on login</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Employee must set up an authenticator app before first login
            </p>
          </div>
          <button
            type="button"
            onClick={() => set("require2fa", !form.require2fa)}
            className="shrink-0"
          >
            {form.require2fa
              ? <ToggleRight className="w-8 h-8 text-blue-600" />
              : <ToggleLeft className="w-8 h-8 text-slate-300" />
            }
          </button>
        </div>
      </Field>

      {/* Status */}
      <Field label="Account Status" required>
        <div className="grid grid-cols-3 gap-2">
          {(["active", "offline", "suspended"] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => set("status", s)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition capitalize ${
                form.status === s
                  ? s === "active"
                    ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                    : s === "suspended"
                    ? "bg-rose-50 border-rose-400 text-rose-700"
                    : "bg-slate-100 border-slate-400 text-slate-700"
                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-semibold flex items-center gap-2 transition"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : <><CheckCircle className="w-4 h-4" /> {mode === "create" ? "Create Employee" : "Save Changes"}</>
          }
        </button>
      </div>
    </form>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// BRANCH FORM
// Fields: Branch Name, Address, Phone, Counters Count, Status
// ═════════════════════════════════════════════════════════════════════════════

export interface BranchFormData {
  name: string;
  address: string;
  phone: string;
  countersCount: number;
  status: Branch["status"];
}

interface BranchFormProps {
  initial?: Partial<BranchFormData>;
  onSubmit: (data: BranchFormData) => Promise<void>;
  onCancel: () => void;
  mode?: "create" | "edit";
}

export function BranchForm({ initial, onSubmit, onCancel, mode = "create" }: BranchFormProps) {
  const [form, setForm] = useState<BranchFormData>({
    name:          initial?.name          ?? "",
    address:       initial?.address       ?? "",
    phone:         initial?.phone         ?? "",
    countersCount: initial?.countersCount ?? 2,
    status:        initial?.status        ?? "active",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const set = <K extends keyof BranchFormData>(key: K, val: BranchFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim())    { setError("Branch name is required."); return; }
    if (!form.address.trim()) { setError("Address is required."); return; }

    setLoading(true);
    try {
      await onSubmit(form);
    } catch (err: any) {
      setError(err.message ?? "Failed to save branch.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <Field label="Branch Name" required>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            required
            value={form.name}
            onChange={e => set("name", e.target.value)}
            placeholder="e.g. Bosaso Main Branch"
            className={`${inputClass} pl-10`}
          />
        </div>
      </Field>

      <Field label="Full Address" required>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <textarea
            required
            rows={2}
            value={form.address}
            onChange={e => set("address", e.target.value)}
            placeholder="Street, district, city, country"
            className={`${inputClass} pl-10 resize-none`}
          />
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone Number">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="tel"
              value={form.phone}
              onChange={e => set("phone", e.target.value)}
              placeholder="+252 90 000 0000"
              className={`${inputClass} pl-10`}
            />
          </div>
        </Field>

        <Field label="Number of Counters" required hint="Service desks / windows">
          <input
            type="number"
            required
            min={1}
            max={50}
            value={form.countersCount}
            onChange={e => set("countersCount", parseInt(e.target.value, 10) || 1)}
            className={inputClass}
          />
        </Field>
      </div>

      {mode === "edit" && (
        <Field label="Status" required>
          <div className="grid grid-cols-3 gap-2">
            {(["active", "suspended", "archived"] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => set("status", s)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition capitalize ${
                  form.status === s
                    ? s === "active"
                      ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                      : s === "suspended"
                      ? "bg-amber-50 border-amber-400 text-amber-700"
                      : "bg-slate-100 border-slate-400 text-slate-700"
                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition">
          Cancel
        </button>
        <button type="submit" disabled={loading}
          className="px-6 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-semibold flex items-center gap-2 transition">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : <><CheckCircle className="w-4 h-4" /> {mode === "create" ? "Create Branch" : "Save Changes"}</>
          }
        </button>
      </div>
    </form>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// TENANT / COMPANY FORM
// Fields: Company Name, Subdomain, Plan, Admin Email, License Number,
//         Contact Name, Contact Phone, Address, Country, Timezone
// ═════════════════════════════════════════════════════════════════════════════

export interface TenantFormData {
  name: string;
  subdomain: string;
  plan: Tenant["plan"];
  email: string;
  licenseNumber: string;
  contactName: string;
  contactPhone: string;
  address: string;
  country: string;
  timezone: string;
}

interface TenantFormProps {
  initial?: Partial<TenantFormData>;
  onSubmit: (data: TenantFormData) => Promise<void>;
  onCancel: () => void;
  mode?: "create" | "edit";
}

export function TenantForm({ initial, onSubmit, onCancel, mode = "create" }: TenantFormProps) {
  const [form, setForm] = useState<TenantFormData>({
    name:         initial?.name         ?? "",
    subdomain:    initial?.subdomain    ?? "",
    plan:         initial?.plan         ?? "Professional",
    email:        initial?.email        ?? "",
    licenseNumber:initial?.licenseNumber ?? "",
    contactName:  initial?.contactName  ?? "",
    contactPhone: initial?.contactPhone ?? "",
    address:      initial?.address      ?? "",
    country:      initial?.country      ?? "Somalia",
    timezone:     initial?.timezone     ?? "Africa/Mogadishu",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const set = <K extends keyof TenantFormData>(key: K, val: TenantFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  // Auto-generate subdomain from name
  const handleNameChange = (v: string) => {
    set("name", v);
    if (!initial?.subdomain) {
      set("subdomain", v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim())      { setError("Company name is required."); return; }
    if (!form.subdomain.trim()) { setError("Subdomain is required."); return; }
    if (!form.email.trim())     { setError("Admin email is required."); return; }
    if (!form.licenseNumber.trim()) { setError("License number is required."); return; }
    if (!/^[a-z0-9-]+$/.test(form.subdomain)) {
      setError("Subdomain can only contain lowercase letters, numbers, and hyphens."); return;
    }

    setLoading(true);
    try {
      await onSubmit(form);
    } catch (err: any) {
      setError(err.message ?? "Failed to save company.");
    } finally {
      setLoading(false);
    }
  };

  const timezones = [
    "Africa/Mogadishu", "Africa/Nairobi", "Africa/Djibouti",
    "Asia/Dubai", "Europe/London", "UTC",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Company Name */}
        <Field label="Company / Organization Name" required>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              required
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Bosaso Notary Services"
              className={`${inputClass} pl-10`}
            />
          </div>
        </Field>

        {/* Subdomain */}
        <Field label="Subdomain" required hint="URL prefix — lowercase, hyphens only">
          <div className="flex">
            <input
              type="text"
              required
              value={form.subdomain}
              onChange={e => set("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="bosaso-notary"
              className={`${inputClass} rounded-r-none font-mono`}
            />
            <span className="bg-slate-100 border border-l-0 border-slate-200 text-[11px] px-3 flex items-center rounded-r-xl text-slate-500 font-mono whitespace-nowrap">
              .notaryhub.app
            </span>
          </div>
        </Field>

        {/* Plan */}
        <Field label="Subscription Plan" required>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={form.plan}
              onChange={e => set("plan", e.target.value as Tenant["plan"])}
              className={`${selectClass} pl-10`}
            >
              <option value="Basic">Basic — $299/mo (1 branch, 5 employees)</option>
              <option value="Professional">Professional — $799/mo (5 branches, 25 employees)</option>
              <option value="Enterprise">Enterprise — $1,999/mo (unlimited)</option>
            </select>
          </div>
        </Field>

        {/* Admin Email */}
        <Field label="Admin Email Address" required>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              required
              value={form.email}
              onChange={e => set("email", e.target.value)}
              placeholder="admin@company.com"
              className={`${inputClass} pl-10`}
            />
          </div>
        </Field>

        {/* License Number */}
        <Field label="License / Registration Number" required>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              required
              value={form.licenseNumber}
              onChange={e => set("licenseNumber", e.target.value)}
              placeholder="LIC-2026-00001"
              className={`${inputClass} pl-10 font-mono`}
            />
          </div>
        </Field>

        {/* Contact Name */}
        <Field label="Primary Contact Name">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={form.contactName}
              onChange={e => set("contactName", e.target.value)}
              placeholder="Ahmed Farah"
              className={`${inputClass} pl-10`}
            />
          </div>
        </Field>

        {/* Contact Phone */}
        <Field label="Contact Phone">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="tel"
              value={form.contactPhone}
              onChange={e => set("contactPhone", e.target.value)}
              placeholder="+252 90 000 0000"
              className={`${inputClass} pl-10`}
            />
          </div>
        </Field>

        {/* Country */}
        <Field label="Country">
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={form.country}
              onChange={e => set("country", e.target.value)}
              className={`${selectClass} pl-10`}
            >
              <option value="Somalia">Somalia</option>
              <option value="Ethiopia">Ethiopia</option>
              <option value="Kenya">Kenya</option>
              <option value="Djibouti">Djibouti</option>
              <option value="UAE">United Arab Emirates</option>
              <option value="UK">United Kingdom</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </Field>

        {/* Timezone */}
        <Field label="Timezone">
          <select
            value={form.timezone}
            onChange={e => set("timezone", e.target.value)}
            className={selectClass}
          >
            {timezones.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Address */}
      <Field label="Registered Address">
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <textarea
            rows={2}
            value={form.address}
            onChange={e => set("address", e.target.value)}
            placeholder="Street, district, city, country"
            className={`${inputClass} pl-10 resize-none`}
          />
        </div>
      </Field>

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition">
          Cancel
        </button>
        <button type="submit" disabled={loading}
          className="px-6 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-semibold flex items-center gap-2 transition">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : <><CheckCircle className="w-4 h-4" /> {mode === "create" ? "Create Company" : "Save Changes"}</>
          }
        </button>
      </div>
    </form>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// MODAL WRAPPER — reusable overlay for any form
// ═════════════════════════════════════════════════════════════════════════════

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ title, subtitle, onClose, children, maxWidth = "max-w-2xl" }: ModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[92vh] overflow-y-auto`}>
        <div className="flex items-start justify-between p-5 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
