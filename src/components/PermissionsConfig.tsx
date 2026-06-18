import { useState } from "react";
import { ShieldCheck, ToggleLeft, ToggleRight, HelpCircle, AlertTriangle } from "lucide-react";

export type Role = "SUPER_ADMIN" | "COMPANY_ADMIN" | "BRANCH_ADMIN" | "EMPLOYEE" | "CUSTOMER";
export type PermissionKey = 
  | "CREATE_DOCUMENT" 
  | "EDIT_DOCUMENT" 
  | "DELETE_DOCUMENT" 
  | "VIEW_REPORTS" 
  | "CREATE_EMPLOYEE" 
  | "CREATE_BRANCH" 
  | "MANAGE_SUBSCRIPTIONS" 
  | "BYPASS_BIOMETRICS";

export interface PermissionsMatrix {
  SUPER_ADMIN: Record<PermissionKey, boolean>;
  COMPANY_ADMIN: Record<PermissionKey, boolean>;
  BRANCH_ADMIN: Record<PermissionKey, boolean>;
  EMPLOYEE: Record<PermissionKey, boolean>;
  CUSTOMER: Record<PermissionKey, boolean>;
}

interface PermissionsConfigProps {
  permissionsMatrix: PermissionsMatrix;
  onUpdatePermissions: (matrix: PermissionsMatrix) => void;
}

export default function PermissionsConfig({ permissionsMatrix, onUpdatePermissions }: PermissionsConfigProps) {
  const [hoveredPermission, setHoveredPermission] = useState<PermissionKey | null>(null);

  const rolesList: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_ADMIN", "EMPLOYEE", "CUSTOMER"];
  const permissionsList: { key: PermissionKey; title: string; description: string }[] = [
    { key: "CREATE_DOCUMENT", title: "Create Document", description: "Allows creating and drafting notary documents and certificates." },
    { key: "EDIT_DOCUMENT", title: "Edit Document", description: "Enables modification of contract structures and principal clauses." },
    { key: "DELETE_DOCUMENT", title: "Delete Document", description: "Enables severe archival and hard deletion of historic notary records." },
    { key: "VIEW_REPORTS", title: "View Reports", description: "Grants access to company billing, employee KPI reviews, and branch performance statistics." },
    { key: "CREATE_EMPLOYEE", title: "Create Employee", description: "Enables onboarding, suspending, and editing role parameters for clerks." },
    { key: "CREATE_BRANCH", title: "Create Branch", description: "Allows establishing new physical and logical counter bureaus within the tenant domain." },
    { key: "MANAGE_SUBSCRIPTIONS", title: "Manage Subscriptions", description: "Allows upgrading, downgrading, or settling Stripe recurring licenses." },
    { key: "BYPASS_BIOMETRICS", title: "Bypass Biometrics", description: "Grants authority to sign documents without capturing physical fingerprint minutiae." }
  ];

  const handleToggle = (role: Role, permission: PermissionKey) => {
    // Super Admins should not have critical permissions removed in the mock sandbox to prevent lockout
    if (role === "SUPER_ADMIN" && permission === "MANAGE_SUBSCRIPTIONS") {
      alert("Role safety lock: SUPER_ADMIN must maintain subscription and license management access.");
      return;
    }

    const updatedMatrix = {
      ...permissionsMatrix,
      [role]: {
        ...permissionsMatrix[role],
        [permission]: !permissionsMatrix[role][permission]
      }
    };
    onUpdatePermissions(updatedMatrix);
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-6" id="permissions-matrix-system">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-sm font-sans font-semibold text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            Configurable RBAC Permissions Module
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Toggle state permissions interactively across the five standard operator hierarchies to demonstrate dynamic access enforcement rules.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-850 rounded text-[10px] font-mono text-indigo-300">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          ACTIVE: SYSTEM-WIDE ACCESS CONTROL
        </div>
      </div>

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
                  return (
                    <td key={role} className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggle(role, key)}
                        className={`inline-flex items-center justify-center outline-none transition-transform active:scale-95 ${
                          isChecked ? "text-indigo-400 hover:text-indigo-300" : "text-slate-650 hover:text-slate-500"
                        }`}
                        title={`Toggle ${title} for ${role.replace("_", " ")}`}
                      >
                        {isChecked ? (
                          <ToggleRight className="w-7 h-7" />
                        ) : (
                          <ToggleLeft className="w-7 h-7" />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dynamic Detail Card */}
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
                RBAC PROTECTION AUDITING
              </span>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Hover over any permission name to review its threat category. Disabling any switch immediately updates the active validation checks in any simulation portal for secure and real-time state enforcement.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
