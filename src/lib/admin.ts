import type { Company, Profile } from "./types";

export type AdminUser = Profile & { created_at: string };
export type AdminCompany = Company & { owner_name: string; created_at: string };
export type AdminJob = {
  id: string;
  title: string;
  city: string;
  district: string;
  category: string;
  daily_wage_lkr: number;
  shift_start_at: string;
  shift_end_at: string;
  application_cutoff_at: string;
  required_workers: number;
  approved_count: number;
  status: string;
  created_at: string;
  company_name: string;
};
export type AdminApplication = {
  id: string;
  status: string;
  applied_at: string;
  worker_name: string;
  job_title: string;
  company_name: string;
};
export type AdminActivity = {
  id: string;
  actor_name: string;
  action: string;
  target_name: string;
  previous_status: string;
  next_status: string;
  note: string;
  created_at: string;
};
export type AdminSnapshot = {
  generated_at: string;
  period_days: number;
  totals: {
    workers: number;
    new_workers: number;
    employers: number;
    new_employers: number;
    companies: number;
    unverified_companies: number;
    active_jobs: number;
    jobs: number;
    applications: number;
    period_applications: number;
    pending_applications: number;
    approved_applications: number;
  };
  trend: {
    day: string;
    workers: number;
    employers: number;
    applications: number;
  }[];
  application_statuses: Record<string, number>;
  users: AdminUser[];
  companies: AdminCompany[];
  jobs: AdminJob[];
  applications: AdminApplication[];
  activity: AdminActivity[];
};
export type AdminSection =
  "overview" | "users" | "companies" | "jobs" | "applications" | "activity";
export const adminSections = [
  "overview",
  "users",
  "companies",
  "jobs",
  "applications",
  "activity",
] as const;
export function matchesAdminSearch(
  query: string,
  ...values: (string | undefined)[]
) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const text = values.filter(Boolean).join(" ").toLowerCase();
  return terms.every((term) => text.includes(term));
}
// Quote all cells and neutralize spreadsheet formula prefixes in user-written content.
export function adminCsv(rows: (string | number)[][]) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value);
          const safe = /^[\s]*[=+\-@\t\r\n]/.test(text) ? `'${text}` : text;
          return `"${safe.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}
