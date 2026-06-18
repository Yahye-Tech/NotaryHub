import { useState } from "react";
import { Download, Copy, Check, FileText, Cpu, Code2, Database } from "lucide-react";

interface ConfigTemplate {
  id: string;
  filename: string;
  language: "yaml" | "sql" | "java";
  category: "Docker" | "DB Schema" | "Spring Core";
  icon: any;
  code: string;
}

export default function ConfigExporter() {
  const [activeTab, setActiveTab] = useState<string>("docker");
  const [copied, setCopied] = useState<boolean>(false);

  const configs: ConfigTemplate[] = [
    {
      id: "docker",
      filename: "docker-compose.yml",
      language: "yaml",
      category: "Docker",
      icon: Cpu,
      code: `version: '3.8'

services:
  nginx-gateway:
    image: nginx:alpine
    container_name: notary_gateway
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - spring-api-cluster
    networks:
      - notary-tier-network

  spring-api-cluster:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: notary_spring_boot
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres-db:5432/notary_saas?stringtype=unspecified
      - SPRING_DATASOURCE_USERNAME=postgres_admin
      - SPRING_DATASOURCE_PASSWORD=SuperSecureMultiTenantPassword2026
      - SPRING_REDIS_HOST=redis-cache
      - SPRING_REDIS_PORT=6379
      - JWT_SECRET=MySuper32CharacterLongSecretKeyRequiredForAuthenticatingNotaryJWT
    ports:
      - "8080:8080"
    depends_on:
      - postgres-db
      - redis-cache
    networks:
      - notary-tier-network

  postgres-db:
    image: postgres:16-alpine
    container_name: notary_postgres_db
    environment:
      - POSTGRES_DB=notary_saas
      - POSTGRES_USER=postgres_admin
      - POSTGRES_PASSWORD=SuperSecureMultiTenantPassword2026
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - notary-tier-network

  redis-cache:
    image: redis:7.2-alpine
    container_name: notary_redis_cache
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - notary-tier-network

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  notary-tier-network:
    driver: bridge`
    },
    {
      id: "schema",
      filename: "notary-schema.sql",
      language: "sql",
      category: "DB Schema",
      icon: Database,
      code: `-- ============================================================================
-- SQL DDL SCHEMA MIGRATION SCRIPT (POSTGRESQL 16+ DIALECT)
-- PLATFORM: PRODUCTION-GRADE MULTI-TENANT NOTARY OFFICE SaaS APP
-- SUPPORTED SCHEMAS: 1. LOGICAL ISOLATION (FOREIGN KEY) 2. SCHEMA SEPARATION
-- AUTONOMOUS ENCRYPTION: SHA256 FOR DOCUMENT & BIOMETRIC DATA HASHLOCKS
-- ============================================================================

-- Enable pgcrypto for advanced cryptographic hash sums and uuid generators
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Table: tenants
-- ----------------------------------------------------------------------------
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(128) UNIQUE NOT NULL,
    tier VARCHAR(32) NOT NULL DEFAULT 'professional', -- basic, professional, enterprise
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- active, suspended, trial_expired
    db_schema VARCHAR(63) NOT NULL DEFAULT 'public',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ----------------------------------------------------------------------------
-- 2. Table: companies
-- ----------------------------------------------------------------------------
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(64),
    domain VARCHAR(255),
    billing_email VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_tenant_lookup ON companies(tenant_id, status);
CREATE INDEX idx_companies_domain ON companies(domain) WHERE domain IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. Table: branches
-- ----------------------------------------------------------------------------
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(32),
    capacity_limit INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_branches_tenant ON branches(tenant_id);
CREATE INDEX idx_branches_active ON branches(tenant_id, is_active);

-- ----------------------------------------------------------------------------
-- 4. Table: roles
-- ----------------------------------------------------------------------------
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    code VARCHAR(64) NOT NULL, -- notary_officer, branch_admin, receptionist, etc
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tenant_role_code UNIQUE (tenant_id, code)
);

-- ----------------------------------------------------------------------------
-- 5. Table: permissions
-- ----------------------------------------------------------------------------
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(64) UNIQUE NOT NULL, -- e.g., 'document:seal', 'biometric:verify'
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_permissions_code ON permissions(code);

-- ----------------------------------------------------------------------------
-- 6. Table: roles_permissions
-- ----------------------------------------------------------------------------
CREATE TABLE roles_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ----------------------------------------------------------------------------
-- 7. Table: users (operators, staff)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    role_id UUID REFERENCES roles(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    commission_number VARCHAR(64), -- Valid states for licensed officers
    commission_expiry DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tenant_email UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_branch ON users(tenant_id, branch_id);

-- ----------------------------------------------------------------------------
-- 8. Table: customers (patrons)
-- ----------------------------------------------------------------------------
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(32),
    id_type VARCHAR(64), -- Passport, Driver's License
    id_number_hash VARCHAR(64), -- SHA256 Hash of verification files
    id_expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tenant_customer_email UNIQUE (tenant_id, email)
);

CREATE INDEX idx_customers_tenant_name ON customers(tenant_id, last_name, first_name);
CREATE INDEX idx_customers_company ON customers(tenant_id, company_id) WHERE company_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 9. Table: appointments
-- ----------------------------------------------------------------------------
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    assigned_notary_id UUID REFERENCES users(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    service_type VARCHAR(128) NOT NULL, -- Apostille, Witness, Affidavit
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled', -- scheduled, confirmed, completed, no_show, cancelled
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_time ON appointments(tenant_id, branch_id, start_time, status);
CREATE INDEX idx_appointments_notary ON appointments(tenant_id, assigned_notary_id, start_time) WHERE status = 'scheduled';

-- ----------------------------------------------------------------------------
-- 10. Table: queue_tickets
-- ----------------------------------------------------------------------------
CREATE TABLE queue_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    ticket_number VARCHAR(16) NOT NULL, -- e.g., 'A-102', 'W-405'
    service_type VARCHAR(128) NOT NULL,
    serving_desk INTEGER,
    status VARCHAR(32) NOT NULL DEFAULT 'waiting', -- waiting, calling, serving, completed, passed
    called_at TIMESTAMPTZ,
    served_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_queue_tickets_status ON queue_tickets(tenant_id, branch_id, status, created_at);
CREATE INDEX idx_queue_active_chime ON queue_tickets(tenant_id, branch_id) WHERE status IN ('waiting', 'calling');

-- ----------------------------------------------------------------------------
-- 11. Table: document_templates
-- ----------------------------------------------------------------------------
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_markdown TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doc_templates_tenant ON document_templates(tenant_id, is_active);

-- ----------------------------------------------------------------------------
-- 12. Table: documents
-- ----------------------------------------------------------------------------
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content_markdown TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft', -- draft, pending_signatures, sealed_completed, rejected
    notary_act_type VARCHAR(128),
    ledger_hash VARCHAR(64) UNIQUE,
    watermark_uuid UUID UNIQUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sealed_at TIMESTAMPTZ
);

CREATE INDEX idx_documents_tenant_status ON documents(tenant_id, status);
CREATE UNIQUE INDEX idx_documents_ledger ON documents(ledger_hash) WHERE ledger_hash IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 13. Table: signatures (captures digital sign paths)
-- ----------------------------------------------------------------------------
CREATE TABLE signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    signer_type VARCHAR(32) NOT NULL, -- notary_officer, customer, witness
    signer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    signer_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    signature_path_json TEXT NOT NULL, -- Coordinate trails for SVG recreation
    ip_address VARCHAR(45),
    certificate_serial VARCHAR(128), -- Bound secure X509 identification
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signatures_document ON signatures(document_id);

-- ----------------------------------------------------------------------------
-- 14. Table: fingerprints
-- ----------------------------------------------------------------------------
CREATE TABLE fingerprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    minutiae_hash VARCHAR(64) NOT NULL, -- Cryp hash vector of finger template (secure, non-reversible)
    hardware_serial VARCHAR(128) NOT NULL,
    capture_quality INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fingerprints_customer ON fingerprints(customer_id);

-- ----------------------------------------------------------------------------
-- 15. Table: invoices
-- ----------------------------------------------------------------------------
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    invoice_number VARCHAR(62) NOT NULL,
    amount_cents INTEGER NOT NULL, -- Float safety: integer absolute units cents
    tax_cents INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'open', -- open, paid, void, overdue
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tenant_invoice_num UNIQUE(tenant_id, invoice_number)
);

CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);

-- ----------------------------------------------------------------------------
-- 16. Table: payments
-- ----------------------------------------------------------------------------
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    payment_method VARCHAR(32) NOT NULL, -- stripe, cash, check, ach
    stripe_payment_intent_id VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'succeeded', -- pending, succeeded, failed, refunded
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_provider ON payments(tenant_id, stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 17. Table: notifications
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recipient_type VARCHAR(32) NOT NULL, -- user, customer
    recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    channel VARCHAR(16) NOT NULL, -- email, sms, push
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'queued', -- queued, sent, failed, read
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(tenant_id, recipient_type, status);
CREATE INDEX idx_notifications_created ON notifications(created_at, status);

-- ----------------------------------------------------------------------------
-- 18. Table: audit_logs (Partitioned list structure by tenant_id)
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id BIGSERIAL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    operator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    operator_email VARCHAR(255),
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    action_type VARCHAR(128) NOT NULL, -- document.seal, auth.login, etc
    entity_type VARCHAR(64) NOT NULL,
    entity_id UUID,
    payload_before JSONB,
    payload_after JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, tenant_id)
) PARTITION BY LIST (tenant_id);

CREATE INDEX idx_audit_operator ON audit_logs(tenant_id, operator_user_id, created_at);
CREATE INDEX idx_audit_action ON audit_logs(tenant_id, action_type, created_at);`
    },
    {
      id: "context",
      filename: "TenantContext.java",
      language: "java",
      category: "Spring Core",
      icon: Code2,
      code: `package com.notary.saas.core.context;

/**
 * Thread-safe Storage context mapping request streams with Active Tenants.
 * Guarantees schema database routing segregation under multi-tenancy.
 */
public class TenantContext {

    private static final ThreadLocal<String> currentTenant = new ThreadLocal<>();

    public static void setCurrentTenant(String tenantId) {
        currentTenant.set(tenantId);
    }

    public static String getCurrentTenant() {
        return currentTenant.get();
    }

    public static void clear() {
        currentTenant.remove();
    }
}`
    },
    {
      id: "interceptor",
      filename: "TenantInterceptor.java",
      language: "java",
      category: "Spring Core",
      icon: Code2,
      code: `package com.notary.saas.core.interceptor;

import com.notary.saas.core.context.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class TenantInterceptor implements HandlerInterceptor {

    private static final String TENANT_HEADER = "X-Tenant-ID";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String tenantId = request.getHeader(TENANT_HEADER);
        
        // Alternative URL subdomain routing resolve
        if (tenantId == null) {
            String serverName = request.getServerName(); // e.g., downtown.notaryplus.com
            String[] parts = serverName.split("\\.");
            if (parts.length > 2) {
                tenantId = parts[0]; // downtown
            }
        }

        if (tenantId != null) {
            TenantContext.setCurrentTenant(tenantId);
            return true;
        }

        response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
        return false; // Blocks request if tenant boundary cannot be resolved
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        // Essential ThreadLocal safety prevents thread leaking in resource pools
        TenantContext.clear();
    }
}`
    },
    {
      id: "security",
      filename: "JwtAuthFilter.java",
      language: "java",
      category: "Spring Core",
      icon: Code2,
      code: `package com.notary.saas.core.security;

import com.notary.saas.core.context.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenService jwtTokenService;

    public JwtAuthenticationFilter(JwtTokenService jwtTokenService) {
        this.jwtTokenService = jwtTokenService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            
            if (jwtTokenService.isTokenValid(token)) {
                String email = jwtTokenService.extractEmail(token);
                String tokenTenantId = jwtTokenService.extractTenantId(token);
                
                // Cross-validate context identity
                String activeTenant = TenantContext.getCurrentTenant();
                if (activeTenant != null && !activeTenant.equals(tokenTenantId)) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    return; // Blocks cross-tenant intrusion
                }

                UsernamePasswordAuthenticationToken auth = jwtTokenService.getAuthentication(token);
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}`
    }
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentConfig = configs.find(c => c.id === activeTab) || configs[0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl overflow-hidden h-full flex flex-col" id="config-exporter">
      <div className="mb-6 flex flex-wrap justify-between items-start gap-4">
        <div>
          <h3 className="text-xl font-sans font-medium tracking-tight text-white flex items-center gap-2">
            <FileText className="text-emerald-400 w-5 h-5" />
            Infrastructure & Code Exposer
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Get production ready server files modeling container orchestrations, JWT interceptors, and strict DB schemas.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Navigation panel */}
        <div className="lg:w-1/4 flex flex-col gap-2 bg-slate-950/40 p-2 rounded-xl border border-slate-800/80 shrink-0">
          <p className="text-[10px] font-mono text-slate-500 px-3 py-1 uppercase tracking-wider font-semibold">Categories</p>
          {configs.map(cfg => {
            const Icon = cfg.icon;
            return (
              <button
                key={cfg.id}
                onClick={() => {
                  setActiveTab(cfg.id);
                  setCopied(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between outline-none transition-all ${
                  activeTab === cfg.id
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 font-medium"
                    : "text-slate-400 border border-transparent hover:bg-slate-900/50 hover:text-slate-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${activeTab === cfg.id ? "text-emerald-400" : "text-slate-500"}`} />
                  {cfg.filename}
                </span>
                <span className="text-[9px] font-mono opacity-50">{cfg.category}</span>
              </button>
            );
          })}
        </div>

        {/* Configurations code area */}
        <div className="flex-1 flex flex-col bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden max-h-[480px]">
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {currentConfig.filename}
            </span>
            <button
              onClick={() => handleCopy(currentConfig.code)}
              className="text-xs bg-slate-800 hover:bg-slate-700 active:bg-slate-800 border border-slate-700 hover:border-slate-600 font-medium text-slate-200 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all outline-none"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy File
                </>
              )}
            </button>
          </div>

          <div className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-300 leading-relaxed bg-slate-950/30 select-text select-all">
            <pre className="whitespace-pre">{currentConfig.code}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
