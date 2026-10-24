export const categories = [
  "factory",
  "warehouse",
  "restaurant",
  "hospitality",
  "retail",
  "events",
  "logistics",
  "office",
  "other",
] as const;
export const districts = [
  "Colombo",
  "Gampaha",
  "Kalutara",
  "Galle",
  "Matara",
  "Hambantota",
  "Kandy",
  "Matale",
  "Nuwara Eliya",
  "Jaffna",
  "Kilinochchi",
  "Mannar",
  "Vavuniya",
  "Mullaitivu",
  "Batticaloa",
  "Ampara",
  "Trincomalee",
  "Kurunegala",
  "Puttalam",
  "Anuradhapura",
  "Polonnaruwa",
  "Badulla",
  "Monaragala",
  "Ratnapura",
  "Kegalle",
];
export type Profile = {
  id: string;
  role: "WORKER" | "EMPLOYER" | "ADMIN";
  display_name: string;
  city: string;
  district: string;
  bio: string;
  skills: string[];
  availability: string;
};
export type Company = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  contact_email: string;
  address: string;
  city: string;
  district: string;
  verification_status: string;
};
export type Job = {
  id: string;
  company_id: string;
  created_by: string;
  title: string;
  description: string;
  category: (typeof categories)[number];
  required_skills: string[];
  daily_wage_lkr: number;
  shift_start_at: string;
  shift_end_at: string;
  application_cutoff_at: string;
  required_workers: number;
  approved_count: number;
  location_name: string;
  city: string;
  district: string;
  latitude: number;
  longitude: number;
  payment_terms: string;
  status: string;
  company: Pick<
    Company,
    "id" | "name" | "verification_status" | "contact_email"
  >;
  distance_km: number | null;
};
export type Application = {
  id: string;
  job_id: string;
  worker_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";
  applied_at: string;
  job: Job;
  worker?: Profile;
};
export type SearchFilters = {
  query?: string;
  category?: string;
  district?: string;
  city?: string;
  minWage?: number;
  date?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: "nearest" | "wage" | "soonest";
  page?: number;
  limit?: number;
};
export type SearchResult = { jobs: Job[]; total: number };
