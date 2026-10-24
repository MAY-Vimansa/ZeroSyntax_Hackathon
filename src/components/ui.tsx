"use client";
import {
  useEffect,
  useState,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  MapPin,
  CalendarDays,
  Clock3,
  ArrowUpRight,
  LoaderCircle,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { api, useApp } from "./provider";
import type { Job } from "@/lib/types";
import type { MessageKey } from "@/lib/i18n";
const hydrationSubscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(
    hydrationSubscribe,
    () => true,
    () => false,
  );
}
export function useNow() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()));
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
export function useData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    if (!path) {
      queueMicrotask(() => {
        if (live) {
          setLoading(false);
          setData(null);
        }
      });
      return () => {
        live = false;
      };
    }
    queueMicrotask(() => {
      if (live) {
        setLoading(true);
        setError(false);
      }
    });
    api<T>(path)
      .then((value) => {
        if (live) setData(value);
      })
      .catch(() => {
        if (live) setError(true);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [path, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, loading, reload };
}
export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="FlexiRova home">
      <span className="logo-mark">
        <MapPin size={23} strokeWidth={2.7} />
      </span>
      <span>
        Flexi<span className="red">Rova</span>
        <span className="logo-dot">.</span>
      </span>
    </Link>
  );
}
export function PageHeading({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {body && <p className="muted">{body}</p>}
      </div>
      {action}
    </div>
  );
}
export function Loading() {
  const { t } = useApp();
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} />
      {t("loading")}
    </div>
  );
}
export function Failure({ retry }: { retry: () => void }) {
  const { t } = useApp();
  return (
    <div className="empty" role="alert">
      <AlertCircle />
      <h3>{t("error")}</h3>
      <button className="button secondary" onClick={retry}>
        <RotateCcw size={16} />
        {t("retry")}
      </button>
    </div>
  );
}
export function Empty({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <BriefcaseBusiness size={28} />
      </span>
      <h3>{title}</h3>
      {body && <p className="muted">{body}</p>}
      {children}
    </div>
  );
}
export function Status({ value }: { value: string }) {
  const { t } = useApp();
  return (
    <span className={`status status-${value.toLowerCase()}`}>
      {t(value as MessageKey)}
    </span>
  );
}
export function JobCard({
  job,
  compact = false,
}: {
  job: Job;
  compact?: boolean;
}) {
  const { t, categoryName, money, date, time } = useApp();
  return (
    <article className={`job-card ${compact ? "compact" : ""}`}>
      <div className="job-top">
        <span className={`company-avatar category-${job.category}`}>
          {job.company?.name
            ?.split(" ")
            .slice(0, 2)
            .map((s) => s[0])
            .join("") ?? "FR"}
        </span>
        <span className="chip">{categoryName(job.category)}</span>
      </div>
      <Link className="job-title" href={`/jobs/${job.id}`}>
        {job.title}
        <ArrowUpRight size={18} />
      </Link>
      <p className="company-name">{job.company?.name}</p>
      <div className="job-facts">
        <span>
          <MapPin size={15} />
          {job.city}, {job.district}
        </span>
        <span>
          <CalendarDays size={15} />
          {date(job.shift_start_at)}
        </span>
        <span>
          <Clock3 size={15} />
          {time(job.shift_start_at)} – {time(job.shift_end_at)}
        </span>
      </div>
      {!compact && (
        <div className="tags">
          {job.required_skills.slice(0, 3).map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      )}
      <div className="job-bottom">
        <div>
          <strong>{money(Number(job.daily_wage_lkr))}</strong>
          <small>{t("perDay")}</small>
        </div>
        <Link
          className="circle-link"
          href={`/jobs/${job.id}`}
          aria-label={`${t("view")}: ${job.title}`}
        >
          <ArrowRight size={20} />
        </Link>
      </div>
      <div className="job-foot">
        <span className="availability-dot" />
        {job.required_workers - job.approved_count} {t("spots")}
        {job.distance_km != null && (
          <span className="distance" title={t("distanceNote")}>
            {job.distance_km.toFixed(1)} km
          </span>
        )}
      </div>
    </article>
  );
}
