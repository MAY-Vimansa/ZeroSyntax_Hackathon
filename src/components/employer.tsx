"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  Plus,
  ArrowUpRight,
  ArrowRight,
  BriefcaseBusiness,
  Users,
  Clock3,
  Check,
  Building2,
  MapPin,
  CalendarDays,
  Pencil,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { api, useApp } from "./provider";
import {
  useData,
  Loading,
  Failure,
  Empty,
  PageHeading,
  Status,
  useNow,
} from "./ui";
import { Protected, DistrictSelect } from "./accounts";
import {
  categories,
  type Job,
  type Application,
  type Company,
} from "@/lib/types";
type EmployerJob = Job & { applications: { count: number }[] };
export function EmployerDashboard() {
  const now = useNow();
  const { t, profile } = useApp();
  const jobs = useData<EmployerJob[]>(
    profile?.role === "EMPLOYER" ? "/api/employer/jobs" : null,
  );
  const apps = useData<Application[]>(
    profile?.role === "EMPLOYER" ? "/api/employer/applicants" : null,
  );
  const company = useData<Company>(
    profile?.role === "EMPLOYER" ? "/api/company" : null,
  );
  const values = [
    {
      key: "totalJobs" as const,
      value: jobs.data?.length,
      Icon: BriefcaseBusiness,
    },
    {
      key: "open" as const,
      value: jobs.data?.filter(
        (j) =>
          j.status === "PUBLISHED" &&
          Date.parse(j.application_cutoff_at) > now &&
          j.approved_count < j.required_workers,
      ).length,
      Icon: Clock3,
    },
    {
      key: "approved" as const,
      value: apps.data?.filter((a) => a.status === "APPROVED").length,
      Icon: Users,
    },
    {
      key: "pending" as const,
      value: apps.data?.filter((a) => a.status === "PENDING").length,
      Icon: Check,
    },
  ];
  return (
    <Protected employer>
      <PageHeading
        eyebrow={company.data?.name ?? t("employers")}
        title={`${t("welcome")}, ${profile?.display_name.split(" ")[0] ?? ""}.`}
        body={t("dashboardBody")}
        action={
          <Link className="button" href="/employer/jobs/new">
            <Plus size={18} />
            {t("post")}
          </Link>
        }
      />
      <div className="metric-grid">
        {values.map(({ key, value, Icon }, i) => (
          <article className="metric-card panel" key={key}>
            <div>
              <span className={`metric-icon tone-${i}`}>
                <Icon size={21} />
              </span>
              <span className="metric-dash">—</span>
            </div>
            <strong>{value ?? "—"}</strong>
            <span>{t(key)}</span>
          </article>
        ))}
      </div>
      {!company.loading && !company.data && (
        <div className="notice">
          <Building2 size={19} />
          {t("companyFirst")}
          <Link className="text-link" href="/employer/company">
            {t("company")}
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
      <div className="dashboard-grid">
        <section className="panel dashboard-jobs">
          <div className="section-heading">
            <h2>{t("recent")}</h2>
            <Link className="text-link" href="/employer/jobs">
              {t("myJobs")}
              <ArrowUpRight size={17} />
            </Link>
          </div>
          {jobs.loading ? (
            <Loading />
          ) : jobs.error ? (
            <Failure retry={jobs.reload} />
          ) : jobs.data?.length ? (
            <JobRows jobs={jobs.data.slice(0, 5)} />
          ) : (
            <Empty title={t("noJobs")} />
          )}
        </section>
        <aside className="panel quick-actions">
          <span className="step-icon">
            <BriefcaseBusiness size={23} />
          </span>
          <h2>{t("actions")}</h2>
          <p className="muted">{t("employerBody")}</p>
          <Link className="button" href="/employer/jobs/new">
            <Plus size={17} />
            {t("post")}
          </Link>
          <Link className="button secondary" href="/employer/applicants">
            <Users size={17} />
            {t("review")}
          </Link>
          <Link className="text-link" href="/employer/company">
            {t("company")}
            <ArrowRight size={17} />
          </Link>
          <div className="sidebar-callout">
            <Info size={18} />
            <p>{t("demo")}</p>
          </div>
        </aside>
      </div>
    </Protected>
  );
}
function JobRows({ jobs }: { jobs: EmployerJob[] }) {
  const { t, date, money } = useApp();
  return (
    <div className="job-rows">
      {jobs.map((job) => (
        <Link
          className="job-row"
          key={job.id}
          href={`/employer/jobs/${job.id}`}
        >
          <span className={`company-avatar category-${job.category}`}>
            <BriefcaseBusiness size={22} />
          </span>
          <div className="job-row-main">
            <h3>{job.title}</h3>
            <p>
              {job.city} · {date(job.shift_start_at)}
            </p>
          </div>
          <div className="job-row-meta">
            <strong>{money(Number(job.daily_wage_lkr))}</strong>
            <small>
              {job.approved_count}/{job.required_workers} {t("approved")}
            </small>
          </div>
          <Status value={job.status} />
          <ArrowUpRight size={17} />
        </Link>
      ))}
    </div>
  );
}
export function EmployerJobs() {
  const { t, profile } = useApp();
  const result = useData<EmployerJob[]>(
    profile?.role === "EMPLOYER" ? "/api/employer/jobs" : null,
  );
  return (
    <Protected employer>
      <PageHeading
        title={t("myJobs")}
        body={t("dashboardBody")}
        action={
          <Link className="button" href="/employer/jobs/new">
            <Plus size={18} />
            {t("post")}
          </Link>
        }
      />
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <Failure retry={result.reload} />
      ) : result.data?.length ? (
        <section className="panel">
          <JobRows jobs={result.data} />
        </section>
      ) : (
        <Empty title={t("noJobs")}>
          <Link className="button" href="/employer/jobs/new">
            {t("post")}
          </Link>
        </Empty>
      )}
    </Protected>
  );
}
export function Applicants({ jobId }: { jobId?: string }) {
  const { t, profile } = useApp();
  const result = useData<Application[]>(
    profile?.role === "EMPLOYER"
      ? `/api/employer/${jobId ? `jobs/${jobId}/applicants` : "applicants"}`
      : null,
  );
  return (
    <Protected employer>
      {!jobId && (
        <PageHeading title={t("applicants")} body={t("applicationsBody")} />
      )}
      <section className="panel">
        <div className="section-heading">
          <h2>{t("applicants")}</h2>
          <span className="chip">{result.data?.length ?? 0}</span>
        </div>
        {result.loading ? (
          <Loading />
        ) : result.error ? (
          <Failure retry={result.reload} />
        ) : result.data?.length ? (
          <div className="applicant-list">
            {result.data.map((a) => (
              <Applicant key={a.id} application={a} reload={result.reload} />
            ))}
          </div>
        ) : (
          <Empty title={t("noApplicants")} />
        )}
      </section>
    </Protected>
  );
}
function Applicant({
  application: a,
  reload,
}: {
  application: Application;
  reload: () => void;
}) {
  const { t, report } = useApp();
  const [busy, setBusy] = useState(false);
  async function decide(action: string) {
    setBusy(true);
    try {
      await api(`/api/applications/${a.id}/${action}`, { method: "POST" });
      toast.success(t("saved"));
      reload();
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="applicant">
      <div className="applicant-person">
        <span className="company-avatar">
          {a.worker?.display_name[0] ?? "W"}
        </span>
        <div>
          <h3>{a.worker?.display_name}</h3>
          <p className="muted">{a.job?.title}</p>
        </div>
        <Status value={a.status} />
      </div>
      <p>{a.worker?.bio || t("noExperience")}</p>
      <div className="tags">
        {a.worker?.skills.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
      {a.status === "PENDING" && (
        <div className="applicant-buttons">
          <button
            className="button small"
            disabled={busy}
            onClick={() => decide("approve")}
          >
            <Check size={17} />
            {t(busy ? "loading" : "approve")}
          </button>
          <button
            className="button small secondary"
            disabled={busy}
            onClick={() => decide("reject")}
          >
            {t("reject")}
          </button>
        </div>
      )}
    </article>
  );
}
export function ManageJob({ id }: { id: string }) {
  const { t, date, time, money, profile, report } = useApp();
  const result = useData<Job>(
    profile?.role === "EMPLOYER" ? `/api/jobs/${id}` : null,
  );
  const [busy, setBusy] = useState(false);
  async function close() {
    setBusy(true);
    try {
      await api(`/api/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CLOSED" }),
      });
      toast.success(t("saved"));
      result.reload();
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Protected employer>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <Failure retry={result.reload} />
      ) : (
        result.data && (
          <>
            <PageHeading
              eyebrow={t("manage")}
              title={result.data.title}
              body={`${result.data.city} · ${date(result.data.shift_start_at)} · ${time(result.data.shift_start_at)} – ${time(result.data.shift_end_at)}`}
              action={
                <div className="button-row">
                  <Link
                    className="button secondary"
                    href={`/employer/jobs/${id}/edit`}
                  >
                    <Pencil size={16} />
                    {t("edit")}
                  </Link>
                  {result.data.status !== "CLOSED" && (
                    <button
                      className="button secondary danger-text"
                      onClick={close}
                      disabled={busy}
                    >
                      {t(busy ? "loading" : "close")}
                    </button>
                  )}
                </div>
              }
            />
            <div className="shift-summary panel">
              <Status value={result.data.status} />
              <strong>{money(Number(result.data.daily_wage_lkr))}</strong>
              <span>
                {result.data.approved_count}/{result.data.required_workers}{" "}
                {t("approved")}
              </span>
              <span className="muted">
                {t("cutoff")} · {time(result.data.application_cutoff_at)}
              </span>
            </div>
            <Applicants jobId={id} />
          </>
        )
      )}
    </Protected>
  );
}
export function JobEditor({ id }: { id?: string }) {
  const { t, profile } = useApp();
  const result = useData<Job>(
    id && profile?.role === "EMPLOYER" ? `/api/jobs/${id}` : null,
  );
  const company = useData<Company>(
    profile?.role === "EMPLOYER" ? "/api/company" : null,
  );
  return (
    <Protected employer>
      <PageHeading
        eyebrow={t("employers")}
        title={t(id ? "edit" : "post")}
        body={t("jobFormBody")}
      />
      {company.loading || (id && result.loading) ? (
        <Loading />
      ) : company.error ? (
        <Failure retry={company.reload} />
      ) : !company.data ? (
        <Empty title={t("companyFirst")}>
          <Link className="button" href="/employer/company">
            {t("company")}
          </Link>
        </Empty>
      ) : id && result.error ? (
        <Failure retry={result.reload} />
      ) : (
        <JobForm job={result.data} company={company.data} />
      )}
    </Protected>
  );
}
function JobForm({ job, company }: { job: Job | null; company: Company }) {
  const { t, categoryName, report } = useApp();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const local = (iso: string) =>
    new Date(Date.parse(iso) + 19800000).toISOString().slice(0, 16);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const native = e.nativeEvent as SubmitEvent;
    const f = new FormData(e.currentTarget);
    const raw = Object.fromEntries(f);
    const status =
      (native.submitter as HTMLButtonElement)?.value ?? "PUBLISHED";
    const body = {
      ...raw,
      status,
      required_skills: String(raw.required_skills)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      shift_start_at: new Date(`${raw.shift_start_at}:00+05:30`).toISOString(),
      shift_end_at: new Date(`${raw.shift_end_at}:00+05:30`).toISOString(),
    };
    setBusy(true);
    try {
      const saved = await api<{ id: string }>(
        job ? `/api/jobs/${job.id}` : "/api/jobs",
        { method: job ? "PATCH" : "POST", body: JSON.stringify(body) },
      );
      toast.success(t(status === "PUBLISHED" ? "published" : "saved"));
      router.push(`/employer/jobs/${saved.id}`);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form method="post" className="job-form" onSubmit={submit}>
      <section className="panel">
        <h2>
          <BriefcaseBusiness size={20} />
          {t("duties")}
        </h2>
        <div className="form-grid">
          <label className="full-row">
            {t("title")}
            <input
              name="title"
              required
              minLength={3}
              maxLength={120}
              defaultValue={job?.title}
            />
          </label>
          <label className="full-row">
            {t("description")}
            <textarea
              name="description"
              required
              minLength={20}
              maxLength={5000}
              rows={5}
              defaultValue={job?.description}
            />
          </label>
          <label>
            {t("category")}
            <select name="category" defaultValue={job?.category ?? "warehouse"}>
              {categories.map((c) => (
                <option value={c} key={c}>
                  {categoryName(c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("needed")}
            <input
              name="required_workers"
              required
              type="number"
              min={Math.max(job?.approved_count ?? 1, 1)}
              max="10000"
              defaultValue={job?.required_workers ?? 1}
            />
          </label>
          <label className="full-row">
            {t("skills")}
            <input
              name="required_skills"
              defaultValue={job?.required_skills.join(", ")}
              maxLength={1800}
            />
            <small>{t("skillsHelp")}</small>
          </label>
        </div>
      </section>
      <section className="panel">
        <h2>
          <CalendarDays size={20} />
          {t("hours")}
        </h2>
        <div className="notice small-text">{t("timezone")}</div>
        <div className="form-grid">
          <label>
            {t("start")}
            <input
              name="shift_start_at"
              type="datetime-local"
              required
              defaultValue={job ? local(job.shift_start_at) : ""}
            />
          </label>
          <label>
            {t("end")}
            <input
              name="shift_end_at"
              type="datetime-local"
              required
              defaultValue={job ? local(job.shift_end_at) : ""}
            />
          </label>
          <label>
            {t("wage")}
            <input
              name="daily_wage_lkr"
              type="number"
              min="1"
              max="10000000"
              step="0.01"
              required
              defaultValue={job?.daily_wage_lkr}
            />
          </label>
          <label>
            {t("payment")}
            <input
              name="payment_terms"
              maxLength={1000}
              defaultValue={job?.payment_terms}
            />
          </label>
        </div>
      </section>
      <section className="panel">
        <h2>
          <MapPin size={20} />
          {t("location")}
        </h2>
        <div className="form-grid">
          <label className="full-row">
            {t("address")}
            <input
              name="location_name"
              required
              minLength={3}
              maxLength={250}
              defaultValue={job?.location_name}
            />
          </label>
          <label>
            {t("city")}
            <input
              name="city"
              required
              maxLength={80}
              defaultValue={job?.city ?? company.city}
            />
          </label>
          <label>
            {t("district")}
            <DistrictSelect
              required
              value={job?.district ?? company.district}
            />
          </label>
          <label>
            {t("lat")}
            <input
              name="latitude"
              type="number"
              step="any"
              min="-90"
              max="90"
              required
              defaultValue={job?.latitude}
            />
          </label>
          <label>
            {t("lng")}
            <input
              name="longitude"
              type="number"
              step="any"
              min="-180"
              max="180"
              required
              defaultValue={job?.longitude}
            />
          </label>
        </div>
        <p className="muted small-text">
          {t("coordsHelp")}{" "}
          <a
            className="text-link"
            href="https://www.openstreetmap.org"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap
            <ArrowUpRight size={14} />
          </a>
        </p>
      </section>
      <div className="form-footer">
        <Link href="/employer/jobs" className="button secondary">
          {t("cancel")}
        </Link>
        <div className="button-row">
          <button
            className="button secondary"
            type="submit"
            value="DRAFT"
            disabled={busy}
          >
            {t("draft")}
          </button>
          <button
            className="button"
            type="submit"
            value="PUBLISHED"
            disabled={busy}
          >
            {t(busy ? "loading" : "publish")}
            <ArrowUpRight size={18} />
          </button>
        </div>
      </div>
    </form>
  );
}
