import { useState, useMemo } from "react";
import { 
  Database, Table, ArrowRight, Layers, HelpCircle, HardDrive, 
  Search, ShieldCheck, CreditCard, Clock, FileText, CheckCircle,
  Hash, Key, Users, Network, Code, Copy, Check
} from "lucide-react";

interface DBColumn {
  name: string;
  type: string;
  constraint?: string;
  notes?: string;
}

interface DBTable {
  name: string;
  category: "Core Identity & Tenant" | "Access Control & Users" | "Notary Operations" | "Verification & Cryptography" | "Financing & Billing" | "Communications & Audits";
  description: string;
  multiTenantIsolated: boolean;
  columns: DBColumn[];
  fks: { col: string; references: string }[];
  indices: string[];
}

export default function DatabaseSchema() {
  const [activeTable, setActiveTable] = useState<string>("tenants");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const tables: DBTable[] = [
    {
      name: "tenants",
      category: "Core Identity & Tenant",
      description: "Root master catalogue storing SaaS subscriber organizations, billing tiers, subdomain assignments, and database schema routing directories.",
      multiTenantIsolated: false,
      fks: [],
      columns: [
        { name: "id", type: "UUID", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()", notes: "Globally unique immutable tenant identifier." },
        { name: "name", type: "VARCHAR(255)", constraint: "NOT NULL", notes: "Formal organization name of the notary franchise owner." },
        { name: "subdomain", type: "VARCHAR(128)", constraint: "UNIQUE NOT NULL", notes: "Domain label used for multi-tenant router parsing (e.g. 'boston-notary')." },
        { name: "tier", type: "VARCHAR(32)", constraint: "DEFAULT 'professional'", notes: "Defines volume boundaries: 'basic', 'professional', 'enterprise'." },
        { name: "status", type: "VARCHAR(32)", constraint: "DEFAULT 'active'", notes: "Controls active processing status: 'active', 'trial_expired', 'suspended'." },
        { name: "db_schema", type: "VARCHAR(63)", constraint: "DEFAULT 'public' NOT NULL", notes: "Target schema for environments utilizing physical Postgres schema separation." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "ISO-8601 audit timestamp of tenant onboard." },
        { name: "updated_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "Last automated billing or profile modification event." }
      ],
      indices: [
        "CREATE UNIQUE INDEX idx_tenants_subdomain ON tenants(subdomain);",
        "CREATE INDEX idx_tenants_status ON tenants(status);"
      ]
    },
    {
      name: "companies",
      category: "Core Identity & Tenant",
      description: "Stores profiles of pre-contracted corporate customers (e.g. real estate agencies, banks) who order bulk notarization services under the tenant. Distinct from the Tenant host itself.",
      multiTenantIsolated: true,
      fks: [{ col: "tenant_id", references: "tenants(id)" }],
      columns: [
        { name: "id", type: "UUID", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()", notes: "Unique identifier for corporate customer." },
        { name: "tenant_id", type: "UUID", constraint: "NOT NULL REFERENCES tenants(id) ON DELETE CASCADE", notes: "The hosting SaaS tenant instance." },
        { name: "name", type: "VARCHAR(255)", constraint: "NOT NULL", notes: "Legal business name of corporate customer client." },
        { name: "registration_number", type: "VARCHAR(64)", constraint: "NULL", notes: "Business tax ID / state incorporation reference." },
        { name: "domain", type: "VARCHAR(255)", constraint: "NULL", notes: "Whitelisted email domain for automated customer onboarding." },
        { name: "billing_email", type: "VARCHAR(255)", constraint: "NULL", notes: "Target contact for invoices and payment notifications." },
        { name: "status", type: "VARCHAR(32)", constraint: "DEFAULT 'active'", notes: "Current contract status: 'active', 'suspended'." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "Creation date of the customer relationship." }
      ],
      indices: [
        "CREATE INDEX idx_companies_tenant_lookup ON companies(tenant_id, status);",
        "CREATE INDEX idx_companies_domain ON companies(domain) WHERE domain IS NOT NULL;"
      ]
    },
    {
      name: "branches",
      category: "Core Identity & Tenant",
      description: "Registers physical brick-and-mortar office branches operated by a notary tenant. Connects digital queue flows to physical hardware counters.",
      multiTenantIsolated: true,
      fks: [{ col: "tenant_id", references: "tenants(id)" }],
      columns: [
        { name: "id", type: "UUID", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()", notes: "Unique identifier for physical branch." },
        { name: "tenant_id", type: "UUID", constraint: "NOT NULL REFERENCES tenants(id) ON DELETE CASCADE", notes: "Logical reference ensuring tenant boundary is not crossed." },
        { name: "name", type: "VARCHAR(255)", constraint: "NOT NULL", notes: "Location identifier name (e.g. 'Downtown San Francisco')." },
        { name: "address", type: "TEXT", constraint: "NOT NULL", notes: "Full physical street address for postal routing." },
        { name: "phone", type: "VARCHAR(32)", constraint: "NULL", notes: "Branch telephone contact line." },
        { name: "capacity_limit", type: "INTEGER", constraint: "DEFAULT 10", notes: "Maximum daily appointments or simultaneous waitlist limits." },
        { name: "is_active", type: "BOOLEAN", constraint: "DEFAULT TRUE", notes: "Hides/reveals branch calendar from client portal." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "Audit log of physical node addition." }
      ],
      indices: [
        "CREATE INDEX idx_branches_tenant ON branches(tenant_id);",
        "CREATE INDEX idx_branches_active ON branches(tenant_id, is_active);"
      ]
    },
    {
      name: "roles",
      category: "Access Control & Users",
      description: "Tenant-specific granular role groups supporting customized Role-Based Access Control (RBAC). Provides fine-tuned employee classifications.",
      multiTenantIsolated: true,
      fks: [{ col: "tenant_id", references: "tenants(id)" }],
      columns: [
        { name: "id", type: "UUID", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()", notes: "Unique identifier for role." },
        { name: "tenant_id", type: "UUID", constraint: "NOT NULL REFERENCES tenants(id) ON DELETE CASCADE", notes: "Tenant isolated role settings." },
        { name: "name", type: "VARCHAR(64)", constraint: "NOT NULL", notes: "Friendly name of role (e.g., 'Senior Escrow Notary Agent')." },
        { name: "code", type: "VARCHAR(64)", constraint: "NOT NULL", notes: "Normalized code identifier used in Spring Security @PreAuthorize rules (e.g. 'notary_officer')." },
        { name: "description", type: "TEXT", constraint: "NULL", notes: "Helpful text detailing job boundaries configuration." },
        { name: "is_system", type: "BOOLEAN", constraint: "DEFAULT FALSE", notes: "If True, locked from modification by local tenant administrators." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "Timestamp marking role creation." }
      ],
      indices: [
        "CREATE UNIQUE INDEX idx_roles_tenant_code ON roles(tenant_id, code);"
      ]
    },
    {
      name: "permissions",
      category: "Access Control & Users",
      description: "Master global checklist of granular permissions. Not partitioned by tenant, allowing standard static application access keys.",
      multiTenantIsolated: false,
      fks: [],
      columns: [
        { name: "id", type: "UUID", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()", notes: "Unique permission identifier." },
        { name: "code", type: "VARCHAR(64)", constraint: "UNIQUE NOT NULL", notes: "System routing handle tested by middleware (e.g., 'document:seal', 'biometric:verify')." },
        { name: "name", type: "VARCHAR(128)", constraint: "NOT NULL", notes: "Human read label (e.g. 'Seal and Ledger Cryptographic Document')." },
        { name: "description", type: "TEXT", constraint: "NULL", notes: "Explains standard operational boundaries." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "Creation date of the master permission item." }
      ],
      indices: [
        "CREATE UNIQUE INDEX idx_permissions_code ON permissions(code);"
      ]
    },
    {
      name: "roles_permissions",
      category: "Access Control & Users",
      description: "Many-to-many lookup table linking active roles with distinct operational perm codes under PostgreSQL.",
      multiTenantIsolated: false,
      fks: [
        { col: "role_id", references: "roles(id)" },
        { col: "permission_id", references: "permissions(id)" }
      ],
      columns: [
        { name: "role_id", type: "UUID", constraint: "REFERENCES roles(id) ON DELETE CASCADE", notes: "Left join parameter." },
        { name: "permission_id", type: "UUID", constraint: "REFERENCES permissions(id) ON DELETE CASCADE", notes: "Right join parameter." }
      ],
      indices: [
        "ALTER TABLE roles_permissions ADD PRIMARY KEY (role_id, permission_id);"
      ]
    },
    {
      name: "users",
      category: "Access Control & Users",
      description: "System employees, operators, cashiers, notary officers, and SaaS administrators possessing authenticating logins.",
      multiTenantIsolated: true,
      fks: [
        { col: "tenant_id", references: "tenants(id)" },
        { col: "branch_id", references: "branches(id)" },
        { col: "role_id", references: "roles(id)" }
      ],
      columns: [
        { name: "id", type: "UUID", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()", notes: "Unique user identification hash." },
        { name: "tenant_id", type: "UUID", constraint: "NOT NULL REFERENCES tenants(id) ON DELETE CASCADE", notes: "Tenant isolation scope constraint." },
        { name: "branch_id", type: "UUID", constraint: "REFERENCES branches(id) ON DELETE SET NULL", notes: "Linked home office. Null indicates floater or regional auditor." },
        { name: "role_id", type: "UUID", constraint: "REFERENCES roles(id) ON DELETE RESTRICT", notes: "Direct role allocation determining active RBAC schema." },
        { name: "email", type: "VARCHAR(255)", constraint: "NOT NULL", notes: "Login identifier. Unique within a single tenant boundary." },
        { name: "password_hash", type: "VARCHAR(255)", constraint: "NOT NULL", notes: "Salted cryptographic BCrypt hash." },
        { name: "full_name", type: "VARCHAR(255)", constraint: "NOT NULL", notes: "Formal legal operator name printed on ledger documents." },
        { name: "phone", type: "VARCHAR(32)", constraint: "NULL", notes: "Employee phone contact." },
        { name: "commission_number", type: "VARCHAR(64)", constraint: "NULL", notes: "Official state-licensed Notary Commission Number identifier." },
        { name: "commission_expiry", type: "DATE", constraint: "NULL", notes: "Expiration of state license. System flags warnings if invalid." },
        { name: "status", type: "VARCHAR(32)", constraint: "DEFAULT 'active'", notes: "Security flag: 'active', 'inactive', 'locked'." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "Audit log of employment entry." }
      ],
      indices: [
        "CREATE UNIQUE INDEX idx_users_tenant_email ON users(tenant_id, email);",
        "CREATE INDEX idx_users_branch ON users(tenant_id, branch_id);"
      ]
    },
    {
      name: "customers",
      category: "Notary Operations",
      description: "Patrons requiring notary services. Stores basic identities, client registration, and verification references used in legal journals.",
      multiTenantIsolated: true,
      fks: [
        { col: "tenant_id", references: "tenants(id)" },
        { col: "company_id", references: "companies(id)" }
      ],
      columns: [
        { name: "id", type: "UUID", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()", notes: "Unique patron identity UUID." },
        { name: "tenant_id", type: "UUID", constraint: "NOT NULL REFERENCES tenants(id) ON DELETE CASCADE", notes: "Tenant scoping identifier." },
        { name: "company_id", type: "UUID", constraint: "REFERENCES companies(id) ON DELETE SET NULL", notes: "Corporate client relation (if acting as corporate representative)." },
        { name: "first_name", type: "VARCHAR(128)", constraint: "NOT NULL", notes: "Patron first legal name." },
        { name: "last_name", type: "VARCHAR(128)", constraint: "NOT NULL", notes: "Patron last legal name." },
        { name: "email", type: "VARCHAR(255)", constraint: "NULL", notes: "Target address for client portal access and notary notifications." },
        { name: "phone", type: "VARCHAR(32)", constraint: "NULL", notes: "Standard telephone contact." },
        { name: "id_type", type: "VARCHAR(64)", constraint: "NULL", notes: "Validated verification documentation type (e.g. 'US Drivers License')." },
        { name: "id_number_hash", type: "VARCHAR(64)", constraint: "NULL", notes: "SHA256 hash of id code for paper trail validation without storing unencrypted PII." },
        { name: "id_expiry_date", type: "DATE", constraint: "NULL", notes: "Used to inspect ID validity at check-in." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "Onboarding timestamp." }
      ],
      indices: [
        "CREATE INDEX idx_customers_tenant_name ON customers(tenant_id, last_name, first_name);",
        "CREATE INDEX idx_customers_company ON customers(tenant_id, company_id) WHERE company_id IS NOT NULL;"
      ]
    },
    {
      name: "appointments",
      category: "Notary Operations",
      description: "Pre-scheduled appointments booked through web portal or external client API. Allocates notary hours dynamically.",
      multiTenantIsolated: true,
      fks: [
        { col: "tenant_id", references: "tenants(id)" },
        { col: "branch_id", references: "branches(id)" },
        { col: "customer_id", references: "customers(id)" },
        { col: "assigned_notary_id", references: "users(id)" }
      ],
      columns: [
        { name: "id", type: "UUID", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()", notes: "Unique slot reservation ID." },
        { name: "tenant_id", type: "UUID", constraint: "NOT NULL REFERENCES tenants(id) ON DELETE CASCADE", notes: "Tenant isolation scope." },
        { name: "branch_id", type: "UUID", constraint: "NOT NULL REFERENCES branches(id) ON DELETE CASCADE", notes: "Physical target branch office." },
        { name: "customer_id", type: "UUID", constraint: "NOT NULL REFERENCES customers(id) ON DELETE CASCADE", notes: "Authorized client booking record." },
        { name: "assigned_notary_id", type: "UUID", constraint: "REFERENCES users(id) ON DELETE SET NULL", notes: "Specific employee assigned to handle act." },
        { name: "start_time", type: "TIMESTAMPTZ", constraint: "NOT NULL", notes: "Booking slot starts." },
        { name: "end_time", type: "TIMESTAMPTZ", constraint: "NOT NULL", notes: "Booking slot ends." },
        { name: "service_type", type: "VARCHAR(128)", constraint: "NOT NULL", notes: "Service category (e.g., 'Apostille', 'Deed Signing', 'Affidavit')." },
        { name: "status", type: "VARCHAR(32)", constraint: "DEFAULT 'scheduled'", notes: "State of session: 'scheduled', 'confirmed', 'completed', 'no_show', 'cancelled'." },
        { name: "notes", type: "TEXT", constraint: "NULL", notes: "Optional requirements or customer messages." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "Audit log of reservation creation event." }
      ],
      indices: [
        "CREATE INDEX idx_appointments_time ON appointments(tenant_id, branch_id, start_time, status);",
        "CREATE INDEX idx_appointments_notary ON appointments(tenant_id, assigned_notary_id, start_time) WHERE status = 'scheduled';"
      ]
    },
    {
      name: "queue_tickets",
      category: "Notary Operations",
      description: "Active walk-in ticket flows. Heavily indexed to keep real-time teller queries below 10ms for busy digital signage dashboards.",
      multiTenantIsolated: true,
      fks: [
        { col: "tenant_id", references: "tenants(id)" },
        { col: "branch_id", references: "branches(id)" },
        { col: "customer_id", references: "customers(id)" },
        { col: "appointment_id", references: "appointments(id)" },
        { col: "served_by", references: "users(id)" }
      ],
      columns: [
        { name: "id", type: "UUID", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()", notes: "Unique queue ledger item." },
        { name: "tenant_id", type: "UUID", constraint: "NOT NULL REFERENCES tenants(id) ON DELETE CASCADE", notes: "Tenant boundary constraint." },
        { name: "branch_id", type: "UUID", constraint: "NOT NULL REFERENCES branches(id) ON DELETE CASCADE", notes: "Branch office waiting area identifier." },
        { name: "customer_id", type: "UUID", constraint: "REFERENCES customers(id) ON DELETE SET NULL", notes: "Can be Null for quick anonymous walk-ins." },
        { name: "appointment_id", type: "UUID", constraint: "REFERENCES appointments(id) ON DELETE SET NULL", notes: "Associates waitlist check-in with appointment system." },
        { name: "ticket_number", type: "VARCHAR(16)", constraint: "NOT NULL", notes: "Cycling code displayed on display dashboard (e.g. 'A-230')." },
        { name: "service_type", type: "VARCHAR(128)", constraint: "NOT NULL", notes: "Type of notarization." },
        { name: "serving_desk", type: "INTEGER", constraint: "NULL", notes: "Physical branch teller desk calling current ticket." },
        { name: "status", type: "VARCHAR(32)", constraint: "DEFAULT 'waiting'", notes: "Active queue state: 'waiting', 'calling', 'serving', 'completed', 'passed'." },
        { name: "called_at", type: "TIMESTAMPTZ", constraint: "NULL", notes: "Timestamp when counter chime triggered active paging." },
        { name: "served_by", type: "UUID", constraint: "REFERENCES users(id) ON DELETE SET NULL", notes: "Employee desk operator providing notarization." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "Automatic enqueue ticket birth." }
      ],
      indices: [
        "CREATE INDEX idx_queue_tickets_status ON queue_tickets(tenant_id, branch_id, status, created_at);",
        "CREATE INDEX idx_queue_active_chime ON queue_tickets(tenant_id, branch_id) WHERE status IN ('waiting', 'calling');"
      ]
    },
    {
      name: "document_templates",
      category: "Notary Operations",
      description: "Saves pre-structured HTML or Markdown templates containing pre-packaged boilerplate language and dynamic handlebar tags.",
      multiTenantIsolated: true,
      fks: [{ col: "tenant_id", references: "tenants(id)" }],
      columns: [
        { name: "id", type: "UUID", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()", notes: "Unique template template ID." },
        { name: "tenant_id", type: "UUID", constraint: "NOT NULL REFERENCES tenants(id) ON DELETE CASCADE", notes: "Tenant scope." },
        { name: "title", type: "VARCHAR(255)", constraint: "NOT NULL", notes: "Name of document form (e.g. 'General Power of Attorney')." },
        { name: "description", type: "TEXT", constraint: "NULL", notes: "Brief guide explaining templates context." },
        { name: "content_markdown", type: "TEXT", constraint: "NOT NULL", notes: "Legal text containing markdown markup and handlebars data targets." },
        { name: "is_active", type: "BOOLEAN", constraint: "DEFAULT TRUE", notes: "Dictates template display on operator drafting panel." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "Generation timestamp." }
      ],
      indices: [
        "CREATE INDEX idx_doc_templates_tenant ON document_templates(tenant_id, is_active);"
      ]
    },
    {
      name: "documents",
      category: "Notary Operations",
      description: "Master records of drafted, active, or finalized transactional notary documents. Stores digital blockchain hashes ensuring non-repudiation.",
      multiTenantIsolated: true,
      fks: [
        { col: "tenant_id", references: "tenants(id)" },
        { col: "customer_id", references: "customers(id)" },
        { col: "template_id", references: "document_templates(id)" },
        { col: "created_by", references: "users(id)" }
      ],
      columns: [
        { name: "id", type: "UUID", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()", notes: "Unique immutable document record hash." },
        { name: "tenant_id", type: "UUID", constraint: "NOT NULL REFERENCES tenants(id) ON DELETE CASCADE", notes: "Scoping criteria isolate." },
        { name: "customer_id", type: "UUID", constraint: "NOT NULL REFERENCES customers(id) ON DELETE RESTRICT", notes: "Prime receiving consumer." },
        { name: "template_id", type: "UUID", constraint: "REFERENCES document_templates(id) ON DELETE SET NULL", notes: "Base template code (if drafted from library)." },
        { name: "title", type: "VARCHAR(255)", constraint: "NOT NULL", notes: "Target legal file name description." },
        { name: "content_markdown", type: "TEXT", constraint: "NOT NULL", notes: "Full legally drafted text with user payload mappings." },
        { name: "status", type: "VARCHAR(32)", constraint: "DEFAULT 'draft'", notes: "Workflow configuration step: 'draft', 'pending_signatures', 'sealed_completed', 'rejected'." },
        { name: "notary_act_type", type: "VARCHAR(128)", constraint: "NULL", notes: "Identifies formal act: 'Jurats', 'Oaths', 'Signature Witnessing'." },
        { name: "ledger_hash", type: "VARCHAR(64)", constraint: "UNIQUE NULL", notes: "Cryptographic SHA-256 of document text + cryptographic certificates for ledger protection." },
        { name: "watermark_uuid", type: "UUID", constraint: "UNIQUE NULL", notes: "Verifiable ID printed as watermark barcode." },
        { name: "created_by", type: "UUID", constraint: "REFERENCES users(id) ON DELETE SET NULL", notes: "Drafting officer identifier code." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "Drafting timestamp." },
        { name: "sealed_at", type: "TIMESTAMPTZ", constraint: "NULL", notes: "Exact event epoch where stamp seal and final locks were computed." }
      ],
      indices: [
        "CREATE INDEX idx_documents_tenant_status ON documents(tenant_id, status);",
        "CREATE UNIQUE INDEX idx_documents_ledger ON documents(ledger_hash) WHERE ledger_hash IS NOT NULL;"
      ]
    },
    {
      name: "signatures",
      category: "Verification & Cryptography",
      description: "Registers cryptographically binding digital signatures associated with legal documents. Captures raw vector tracks and identity details.",
      multiTenantIsolated: true,
      fks: [
        { col: "tenant_id", references: "tenants(id)" },
        { col: "document_id", references: "documents(id)" },
        { col: "signer_user_id", references: "users(id)" },
        { col: "signer_customer_id", references: "customers(id)" }
      ],
      columns: [
        { name: "id", type: "UUID", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()", notes: "Unique identifier for signature." },
        { name: "tenant_id", type: "UUID", constraint: "NOT NULL REFERENCES tenants(id) ON DELETE CASCADE", notes: "Security boundary isolation pointer." },
        { name: "document_id", type: "UUID", constraint: "NOT NULL REFERENCES documents(id) ON DELETE CASCADE", notes: "Parent treaty document." },
        { name: "signer_type", type: "VARCHAR(32)", constraint: "NOT NULL", notes: "Allocation: 'notary_officer', 'customer', 'witness'." },
        { name: "signer_user_id", type: "UUID", constraint: "REFERENCES users(id) ON DELETE SET NULL", notes: "Linked employee agent (Null if signer is a consumer)." },
        { name: "signer_customer_id", type: "UUID", constraint: "REFERENCES customers(id) ON DELETE SET NULL", notes: "Linked customer patron (Null if signer is employee)." },
        { name: "signature_path_json", type: "TEXT", constraint: "NOT NULL", notes: "SVG coordinate tracks of signature captured on signing pad." },
        { name: "ip_address", type: "VARCHAR(45)", constraint: "NULL", notes: "Signer connection IP address used as remote evidence." },
        { name: "certificate_serial", type: "VARCHAR(128)", constraint: "NULL", notes: "Public cryptographic X.509 security serial stamp." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "Binding lock timestamp." }
      ],
      indices: [
        "CREATE INDEX idx_signatures_document ON signatures(document_id);"
      ]
    },
    {
      name: "fingerprints",
      category: "Verification & Cryptography",
      description: "Fidelity validation logs archiving biometric touches. GDPR-compliant; saves digital representation minutiae hashes rather than original photo scan images.",
      multiTenantIsolated: true,
      fks: [
        { col: "tenant_id", references: "tenants(id)" },
        { col: "customer_id", references: "customers(id)" },
        { col: "document_id", references: "documents(id)" }
      ],
      columns: [
        { name: "id", type: "UUID", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()", notes: "Unique fingerprint validation id." },
        { name: "tenant_id", type: "UUID", constraint: "NOT NULL REFERENCES tenants(id) ON DELETE CASCADE", notes: "Scope partition indicator." },
        { name: "customer_id", type: "UUID", constraint: "NOT NULL REFERENCES customers(id) ON DELETE CASCADE", notes: "Subject patron." },
        { name: "document_id", type: "UUID", constraint: "REFERENCES documents(id) ON DELETE SET NULL", notes: "Specific lock deed associated with touch." },
        { name: "minutiae_hash", type: "VARCHAR(64)", constraint: "NOT NULL", notes: "Encrypted minutiae point vector mapping used for identity matching comparison." },
        { name: "hardware_serial", type: "VARCHAR(128)", constraint: "NOT NULL", notes: "Hardware reader device signature." },
        { name: "capture_quality", type: "INTEGER", constraint: "NULL", notes: "Capturing quality evaluation score (e.g. 98%)." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "Registration metadata timestamp." }
      ],
      indices: [
        "CREATE INDEX idx_fingerprints_customer ON fingerprints(customer_id);"
      ]
    },
    {
      name: "invoices",
      category: "Financing & Billing",
      description: "Monetization ledger accounts. Captures transaction costs and fee schedules calculated for complex legal notarizations.",
      multiTenantIsolated: true,
      fks: [
        { col: "tenant_id", references: "tenants(id)" },
        { col: "customer_id", references: "customers(id)" },
        { col: "company_id", references: "companies(id)" }
      ],
      columns: [
        { name: "id", type: "UUID", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()", notes: "Unique billing document ID." },
        { name: "tenant_id", type: "UUID", constraint: "NOT NULL REFERENCES tenants(id) ON DELETE CASCADE", notes: "Tenant billing tracker identifier." },
        { name: "customer_id", type: "UUID", constraint: "REFERENCES customers(id) ON DELETE SET NULL", notes: "Target individual consumer." },
        { name: "company_id", type: "UUID", constraint: "REFERENCES companies(id) ON DELETE SET NULL", notes: "B2B client organization." },
        { name: "invoice_number", type: "VARCHAR(62)", constraint: "NOT NULL", notes: "Friendly billing identifier string (e.g., 'INV-2026-03912')." },
        { name: "amount_cents", type: "INTEGER", constraint: "NOT NULL", notes: "Base cost stored as unit integer cents to isolate float math bugs." },
        { name: "tax_cents", type: "INTEGER", constraint: "DEFAULT 0 NOT NULL", notes: "Tax calculations stored in cents." },
        { name: "status", type: "VARCHAR(32)", constraint: "DEFAULT 'open'", notes: "Financial workflow parameter: 'open', 'paid', 'void', 'overdue'." },
        { name: "due_date", type: "DATE", constraint: "NOT NULL", notes: "Threshold payment deadline." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "Invoices generation moment." }
      ],
      indices: [
        "CREATE UNIQUE INDEX idx_invoices_tenant_num ON invoices(tenant_id, invoice_number);",
        "CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);"
      ]
    },
    {
      name: "payments",
      category: "Financing & Billing",
      description: "Tracks transactions captured against active customer invoices. Integrates credit cards, pos registers, or physical cash deposits.",
      multiTenantIsolated: true,
      fks: [
        { col: "tenant_id", references: "tenants(id)" },
        { col: "invoice_id", references: "invoices(id)" },
        { col: "processed_by", references: "users(id)" }
      ],
      columns: [
        { name: "id", type: "UUID", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()", notes: "Unique payment transaction audit receipt." },
        { name: "tenant_id", type: "UUID", constraint: "NOT NULL REFERENCES tenants(id) ON DELETE CASCADE", notes: "Tenant isolation scope." },
        { name: "invoice_id", type: "UUID", constraint: "NOT NULL REFERENCES invoices(id) ON DELETE CASCADE", notes: "Target invoice being items closed." },
        { name: "amount_cents", type: "INTEGER", constraint: "NOT NULL", notes: "Captured funds tracked in fractional penny cents." },
        { name: "payment_method", type: "VARCHAR(32)", constraint: "NOT NULL", notes: "Payment type channel: 'cash', 'check', 'credit_card_stripe', 'ach'." },
        { name: "stripe_payment_intent_id", type: "VARCHAR(255)", constraint: "NULL", notes: "Stripe secure gateway checkout intent reference." },
        { name: "status", type: "VARCHAR(32)", constraint: "DEFAULT 'succeeded' NOT NULL", notes: "Gateway status: 'pending', 'succeeded', 'failed', 'refunded'." },
        { name: "processed_by", type: "UUID", constraint: "REFERENCES users(id) ON DELETE SET NULL", notes: "SaaS cashier operator executing booking processing." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "Receipt settlement timestamp." }
      ],
      indices: [
        "CREATE INDEX idx_payments_invoice ON payments(invoice_id);",
        "CREATE INDEX idx_payments_provider ON payments(tenant_id, stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;"
      ]
    },
    {
      name: "notifications",
      category: "Communications & Audits",
      description: "Asynchronous communication dispatch ledger. Tracks delivery tracking, SMS messages, and emails issued during appointments flow.",
      multiTenantIsolated: true,
      fks: [
        { col: "tenant_id", references: "tenants(id)" },
        { col: "recipient_user_id", references: "users(id)" },
        { col: "recipient_customer_id", references: "customers(id)" }
      ],
      columns: [
        { name: "id", type: "UUID", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()", notes: "Unique notification ID." },
        { name: "tenant_id", type: "UUID", constraint: "NOT NULL REFERENCES tenants(id) ON DELETE CASCADE", notes: "Tenant isolation block identifier." },
        { name: "recipient_type", type: "VARCHAR(32)", constraint: "NOT NULL", notes: "Identifies destination structure: 'user' or 'customer'." },
        { name: "recipient_user_id", type: "UUID", constraint: "REFERENCES users(id) ON DELETE CASCADE", notes: "Target employee identifier (Null if consumer target)." },
        { name: "recipient_customer_id", type: "UUID", constraint: "REFERENCES customers(id) ON DELETE CASCADE", notes: "Target consumer customer (Null if employee target)." },
        { name: "channel", type: "VARCHAR(16)", constraint: "NOT NULL", notes: "Dispatch medium: 'email', 'sms', 'push'." },
        { name: "title", type: "VARCHAR(255)", constraint: "NOT NULL", notes: "Subject line or notification header." },
        { name: "body", type: "TEXT", constraint: "NOT NULL", notes: "Full message layout payload." },
        { name: "status", type: "VARCHAR(32)", constraint: "DEFAULT 'queued'", notes: "Delivery phase: 'queued', 'sent', 'failed', 'read'." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW()", notes: "Creation date." }
      ],
      indices: [
        "CREATE INDEX idx_notifications_recipient ON notifications(tenant_id, recipient_type, status);",
        "CREATE INDEX idx_notifications_created ON notifications(created_at, status);"
      ]
    },
    {
      name: "audit_logs",
      category: "Communications & Audits",
      description: "Secure, tamper-evident action logs tracking critical admin activities. Utilizes Postgres list partitioning by tenant_id for hyperscale data separation.",
      multiTenantIsolated: true,
      fks: [
        { col: "tenant_id", references: "tenants(id)" },
        { col: "operator_user_id", references: "users(id)" }
      ],
      columns: [
        { name: "id", type: "BIGSERIAL", constraint: "NOT NULL", notes: "Auto-incrementing record transaction key." },
        { name: "tenant_id", type: "UUID", constraint: "NOT NULL REFERENCES tenants(id) ON DELETE CASCADE", notes: "Partition key routing transaction logs to the proper isolated partition shard." },
        { name: "operator_user_id", type: "UUID", constraint: "REFERENCES users(id) ON DELETE SET NULL", notes: "System operator trigger." },
        { name: "operator_email", type: "VARCHAR(255)", constraint: "NULL", notes: "Static record of operator email in case user profile deleted." },
        { name: "ip_address", type: "VARCHAR(45)", constraint: "NOT NULL", notes: "Operator IPv4 / IPv6 network address." },
        { name: "user_agent", type: "TEXT", constraint: "NULL", notes: "Device browser metadata log." },
        { name: "action_type", type: "VARCHAR(128)", constraint: "NOT NULL", notes: "Target event code (e.g. 'document.seal', 'biometric.match')." },
        { name: "entity_type", type: "VARCHAR(64)", constraint: "NOT NULL", notes: "Associated module model (e.g. 'documents', 'signatures')." },
        { name: "entity_id", type: "UUID", constraint: "NULL", notes: "Referenced entity record UUID." },
        { name: "payload_before", type: "JSONB", constraint: "NULL", notes: "Delta inspection. Captures preceding state block." },
        { name: "payload_after", type: "JSONB", constraint: "NULL", notes: "Delta inspection. Captures subsequent state block." },
        { name: "created_at", type: "TIMESTAMPTZ", constraint: "DEFAULT NOW() NOT NULL", notes: "Immutable action log datetime anchor." }
      ],
      indices: [
        "ALTER TABLE audit_logs ADD PRIMARY KEY (id, tenant_id);",
        "CREATE INDEX idx_audit_operator ON audit_logs(tenant_id, operator_user_id, created_at);",
        "CREATE INDEX idx_audit_action ON audit_logs(tenant_id, action_type, created_at);"
      ]
    }
  ];

  const categories = useMemo(() => {
    return ["all", ...Array.from(new Set(tables.map(t => t.category)))];
  }, [tables]);

  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.columns.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = selectedCategory === "all" || t.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [tables, searchQuery, selectedCategory]);

  const currentTable = filteredTables.find(t => t.name === activeTable) || filteredTables[0] || tables[0];

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-xl overflow-hidden h-full flex flex-col" id="database-schema-interactive">
      
      {/* Header and Controls */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-sans font-semibold tracking-tight text-white flex items-center gap-2">
            <Database className="text-purple-400 w-5 h-5" />
            PostgreSQL Production-Grade Relational Schema
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Browse and download structured table blueprints. Supports full <b>Logical Multi-Tenancy Isolation</b>, <b>X.509 Cryptographic Trust Indexes</b>, and HIPAA-compliant biometric hash catalogs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            17 Production Tables Declared
          </span>
        </div>
      </div>

      {/* Interactive ERD Visualization Minimap */}
      <div className="mb-6 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Network className="text-cyan-400 w-4 h-4" />
            <span>Multi-Tenant ERD Architecture Graph & FK Connections</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Click a related node to instant focus details</span>
        </div>
        
        {/* Visual responsive grid of core nodes and their relations maps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2">
          {tables.map((tableNode) => {
            const hasRelationToActive = tableNode.fks.some(fk => 
              fk.references.startsWith(currentTable.name)
            ) || currentTable.fks.some(fk => 
              fk.references.startsWith(tableNode.name)
            );
            const isSelf = tableNode.name === currentTable.name;

            return (
              <button
                key={tableNode.name}
                onClick={() => setActiveTable(tableNode.name)}
                className={`py-2 px-2.5 text-center text-[10px] sm:text-xs rounded-lg font-mono border transition-all ${
                  isSelf 
                    ? "bg-purple-600/20 border-purple-500/80 text-purple-300 shadow-md shadow-purple-500/10 scale-102 z-10 font-semibold"
                    : hasRelationToActive
                    ? "bg-cyan-950/40 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/50"
                    : "bg-slate-900/40 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-350"
                }`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="truncate max-w-full text-[11px]">{tableNode.name}</span>
                  {isSelf && <span className="text-[8px] uppercase tracking-wider text-purple-400 font-sans scale-90 font-bold">Active</span>}
                  {hasRelationToActive && !isSelf && <span className="text-[8px] uppercase tracking-wider text-cyan-400 font-sans scale-90 font-bold">FK bound</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Query/Filters panel */}
      <div className="mb-5 flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search columns, table descriptions, constraints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs font-sans text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-600"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border capitalize ${
                selectedCategory === cat
                  ? "bg-purple-600 text-white border-transparent"
                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
              }`}
            >
              {cat === "all" ? "All Modules" : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        
        {/* Sidebar Table Selector (Left 1 col) */}
        <div className="lg:col-span-1 space-y-1 bg-slate-950/40 p-2 rounded-xl border border-slate-850 h-[380px] sm:h-[450px] overflow-y-auto flex flex-col justify-start">
          <p className="text-[10px] font-mono text-slate-500 px-3 py-1 uppercase tracking-wider font-bold">Tables ({filteredTables.length})</p>
          {filteredTables.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs font-mono">No matching structures</div>
          ) : (
            filteredTables.map(t => (
              <button
                key={t.name}
                onClick={() => setActiveTable(t.name)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center justify-between outline-none transition-all ${
                  activeTable === t.name
                    ? "bg-purple-500/10 border border-purple-500/20 text-purple-200 font-semibold"
                    : "text-slate-400 border border-transparent hover:bg-slate-900/60 hover:text-slate-200"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Table className={`w-3.5 h-3.5 shrink-0 ${activeTable === t.name ? "text-purple-400" : "text-slate-500"}`} />
                  <span className="truncate">{t.name}</span>
                </span>
                {t.multiTenantIsolated && (
                  <span className="text-[8px] bg-cyan-950/80 border border-cyan-800/40 text-cyan-400 px-1 rounded-sm shrink-0 font-mono">SC</span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Column Definition Inspector Table (Right 3 cols) */}
        <div className="lg:col-span-3 flex flex-col bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 overflow-hidden font-sans h-auto">
          {currentTable ? (
            <div className="flex flex-col h-full justify-between gap-4">
              
              {/* Header card info */}
              <div className="border-b border-slate-800/80 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                    <Table className="text-purple-400 w-5 h-5 shrink-0" />
                    table: <span className="text-purple-300 font-mono text-sm sm:text-base">{currentTable.name}</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/50 border border-slate-700 font-semibold text-slate-350 tracking-wide uppercase font-mono">
                      Category: {currentTable.category}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${
                      currentTable.multiTenantIsolated 
                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300" 
                        : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    }`}>
                      {currentTable.multiTenantIsolated ? "PARTITION KEY: tenant_id" : "SHARED META"}
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  {currentTable.description}
                </p>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-x-auto min-h-0 border border-slate-800/80 rounded-lg bg-slate-950/40 max-h-[290px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                      <th className="px-3.5 py-2.5">COLUMN NAME</th>
                      <th className="px-3.5 py-2.5">POSTGRESQL TYPE</th>
                      <th className="px-3.5 py-2.5">KEY CONSTRAINTS</th>
                      <th className="px-3.5 py-2.5">BUSINESS COMPLIANCE & NOTES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-sans text-slate-300">
                    {currentTable.columns.map((col, index) => (
                      <tr key={index} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-3.5 py-2.5 font-mono text-cyan-400 font-medium whitespace-nowrap">{col.name}</td>
                        <td className="px-3.5 py-2.5 font-mono text-teal-400 text-[11px] whitespace-nowrap">{col.type}</td>
                        <td className="px-3.5 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono inline-block ${
                            col.constraint?.includes("PRIMARY KEY") ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            col.constraint?.includes("REFERENCES") ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                            col.constraint?.includes("UNIQUE") ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" :
                            col.constraint?.includes("NOT NULL") ? "bg-slate-800 text-slate-400" :
                            "bg-transparent text-slate-500"
                          }`}>
                            {col.constraint || "NULLABLE"}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-400 text-xs italic leading-snug">
                          {col.notes || "Standard audit record tracker parameter."}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Dynamic Relations and Indexing Inspector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {/* FK connections mapping */}
                <div className="p-3 bg-purple-950/15 border border-purple-900/30 rounded-lg flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-purple-400 uppercase font-bold tracking-wider mb-2">
                    <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Inbound/Outbound FK Connections</span>
                  </div>
                  {currentTable.fks.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic py-1">This is a global root table with zero outbound relationships.</div>
                  ) : (
                    <div className="space-y-1.5 max-h-[80px] overflow-y-auto">
                      {currentTable.fks.map((fk, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[10px] text-purple-300">
                          <span className="font-mono bg-purple-950/80 px-1 rounded text-cyan-300">{fk.col}</span>
                          <ArrowRight className="w-3 h-3 text-purple-400 shrink-0" />
                          <button 
                            onClick={() => {
                              const refTableName = fk.references.split("(")[0];
                              const targetT = tables.find(t => t.name === refTableName);
                              if (targetT) setActiveTable(targetT.name);
                            }}
                            className="font-mono bg-purple-950/80 px-1 rounded text-teal-300 hover:underline hover:text-white"
                          >
                            {fk.references}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Index advice and trigger scripts */}
                <div className="p-3 bg-cyan-950/15 border border-cyan-900/30 rounded-lg flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider mb-2">
                    <Hash className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Postgres Tuning Indexes</span>
                  </div>
                  <div className="space-y-1.5 max-h-[80px] overflow-y-auto">
                    {currentTable.indices.map((idxCode, iIdx) => (
                      <div key={iIdx} className="flex items-center justify-between gap-2 text-[9px] font-mono bg-cyan-950/80 px-2 py-1 rounded text-cyan-350 border border-cyan-900/30">
                        <span className="truncate">{idxCode}</span>
                        <button
                          onClick={() => handleCopy(idxCode, iIdx)}
                          className="text-cyan-400 hover:text-cyan-200 shrink-0 outline-none"
                          title="Copy Statement"
                        >
                          {copiedIndex === iIdx ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 font-mono">Select a table to inspect columns.</div>
          )}
        </div>

      </div>

    </div>
  );
}
