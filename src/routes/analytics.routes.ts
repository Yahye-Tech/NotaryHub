import { Router, type Request, type Response } from "express";
import { requireAuth, requireMinRole, requirePermission } from "../middleware/auth.middleware.js";
import { query } from "../db/pool.js";

const router = Router();

// ─── Resolve the caller's own branch (for BRANCH_ADMIN / EMPLOYEE) ────────────
// Mirrors the pattern used in queue.routes.ts: explicit branchId wins for
// COMPANY_ADMIN+, otherwise falls back to the employee's own branch record.
async function resolveOwnBranchId(userId: string): Promise<string | null> {
  const { rows } = await query<{ branch_id: string }>(
    `SELECT branch_id FROM employees WHERE user_id = $1 AND is_deleted = FALSE`,
    [userId]
  );
  return rows[0]?.branch_id ?? null;
}

async function resolveBranchIdForReport(req: Request): Promise<string | null> {
  const explicit = req.query.branchId as string | undefined;
  if (["COMPANY_ADMIN", "SUPER_ADMIN"].includes(req.user!.role)) {
    return explicit ?? null;
  }
  return explicit ?? resolveOwnBranchId(req.user!.sub);
}

function periodBounds(type: string): { start: string; label: string } {
  switch (type) {
    case "daily":
      return { start: "DATE_TRUNC('day', NOW())", label: "Today" };
    case "weekly":
      return { start: "NOW() - INTERVAL '7 days'", label: "Last 7 Days" };
    case "monthly":
      return { start: "DATE_TRUNC('month', NOW())", label: "This Month" };
    default:
      return { start: "NOW() - INTERVAL '7 days'", label: "Last 7 Days" };
  }
}

// ─── Tenant scope helper ──────────────────────────────────────────────────────
// Every query is scoped to the caller's tenant unless they are SUPER_ADMIN.
function getTenantFilter(req: Request): { clause: string; param: string | null } {
  if (req.user!.role === "SUPER_ADMIN") {
    return { clause: "", param: null };
  }
  return {
    clause: `AND tenant_id = $TENANT_PARAM`,
    param: req.user!.tenantId,
  };
}

