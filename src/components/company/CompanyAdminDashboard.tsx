import React from "react";
import { Branch, Employee, NotaryDocument } from "../../types";
import DynamicCharts from "../DynamicCharts";

interface CompanyAdminDashboardProps {
  branches: Branch[];
  employees: Employee[];
  documents: NotaryDocument[];
  appointments: never[];
  invoices: never[];
  onNavigateToTab: (tab: string) => void;
  userRole?: string;
}

export default function CompanyAdminDashboard({
  userRole = "COMPANY_ADMIN",
}: CompanyAdminDashboardProps) {
  return (
    <div className="space-y-6">
      <DynamicCharts userRole={userRole} />
    </div>
  );
}
