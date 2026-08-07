import { useState } from "react";
import { ShieldCheck, ToggleLeft, ToggleRight, HelpCircle, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import { permissionsApi, type Role, type PermissionKey, type PermissionsMatrix } from "../api/permissions.api";

export type { Role, PermissionKey, PermissionsMatrix };

interface PermissionsConfigProps {
  permissionsMatrix: PermissionsMatrix;
  onUpdatePermissions: (matrix: PermissionsMatrix) => void;
  // "platform" renders the SUPER_ADMIN default-editing view (no reset button,
  // writes go to /api/permissions/platform). "tenant" is the normal
  // COMPANY_ADMIN view with per-cell reset-to-default.
  scope?: "tenant" | "platform";
}

export default function PermissionsConfig({
  permissionsMatrix,
  onUpdatePermissions,
  scope = "tenant",
}: PermissionsConfigProps) {
  const [hoveredPermission, setHoveredPermission] = useState<PermissionKey | null>(null);
  const [pendingCell, setPendingCell] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const rolesList: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_ADMIN", "EMPLOYEE", "CUSTOMER"];
  const permissionsList: { key: PermissionKey; title: string; description: string }[] = [
    { key: "CREATE_DOCUMENT", title: "Create Document", description: "Allows creating and drafting notary documents and certificates." },
    { key: "EDIT_DOCUMENT", title: "Edit Document", description: "Enables modification of contract structures and principal clauses." },
    { key: "DELETE_DOCUMENT", title: "Delete Document", description: "Enables severe archival and hard deletion of historic notary records." },
    { key: "VIEW_REPORTS", title: "View Reports", description: "Grants access to company billing, employee KPI reviews, and branch performance statistics." },
    { key: "CREATE_EMPLOYEE", title: "Create Employee", description: "Enables onboarding, suspending, and editing role parameters for clerks." },
    { key: "CREATE_BRANCH", title: "Create Branch", description: "Allows establishing new physical and logical counter bureaus within the tenant domain." },
    { key: "MANAGE_SUBSCRIPTIONS", title: "Manage Subscriptions", description: "Allows upgrading, downgrading, or settling recurring subscription plans." },
    { key: "MANAGE_INVOICES", title: "Manage Invoices", description: "Allows creating, editing, and recording payments on customer invoices." },
  ];

  const cellId = (role: Role, key: PermissionKey) => `${role}:${key}`;

  const handleToggle = async (role: Role, permission: PermissionKey) => {
    if (role === "SUPER_ADMIN" && permission === "MANAGE_SUBSCRIPTIONS") {
      setErrorMsg("SUPER_ADMIN must always retain subscription management access — this permission is locked server-side.");
      return;
    }

    const id = cellId(role, permission);
    const nextValue = !permissionsMatrix[role][permission];
    setPendingCell(id);
    setErrorMsg(null);

    try {
      const result =
        scope === "platform"
          ? await permissionsApi.setPlatform(role, permission, nextValue)
          : await permissionsApi.set(role, permission, nextValue);
      onUpdatePermissions(result.matrix);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update permission");
    } finally {
      setPendingCell(null);
    }
  };

  const handleReset = async (role: Role, permission: PermissionKey) => {
    const id = cellId(role, permission);
    setPendingCell(id);
    setErrorMsg(null);
    try {
      const result = await permissionsApi.reset(role, permission);
      onUpdatePermissions(result.matrix);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to reset permission");
    } finally {
      setPendingCell(null);
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-6" id="permissions-matrix-system">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-sm font-sans font-semibold text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            RBAC Permissions {scope === "platform" ? "— Platform Defaults" : "Matrix"}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {scope === "platform"
              ? "These are the platform-wide default permissions. Individual companies can override them for their own tenant."
              : "Toggling a cell writes a tenant-specific override, enforced server-side on every request. Use the reset icon to revert to the platform default."}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-emerald-900/50 rounded text-[10px] font-mono text-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          LIVE — ENFORCED
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-3 text-[11px] text-red-200 leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {errorMsg}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-850 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4 font-bold">Permissions Flag / Authority</th>
              {rolesList.map(r => (
                <th key={r} className="py-3 px-4 text-center font-bold">
                  {r.replace("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-xs">
            {permissionsList.map(({ key, title, description }) => (
              <tr
                key={key}
                className="hover:bg-slate-900/30 transition-all"
                onMouseEnter={() => setHoveredPermission(key)}
                onMouseLeave={() => setHoveredPermission(null)}
              >
                <td className="py-3.5 px-4 font-sans">
                  <div className="flex items-start gap-1.5">
                    <div>
                      <span className="font-semibold text-slate-200 block">{title}</span>
                      <span className="text-[10px] font-mono text-slate-500">{key}</span>
                    </div>
                    <HelpCircle className="w-3 h-3 text-slate-600 shrink-0 mt-1 cursor-help" title={description} />
                  </div>
                </td>
                {rolesList.map(role => {
                  const isChecked = permissionsMatrix[role][key];
                  const id = cellId(role, key);
                  const isPending = pendingCell === id;
                  const isLocked = role === "SUPER_ADMIN" && key === "MANAGE_SUBSCRIPTIONS";
                  return (
                    <td key={role} className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleToggle(role, key)}
                          disabled={isPending || isLocked}
                          className={`inline-flex items-center justify-center outline-none transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                            isChecked ? "text-indigo-400 hover:text-indigo-300" : "text-slate-650 hover:text-slate-500"
                          }`}
                          title={isLocked ? "Locked: SUPER_ADMIN always retains this permission" : `Toggle ${title} for ${role.replace("_", " ")}`}
                        >
                          {isPending ? (
                            <Loader2 className="w-7 h-7 animate-spin" />
                          ) : isChecked ? (
                            <ToggleRight className="w-7 h-7" />
                          ) : (
                            <ToggleLeft className="w-7 h-7" />
                          )}
                        </button>
                        {scope === "tenant" && !isLocked && (
                          <button
                            onClick={() => handleReset(role, key)}
                            disabled={isPending}
                            className="text-slate-600 hover:text-slate-400 transition-colors disabled:opacity-40"
                            title="Reset to platform default"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg flex gap-3.5 items-start">
        <div className="p-2 rounded bg-indigo-950/20 text-indigo-400 shrink-0">
          <AlertTriangle className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          {hoveredPermission ? (
            <div>
              <span className="text-xs font-mono font-bold text-indigo-300 uppercase block tracking-wider">
                PERMISSION FOCUS: {hoveredPermission}
              </span>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                {permissionsList.find(p => p.key === hoveredPermission)?.description}
              </p>
            </div>
          ) : (
            <div>
              <span className="text-xs font-mono font-bold text-indigo-300 uppercase block tracking-wider">
                RBAC REFERENCE
              </span>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Hover over any permission name for details. Every toggle here calls the live API and is enforced
                by the backend on the very next request — this is not a preview.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