function buildTenantWhere(req: Request, alias = ""): { where: string; params: (string | null)[] } {
  const col = alias ? `${alias}.tenant_id` : "tenant_id";
  if (req.user!.role === "SUPER_ADMIN") {
    return { where: "", params: [] };
  }
  return {
    where: `AND ${col} = $1`,
    params: [req.user!.tenantId],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. REVENUE CHART
//    SELECT SUM(amount_cents), month FROM payments GROUP BY month
//    Returns: last 12 months of revenue per month
// ─────────────────────────────────────────────────────────────────────────────
router.get("/revenue", requireAuth, requireMinRole("COMPANY_ADMIN"), requirePermission("VIEW_REPORTS"), async (req: Request, res: Response) => {
  try {
    const { where, params } = buildTenantWhere(req);
    const paramOffset = params.length;

    // Monthly revenue for last 12 months
    const { rows: monthly } = await query<{
      month: string;
      revenue_cents: string;
      payment_count: string;
      succeeded_count: string;
    }>(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', paid_at), 'Mon YYYY') AS month,
         TO_CHAR(DATE_TRUNC('month', paid_at), 'YYYY-MM')  AS month_key,
         SUM(amount_cents)                                  AS revenue_cents,
         COUNT(*)                                           AS payment_count,
         COUNT(*) FILTER (WHERE status = 'succeeded')      AS succeeded_count
       FROM payments
       WHERE paid_at IS NOT NULL
         AND paid_at >= NOW() - INTERVAL '12 months'
         ${where}
       GROUP BY DATE_TRUNC('month', paid_at)
       ORDER BY DATE_TRUNC('month', paid_at) ASC`,
      params
    );

    // Total revenue all time
    const { rows: totals } = await query<{
      total_cents: string;
      succeeded_cents: string;
      pending_cents: string;
    }>(
      `SELECT
         COALESCE(SUM(amount_cents), 0)                                    AS total_cents,
         COALESCE(SUM(amount_cents) FILTER (WHERE status = 'succeeded'), 0) AS succeeded_cents,
         COALESCE(SUM(amount_cents) FILTER (WHERE status = 'pending'), 0)   AS pending_cents
       FROM payments
       WHERE 1=1 ${where}`,
      params
    );

    // MRR from active subscriptions
    const { rows: mrr } = await query<{ mrr_cents: string }>(
      `SELECT COALESCE(SUM(amount_cents), 0) AS mrr_cents
       FROM subscriptions
       WHERE status = 'active' ${where}`,
      params
    );

    res.json({
      monthly: monthly.map(r => ({
        month: r.month,
        monthKey: (r as any).month_key,
        revenueDollars: Math.round(parseInt(r.revenue_cents, 10) / 100),
        paymentCount: parseInt(r.payment_count, 10),
        succeededCount: parseInt(r.succeeded_count, 10),
      })),
      totals: {
        totalDollars:     Math.round(parseInt(totals[0]?.total_cents ?? "0", 10) / 100),
        succeededDollars: Math.round(parseInt(totals[0]?.succeeded_cents ?? "0", 10) / 100),
        pendingDollars:   Math.round(parseInt(totals[0]?.pending_cents ?? "0", 10) / 100),
        mrrDollars:       Math.round(parseInt(mrr[0]?.mrr_cents ?? "0", 10) / 100),
      },
    });
  } catch (err: any) {
    console.error("[Analytics] Revenue error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load revenue data" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. COMPANY / TENANT GROWTH
//    SELECT COUNT(*), month FROM tenants GROUP BY month
//    Returns: tenant registrations per month + current status breakdown
// ─────────────────────────────────────────────────────────────────────────────
router.get("/company-growth", requireAuth, requireMinRole("SUPER_ADMIN"), async (_req: Request, res: Response) => {
  try {
    // Monthly tenant registrations last 12 months
    const { rows: monthly } = await query<{
      month: string;
      month_key: string;
      new_tenants: string;
      cumulative: string;
    }>(
      `WITH monthly_counts AS (
         SELECT
           DATE_TRUNC('month', created_at) AS month,
           COUNT(*) AS new_tenants
         FROM tenants
         WHERE created_at >= NOW() - INTERVAL '12 months'
           AND is_deleted = FALSE
         GROUP BY DATE_TRUNC('month', created_at)
       )
       SELECT
         TO_CHAR(month, 'Mon YYYY')  AS month,
         TO_CHAR(month, 'YYYY-MM')   AS month_key,
         new_tenants,
         SUM(new_tenants) OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative
       FROM monthly_counts
       ORDER BY month ASC`
    );

    // Status breakdown
    const { rows: statusBreakdown } = await query<{
      status: string;
      count: string;
    }>(
      `SELECT status, COUNT(*) AS count
       FROM tenants
       WHERE is_deleted = FALSE
       GROUP BY status
       ORDER BY count DESC`
    );

    // Plan breakdown
    const { rows: planBreakdown } = await query<{
      plan: string;
      count: string;
      mrr_cents: string;
    }>(
      `SELECT
         t.plan,
         COUNT(t.id) AS count,
         COALESCE(SUM(s.amount_cents), 0) AS mrr_cents
       FROM tenants t
       LEFT JOIN subscriptions s ON s.tenant_id = t.id AND s.status = 'active'
       WHERE t.is_deleted = FALSE AND t.status = 'active'
       GROUP BY t.plan
       ORDER BY mrr_cents DESC`
    );

    // Total counts
    const { rows: totals } = await query<{
      total: string;
      active: string;
      suspended: string;
      trial: string;
    }>(
      `SELECT
         COUNT(*)                                         AS total,
         COUNT(*) FILTER (WHERE status = 'active')       AS active,
         COUNT(*) FILTER (WHERE status = 'suspended')    AS suspended,
         COUNT(*) FILTER (WHERE status = 'trial')        AS trial
       FROM tenants
       WHERE is_deleted = FALSE`
    );

    res.json({
      monthly: monthly.map(r => ({
        month: r.month,
        monthKey: r.month_key,
        newTenants: parseInt(r.new_tenants, 10),
        cumulative: parseInt(r.cumulative, 10),
      })),
      statusBreakdown: statusBreakdown.map(r => ({
        status: r.status,
        count: parseInt(r.count, 10),
      })),
      planBreakdown: planBreakdown.map(r => ({
        plan: r.plan,
        count: parseInt(r.count, 10),
        mrrDollars: Math.round(parseInt(r.mrr_cents, 10) / 100),
      })),
      totals: {
        total:     parseInt(totals[0]?.total     ?? "0", 10),
        active:    parseInt(totals[0]?.active    ?? "0", 10),
        suspended: parseInt(totals[0]?.suspended ?? "0", 10),
        trial:     parseInt(totals[0]?.trial     ?? "0", 10),
      },
    });
  } catch (err: any) {
    console.error("[Analytics] Company growth error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load company growth data" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. DOCUMENT STATISTICS
//    SELECT doc_type, status, COUNT(*) FROM documents GROUP BY doc_type, month
//    Returns: doc volume by type, by status, by month
// ─────────────────────────────────────────────────────────────────────────────
router.get("/documents", requireAuth, requireMinRole("COMPANY_ADMIN"), requirePermission("VIEW_REPORTS"), async (req: Request, res: Response) => {
  try {
    const { where, params } = buildTenantWhere(req);

    // Monthly document count last 12 months
    const { rows: monthly } = await query<{
      month: string;
      month_key: string;
      total: string;
      notarised: string;
      draft: string;
      rejected: string;
    }>(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
         TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM')  AS month_key,
         COUNT(*)                                              AS total,
         COUNT(*) FILTER (WHERE status = 'notarised')         AS notarised,
         COUNT(*) FILTER (WHERE status = 'draft')             AS draft,
         COUNT(*) FILTER (WHERE status = 'rejected')          AS rejected
       FROM documents
       WHERE created_at >= NOW() - INTERVAL '12 months'
         AND is_deleted = FALSE
         ${where}
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY DATE_TRUNC('month', created_at) ASC`,
      params
    );

    // Documents by type
    const { rows: byType } = await query<{
      doc_type: string;
      count: string;
      notarised_count: string;
      ai_generated: string;
    }>(
      `SELECT
         doc_type,
         COUNT(*)                                         AS count,
         COUNT(*) FILTER (WHERE status = 'notarised')   AS notarised_count,
         COUNT(*) FILTER (WHERE ai_generated = TRUE)    AS ai_generated
       FROM documents
       WHERE is_deleted = FALSE ${where}
       GROUP BY doc_type
       ORDER BY count DESC`,
      params
    );

    // Documents by status
    const { rows: byStatus } = await query<{
      status: string;
      count: string;
    }>(
      `SELECT status, COUNT(*) AS count
       FROM documents
       WHERE is_deleted = FALSE ${where}
       GROUP BY status
       ORDER BY count DESC`,
      params
    );

    // Totals
    const { rows: totals } = await query<{
      total: string;
      notarised: string;
      ai_generated: string;
      this_month: string;
    }>(
      `SELECT
         COUNT(*)                                                              AS total,
         COUNT(*) FILTER (WHERE status = 'notarised')                        AS notarised,
         COUNT(*) FILTER (WHERE ai_generated = TRUE)                         AS ai_generated,
         COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()))    AS this_month
       FROM documents
       WHERE is_deleted = FALSE ${where}`,
      params
    );

    res.json({
      monthly: monthly.map(r => ({
        month: r.month,
        monthKey: (r as any).month_key,
        total:    parseInt(r.total, 10),
        notarised: parseInt(r.notarised, 10),
        draft:    parseInt(r.draft, 10),
        rejected: parseInt(r.rejected, 10),
      })),
      byType: byType.map(r => ({
        docType: r.doc_type.replace(/_/g, " "),
        rawType: r.doc_type,
        count: parseInt(r.count, 10),
        notarisedCount: parseInt(r.notarised_count, 10),
        aiGenerated: parseInt(r.ai_generated, 10),
      })),
      byStatus: byStatus.map(r => ({
        status: r.status,
        count: parseInt(r.count, 10),
      })),
      totals: {
        total:       parseInt(totals[0]?.total        ?? "0", 10),
        notarised:   parseInt(totals[0]?.notarised    ?? "0", 10),
        aiGenerated: parseInt(totals[0]?.ai_generated ?? "0", 10),
        thisMonth:   parseInt(totals[0]?.this_month   ?? "0", 10),
      },
    });
  } catch (err: any) {
    console.error("[Analytics] Documents error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load document statistics" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SUBSCRIPTION ANALYTICS
//    SELECT plan, COUNT(*), SUM(amount_cents) FROM subscriptions GROUP BY plan
//    Returns: active subs by plan, revenue per plan, churn data
// ─────────────────────────────────────────────────────────────────────────────
router.get("/subscriptions", requireAuth, requireMinRole("SUPER_ADMIN"), async (_req: Request, res: Response) => {
  try {
    // Active subscriptions by plan
    const { rows: byPlan } = await query<{
      plan: string;
      count: string;
      mrr_cents: string;
      arr_cents: string;
    }>(
      `SELECT
         plan,
         COUNT(*)              AS count,
         SUM(amount_cents)     AS mrr_cents,
         SUM(amount_cents * 12) AS arr_cents
       FROM subscriptions
       WHERE status = 'active'
       GROUP BY plan
       ORDER BY mrr_cents DESC`
    );

    // Subscription status counts
    const { rows: byStatus } = await query<{
      status: string;
      count: string;
    }>(
      `SELECT status, COUNT(*) AS count
       FROM subscriptions
       GROUP BY status
       ORDER BY count DESC`
    );

    // Monthly new subscriptions last 12 months
    const { rows: monthly } = await query<{
      month: string;
      month_key: string;
      new_subs: string;
      cancelled_subs: string;
    }>(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', current_period_start), 'Mon YYYY') AS month,
         TO_CHAR(DATE_TRUNC('month', current_period_start), 'YYYY-MM')  AS month_key,
         COUNT(*) FILTER (WHERE status = 'active')                       AS new_subs,
         COUNT(*) FILTER (WHERE status = 'cancelled')                    AS cancelled_subs
       FROM subscriptions
       WHERE current_period_start >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', current_period_start)
       ORDER BY DATE_TRUNC('month', current_period_start) ASC`
    );

    // Totals
    const { rows: totals } = await query<{
      total_mrr_cents: string;
      total_arr_cents: string;
      active_count: string;
      churned_count: string;
    }>(
      `SELECT
         COALESCE(SUM(amount_cents) FILTER (WHERE status = 'active'), 0)     AS total_mrr_cents,
         COALESCE(SUM(amount_cents * 12) FILTER (WHERE status = 'active'), 0) AS total_arr_cents,
         COUNT(*) FILTER (WHERE status = 'active')                            AS active_count,
         COUNT(*) FILTER (WHERE status IN ('cancelled','expired'))            AS churned_count
       FROM subscriptions`
    );

    res.json({
      byPlan: byPlan.map(r => ({
        plan: r.plan,
        count: parseInt(r.count, 10),
        mrrDollars: Math.round(parseInt(r.mrr_cents, 10) / 100),
        arrDollars: Math.round(parseInt(r.arr_cents, 10) / 100),
      })),
      byStatus: byStatus.map(r => ({
        status: r.status,
        count: parseInt(r.count, 10),
      })),
      monthly: monthly.map(r => ({
        month: r.month,
        monthKey: r.month_key,
        newSubs:       parseInt(r.new_subs, 10),
        cancelledSubs: parseInt(r.cancelled_subs, 10),
      })),
      totals: {
        mrrDollars:   Math.round(parseInt(totals[0]?.total_mrr_cents ?? "0", 10) / 100),
        arrDollars:   Math.round(parseInt(totals[0]?.total_arr_cents ?? "0", 10) / 100),
        activeCount:  parseInt(totals[0]?.active_count  ?? "0", 10),
        churnedCount: parseInt(totals[0]?.churned_count ?? "0", 10),
      },
    });
  } catch (err: any) {
    console.error("[Analytics] Subscriptions error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load subscription analytics" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. BRANCH PERFORMANCE
//    SELECT b.name, COUNT(e.*), COUNT(d.*) FROM branches b
//    LEFT JOIN employees e ... LEFT JOIN documents d ...
//    GROUP BY b.id
// ─────────────────────────────────────────────────────────────────────────────
router.get("/branches", requireAuth, requireMinRole("COMPANY_ADMIN"), requirePermission("VIEW_REPORTS"), async (req: Request, res: Response) => {
  try {
    const isSuper = req.user!.role === "SUPER_ADMIN";
    const tenantParam = req.user!.tenantId;

    const { rows: branchStats } = await query<{
      branch_id: string;
      branch_name: string;
      tenant_name: string;
      address: string;
      counters_count: string;
      branch_status: string;
      employee_count: string;
      active_employee_count: string;
      document_count: string;
      notarised_count: string;
      customer_count: string;
    }>(
      `SELECT
         b.id                                                        AS branch_id,
         b.name                                                      AS branch_name,
         t.name                                                      AS tenant_name,
         b.address,
         b.counters_count,
         b.status                                                    AS branch_status,
         COUNT(DISTINCT e.id)                                        AS employee_count,
         COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active')    AS active_employee_count,
         COUNT(DISTINCT d.id)                                        AS document_count,
         COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'notarised') AS notarised_count,
         COUNT(DISTINCT d.customer_id)                               AS customer_count
       FROM branches b
       JOIN tenants t ON b.tenant_id = t.id
       LEFT JOIN employees e ON e.branch_id = b.id AND e.is_deleted = FALSE
       LEFT JOIN documents d ON d.branch_id = b.id AND d.is_deleted = FALSE
       WHERE b.is_deleted = FALSE
         ${isSuper ? "" : "AND b.tenant_id = $1"}
       GROUP BY b.id, b.name, t.name, b.address, b.counters_count, b.status
       ORDER BY document_count DESC, employee_count DESC`,
      isSuper ? [] : [tenantParam]
    );

    // Document trend per branch last 6 months
    const { rows: branchTrend } = await query<{
      branch_id: string;
      branch_name: string;
      month: string;
      doc_count: string;
    }>(
      `SELECT
         d.branch_id,
         b.name                                                      AS branch_name,
         TO_CHAR(DATE_TRUNC('month', d.created_at), 'Mon YYYY')     AS month,
         COUNT(*)                                                     AS doc_count
       FROM documents d
       JOIN branches b ON b.id = d.branch_id
       WHERE d.created_at >= NOW() - INTERVAL '6 months'
         AND d.is_deleted = FALSE
         ${isSuper ? "" : "AND d.tenant_id = $1"}
       GROUP BY d.branch_id, b.name, DATE_TRUNC('month', d.created_at)
       ORDER BY DATE_TRUNC('month', d.created_at) ASC`,
      isSuper ? [] : [tenantParam]
    );

    res.json({
      branches: branchStats.map(r => ({
        branchId:           r.branch_id,
        branchName:         r.branch_name,
        tenantName:         r.tenant_name,
        address:            r.address,
        countersCount:      parseInt(r.counters_count, 10),
        status:             r.branch_status,
        employeeCount:      parseInt(r.employee_count, 10),
        activeEmployeeCount: parseInt(r.active_employee_count, 10),
        documentCount:      parseInt(r.document_count, 10),
        notarisedCount:     parseInt(r.notarised_count, 10),
        customerCount:      parseInt(r.customer_count, 10),
      })),
      trend: branchTrend.map(r => ({
        branchId:   r.branch_id,
        branchName: r.branch_name,
        month:      r.month,
        docCount:   parseInt(r.doc_count, 10),
      })),
    });
  } catch (err: any) {
    console.error("[Analytics] Branch performance error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load branch performance data" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. OVERVIEW / SUMMARY (for dashboard KPI cards)
//    Single endpoint returning all key counts for the current user's scope
// ─────────────────────────────────────────────────────────────────────────────
router.get("/overview", requireAuth, requireMinRole("COMPANY_ADMIN"), requirePermission("VIEW_REPORTS"), async (req: Request, res: Response) => {
  try {
    const isSuper = req.user!.role === "SUPER_ADMIN";
    const tp = req.user!.tenantId;
    const p = isSuper ? [] : [tp];
    const w = isSuper ? "" : "AND tenant_id = $1";
    const bw = isSuper ? "" : "AND b.tenant_id = $1";

    const [tenantRow, branchRow, empRow, docRow, custRow, subRow] = await Promise.all([
      query<{ total: string; active: string }>(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status='active') AS active
         FROM tenants WHERE is_deleted=FALSE`,
        []
      ),
      query<{ total: string; active: string }>(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status='active') AS active
         FROM branches b WHERE b.is_deleted=FALSE ${bw}`,
        p
      ),
      query<{ total: string; active: string }>(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status='active') AS active
         FROM employees WHERE is_deleted=FALSE ${w}`,
        p
      ),
      query<{ total: string; this_month: string; notarised: string }>(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) AS this_month,
                COUNT(*) FILTER (WHERE status='notarised') AS notarised
         FROM documents WHERE is_deleted=FALSE ${w}`,
        p
      ),
      query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM customers WHERE is_deleted=FALSE ${w}`,
        p
      ),
      query<{ mrr_cents: string }>(
        `SELECT COALESCE(SUM(amount_cents),0) AS mrr_cents
         FROM subscriptions WHERE status='active' ${w}`,
        p
      ),
    ]);

    res.json({
      tenants: {
        total:  parseInt(tenantRow.rows[0]?.total  ?? "0", 10),
        active: parseInt(tenantRow.rows[0]?.active ?? "0", 10),
      },
      branches: {
        total:  parseInt(branchRow.rows[0]?.total  ?? "0", 10),
        active: parseInt(branchRow.rows[0]?.active ?? "0", 10),
      },
      employees: {
        total:  parseInt(empRow.rows[0]?.total  ?? "0", 10),
        active: parseInt(empRow.rows[0]?.active ?? "0", 10),
      },
      documents: {
        total:     parseInt(docRow.rows[0]?.total      ?? "0", 10),
        thisMonth: parseInt(docRow.rows[0]?.this_month ?? "0", 10),
        notarised: parseInt(docRow.rows[0]?.notarised  ?? "0", 10),
      },
      customers: {
        total: parseInt(custRow.rows[0]?.total ?? "0", 10),
      },
      revenue: {
        mrrDollars: Math.round(parseInt(subRow.rows[0]?.mrr_cents ?? "0", 10) / 100),
      },
    });
  } catch (err: any) {
    console.error("[Analytics] Overview error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load overview data" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. BRANCH REPORT (for the Branch Admin Portal "Reports" panel)
//    Replaces the old hardcoded report templates. Real data, scoped to a
//    single branch (and its tenant). Types: daily | weekly | monthly |
//    employee | document | revenue
// ─────────────────────────────────────────────────────────────────────────────
router.get("/branch-report", requireAuth, requireMinRole("BRANCH_ADMIN"), requirePermission("VIEW_REPORTS"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  const branchId = await resolveBranchIdForReport(req);
  if (!branchId) {
    res.status(400).json({ error: "NO_BRANCH", message: "No branch associated with this account" });
    return;
  }

  const reportType = (req.query.type as string) || "daily";

  try {
    if (reportType === "employee") {
      const { start, label } = periodBounds((req.query.period as string) || "weekly");
      const { rows } = await query<{
        employee_id: string;
        full_name: string;
        job_role: string;
        assigned_counter: number | null;
        documents_processed: string;
        tickets_served: string;
        avg_processing_minutes: string | null;
      }>(
        `SELECT
           e.id                                                              AS employee_id,
           u.full_name,
           e.job_role,
           e.assigned_counter,
           COUNT(DISTINCT d.id) FILTER (WHERE d.created_at >= ${start})     AS documents_processed,
           COUNT(DISTINCT qt.id) FILTER (WHERE qt.completed_at >= ${start}) AS tickets_served,
           AVG(EXTRACT(EPOCH FROM (qt.completed_at - qt.serving_at)) / 60)
             FILTER (WHERE qt.completed_at >= ${start} AND qt.serving_at IS NOT NULL) AS avg_processing_minutes
         FROM employees e
         JOIN users u ON u.id = e.user_id
         LEFT JOIN documents d ON d.processed_by = e.user_id AND d.branch_id = e.branch_id AND d.is_deleted = FALSE
         LEFT JOIN queue_tickets qt ON qt.served_by = e.user_id AND qt.branch_id = e.branch_id
         WHERE e.branch_id = $1 AND e.tenant_id = $2 AND e.is_deleted = FALSE
         GROUP BY e.id, u.full_name, e.job_role, e.assigned_counter
         ORDER BY documents_processed DESC, tickets_served DESC`,
        [branchId, tenantId]
      );

      res.json({
        type: "employee",
        periodLabel: label,
        employees: rows.map(r => ({
          employeeId: r.employee_id,
          name: r.full_name,
          jobRole: r.job_role,
          assignedCounter: r.assigned_counter,
          documentsProcessed: parseInt(r.documents_processed, 10),
          ticketsServed: parseInt(r.tickets_served, 10),
          avgProcessingMinutes: r.avg_processing_minutes ? Math.round(parseFloat(r.avg_processing_minutes) * 10) / 10 : null,
        })),
      });
      return;
    }

    if (reportType === "document") {
      const { rows: byStatus } = await query<{ status: string; count: string }>(
        `SELECT status, COUNT(*) AS count
         FROM documents
         WHERE branch_id = $1 AND tenant_id = $2 AND is_deleted = FALSE
         GROUP BY status
         ORDER BY count DESC`,
        [branchId, tenantId]
      );

      const { rows: totals } = await query<{
        total: string; notarised: string; pending: string; rejected: string;
      }>(
        `SELECT
           COUNT(*)                                                                     AS total,
           COUNT(*) FILTER (WHERE status = 'notarised')                                 AS notarised,
           COUNT(*) FILTER (WHERE status IN ('draft','pending_review','approved','signed')) AS pending,
           COUNT(*) FILTER (WHERE status IN ('rejected','revoked','expired'))            AS rejected
         FROM documents
         WHERE branch_id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [branchId, tenantId]
      );

      res.json({
        type: "document",
        byStatus: byStatus.map(r => ({ status: r.status, count: parseInt(r.count, 10) })),
        totals: {
          total:     parseInt(totals[0]?.total     ?? "0", 10),
          notarised: parseInt(totals[0]?.notarised ?? "0", 10),
          pending:   parseInt(totals[0]?.pending   ?? "0", 10),
          rejected:  parseInt(totals[0]?.rejected  ?? "0", 10),
        },
      });
      return;
    }

    if (reportType === "revenue") {
      // NOTE: This schema only tracks subscription/platform billing
      // (payments -> subscriptions, tenant-level), not per-transaction
      // branch cashier fees. There is no real data source for a
      // branch-level cash report, so we surface that honestly instead
      // of fabricating figures.
      const { rows: mrr } = await query<{ mrr_cents: string }>(
        `SELECT COALESCE(SUM(amount_cents), 0) AS mrr_cents
         FROM subscriptions WHERE tenant_id = $1 AND status = 'active'`,
        [tenantId]
      );
      res.json({
        type: "revenue",
        branchRevenueAvailable: false,
        message: "Per-branch transaction revenue isn't tracked in the current schema. Showing company-level subscription billing instead.",
        tenantMrrDollars: Math.round(parseInt(mrr[0]?.mrr_cents ?? "0", 10) / 100),
      });
      return;
    }

    // daily | weekly | monthly
    const { start, label } = periodBounds(reportType);
    const [docRow, queueRow, waitingRow, procTimeRow] = await Promise.all([
      query<{ total: string; notarised: string; customers: string }>(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'notarised') AS notarised,
                COUNT(DISTINCT customer_id) AS customers
         FROM documents
         WHERE branch_id = $1 AND tenant_id = $2 AND is_deleted = FALSE
           AND created_at >= ${start}`,
        [branchId, tenantId]
      ),
      query<{ completed: string }>(
        `SELECT COUNT(*) AS completed
         FROM queue_tickets
         WHERE branch_id = $1 AND tenant_id = $2
           AND status = 'completed' AND completed_at >= ${start}`,
        [branchId, tenantId]
      ),
      query<{ waiting: string }>(
        `SELECT COUNT(*) AS waiting
         FROM queue_tickets
         WHERE branch_id = $1 AND tenant_id = $2
           AND status = 'waiting' AND ticket_date = CURRENT_DATE`,
        [branchId, tenantId]
      ),
      query<{ avg_minutes: string | null }>(
        `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - serving_at)) / 60) AS avg_minutes
         FROM queue_tickets
         WHERE branch_id = $1 AND tenant_id = $2
           AND status = 'completed' AND completed_at >= ${start} AND serving_at IS NOT NULL`,
        [branchId, tenantId]
      ),
    ]);

    res.json({
      type: reportType,
      periodLabel: label,
      documentsProcessed: parseInt(docRow.rows[0]?.total ?? "0", 10),
      documentsNotarised: parseInt(docRow.rows[0]?.notarised ?? "0", 10),
      customersServedDocs: parseInt(docRow.rows[0]?.customers ?? "0", 10),
      queueCompleted: parseInt(queueRow.rows[0]?.completed ?? "0", 10),
      queueWaitingNow: parseInt(waitingRow.rows[0]?.waiting ?? "0", 10),
      avgProcessingMinutes: procTimeRow.rows[0]?.avg_minutes
        ? Math.round(parseFloat(procTimeRow.rows[0].avg_minutes) * 10) / 10
        : null,
    });
  } catch (err: any) {
    console.error("[Analytics] Branch report error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load branch report" });
  }
});

export default router;
