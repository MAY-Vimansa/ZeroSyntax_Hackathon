import type { Job } from "./types";
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const r = Math.PI / 180;
  const dlat = (b.lat - a.lat) * r,
    dlng = (b.lng - a.lng) * r;
  const x =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dlng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
export function colomboDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function travelRemainder(wage: number, transport: number) {
  return Math.round((wage - transport) * 100) / 100;
}
export function missingDetails(
  job: Pick<
    Job,
    | "description"
    | "payment_terms"
    | "location_name"
    | "shift_start_at"
    | "daily_wage_lkr"
  >,
) {
  return [
    !job.payment_terms ? "payment_terms" : null,
    !job.location_name ? "location" : null,
    !job.description ? "duties" : null,
    !job.shift_start_at ? "hours" : null,
    !job.daily_wage_lkr ? "wage" : null,
  ].filter(Boolean) as string[];
}
export function matchReasons(job: Job, skills: string[]) {
  return skills.filter((s) =>
    job.required_skills.some(
      (r) =>
        r.toLowerCase().includes(s.toLowerCase()) ||
        s.toLowerCase().includes(r.toLowerCase()),
    ),
  );
}
export function rankJobs(jobs: Job[], skills: string[]) {
  return jobs
    .map((job) => {
      const matched = matchReasons(job, skills);
      return {
        job,
        matched,
        score: skills.length ? matched.length / skills.length : 0,
      };
    })
    .sort((a, b) => b.score - a.score);
}
