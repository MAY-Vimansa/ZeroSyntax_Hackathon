"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  CalendarDays,
  Clock3,
  Users,
  Info,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { api, useApp } from "./provider";
import { useData, Loading, Failure, Empty } from "./ui";
import { missingDetails, travelRemainder } from "@/lib/domain";
import type { Job, Application } from "@/lib/types";
import type { MessageKey } from "@/lib/i18n";
export function JobDetail({ id }: { id: string }) {
  const { t, money, date, time, categoryName, profile, report } = useApp();
  const { data: job, loading, error, reload } = useData<Job>(`/api/jobs/${id}`);
  const apps = useData<Application[]>(
    profile?.role === "WORKER" ? "/api/me/applications" : null,
  );
  const [travel, setTravel] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  async function apply() {
    if (!profile) {
      router.push(`/login?next=${encodeURIComponent(`/jobs/${id}`)}`);
      return;
    }
    setBusy(true);
    try {
      await api(`/api/jobs/${id}/apply`, { method: "POST" });
      toast.success(t("applied"));
      apps.reload();
      router.push("/applications");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="container page">
        <Failure retry={reload} />
      </div>
    );
  if (!job) return <Empty title={t("notFound")} />;
  const missing = missingDetails(job);
  const existing = apps.data?.find((a) => a.job_id === id);
  const available =
    job.status === "PUBLISHED" &&
    new Date(job.application_cutoff_at) > new Date() &&
    job.approved_count < job.required_workers;
  return (
    <div className="container page">
      <Link className="back-link" href="/jobs">
        <ArrowLeft size={16} />
        {t("back")}
      </Link>
      <div className="detail-grid">
        <div>
          <section className="panel detail-header">
            <div className="job-top">
              <span className={`company-avatar category-${job.category}`}>
                {job.company.name
                  .split(" ")
                  .slice(0, 2)
                  .map((s) => s[0])
                  .join("")}
              </span>
              <span className="chip">{categoryName(job.category)}</span>
            </div>
            <h1>{job.title}</h1>
            <p className="company-name">{job.company.name}</p>
            <span className="neutral-status">
              <Info size={14} />
              {t("unverified")}
            </span>
            <div className="detail-facts">
              <span>
                <MapPin size={20} />
                <div>
                  <small>{t("location")}</small>
                  {job.city}, {job.district}
                </div>
              </span>
              <span>
                <CalendarDays size={20} />
                <div>
                  <small>{t("date")}</small>
                  {date(job.shift_start_at)}
                </div>
              </span>
              <span>
                <Clock3 size={20} />
                <div>
                  <small>{t("hours")}</small>
                  {time(job.shift_start_at)} – {time(job.shift_end_at)}
                </div>
              </span>
              <span>
                <Users size={20} />
                <div>
                  <small>{t("spots")}</small>
                  {job.required_workers - job.approved_count}
                </div>
              </span>
            </div>
          </section>
          <section className="panel prose">
            <h2>{t("duties")}</h2>
            <p className="preserve-lines">{job.description}</p>
            <h3>{t("requirements")}</h3>
            {job.required_skills.length ? (
              <div className="tags">
                {job.required_skills.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            ) : (
              <p className="muted">{t("unspecified")}</p>
            )}
            <h3>{t("location")}</h3>
            <p>{job.location_name}</p>
            <a
              className="text-link"
              href={`https://www.openstreetmap.org/?mlat=${job.latitude}&mlon=${job.longitude}#map=16/${job.latitude}/${job.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              {t("location")}
              <ArrowUpRight size={16} />
            </a>
            <h3>{t("payment")}</h3>
            <p>{job.payment_terms || t("unspecified")}</p>
          </section>
          <section
            className={`clarity-panel ${missing.length ? "has-missing" : ""}`}
          >
            <ShieldCheck size={24} />
            <div>
              <h3>{t("clarity")}</h3>
              <p>{t(missing.length ? "missing" : "clearDetails")}</p>
              {missing.length > 0 && (
                <ul>
                  {missing.map((s) => (
                    <li key={s}>{t(s as MessageKey)}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
        <aside className="detail-side">
          <section className="panel apply-panel">
            <p className="muted">{t("wageLabel")}</p>
            <h2>
              {money(Number(job.daily_wage_lkr))}
              <small>{t("perDay")}</small>
            </h2>
            <div className="apply-deadline">
              <Clock3 size={17} />
              <span>
                {t("cutoff")}
                <strong>
                  {date(job.application_cutoff_at)} ·{" "}
                  {time(job.application_cutoff_at)}
                </strong>
              </span>
            </div>
            {!available ? (
              <p className="notice">{t("unavailable")}</p>
            ) : existing ? (
              <Link className="button secondary" href="/applications">
                {t(existing.status)}
                <ArrowUpRight size={17} />
              </Link>
            ) : profile?.role === "EMPLOYER" ? (
              <p className="notice">{t("workerOnly")}</p>
            ) : (
              <button
                className="button"
                onClick={apply}
                disabled={busy || (apps.loading && !!profile)}
              >
                {t(busy ? "loading" : "apply")}
                <ArrowUpRight size={18} />
              </button>
            )}
            <p className="small-text muted">{t("notGuaranteed")}</p>
          </section>
          <section className="panel travel-panel">
            <span className="step-icon">
              <Wallet size={22} />
            </span>
            <h3>{t("travel")}</h3>
            <label>
              {t("travelInput")}
              <input
                type="number"
                min="0"
                max="10000000"
                value={travel}
                onChange={(e) => setTravel(e.target.value)}
                placeholder="0"
              />
            </label>
            {travel !== "" && Number(travel) >= 0 && (
              <div className="travel-result">
                <span>{t("left")}</span>
                <strong>
                  {money(
                    travelRemainder(Number(job.daily_wage_lkr), Number(travel)),
                  )}
                </strong>
              </div>
            )}
            <p className="small-text muted">{t("travelNote")}</p>
          </section>
          <p className="demo-disclosure">
            <Info size={14} />
            {t("demo")}
          </p>
        </aside>
      </div>
    </div>
  );
}
