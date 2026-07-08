import { query } from "../db/pool.js";

export interface CompanyProfile {
  id: string;
  tenant_id: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  website: string | null;
  registration_number: string | null;
  tax_id: string | null;
  legal_representative: string | null;
  notary_seal_number: string | null;
  timezone: string;
  locale: string;
  working_days: string[];
  working_hours_start: string | null;
  working_hours_end: string | null;
  max_daily_appointments: number;
  created_at: string;
  updated_at: string;
}

export async function getCompanyProfile(tenantId: string): Promise<CompanyProfile | null> {
  const { rows } = await query<CompanyProfile>(
    `SELECT * FROM company_profiles WHERE tenant_id = $1`,
    [tenantId]
  );
  return rows[0] ?? null;
}

export interface UpdateCompanyProfileInput {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  registrationNumber?: string;
  taxId?: string;
  legalRepresentative?: string;
  notarySealNumber?: string;
  timezone?: string;
  locale?: string;
  workingDays?: string[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  maxDailyAppointments?: number;
}

export async function updateCompanyProfile(
  tenantId: string,
  input: UpdateCompanyProfileInput
): Promise<CompanyProfile> {
  let existing = await getCompanyProfile(tenantId);
  if (!existing) {
    const { rows } = await query<CompanyProfile>(
      `INSERT INTO company_profiles (tenant_id, primary_color, secondary_color)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [tenantId, input.primaryColor ?? "#1e3a5f", input.secondaryColor ?? "#2563eb"]
    );
    existing = rows[0];
  }

  const { rows } = await query<CompanyProfile>(
    `UPDATE company_profiles SET
       logo_url               = COALESCE($2, logo_url),
       primary_color          = COALESCE($3, primary_color),
       secondary_color        = COALESCE($4, secondary_color),
       address                = COALESCE($5, address),
       city                   = COALESCE($6, city),
       country                = COALESCE($7, country),
       postal_code            = COALESCE($8, postal_code),
       contact_name           = COALESCE($9, contact_name),
       contact_phone          = COALESCE($10, contact_phone),
       contact_email          = COALESCE($11, contact_email),
       website                = COALESCE($12, website),
       registration_number    = COALESCE($13, registration_number),
       tax_id                 = COALESCE($14, tax_id),
       legal_representative   = COALESCE($15, legal_representative),
       notary_seal_number     = COALESCE($16, notary_seal_number),
       timezone               = COALESCE($17, timezone),
       locale                 = COALESCE($18, locale),
       working_days           = COALESCE($19, working_days),
       working_hours_start    = COALESCE($20, working_hours_start),
       working_hours_end      = COALESCE($21, working_hours_end),
       max_daily_appointments = COALESCE($22, max_daily_appointments),
       updated_at             = NOW()
     WHERE tenant_id = $1
     RETURNING *`,
    [
      tenantId,
      input.logoUrl ?? null,
      input.primaryColor ?? null,
      input.secondaryColor ?? null,
      input.address ?? null,
      input.city ?? null,
      input.country ?? null,
      input.postalCode ?? null,
      input.contactName ?? null,
      input.contactPhone ?? null,
      input.contactEmail ?? null,
      input.website ?? null,
      input.registrationNumber ?? null,
      input.taxId ?? null,
      input.legalRepresentative ?? null,
      input.notarySealNumber ?? null,
      input.timezone ?? null,
      input.locale ?? null,
      input.workingDays ?? null,
      input.workingHoursStart ?? null,
      input.workingHoursEnd ?? null,
      input.maxDailyAppointments ?? null,
    ]
  );
  return rows[0];
}
