"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Check,
  Mail,
  Info,
  CalendarDays,
  Clock3,
  MapPin,
} from "lucide-react";
import { browserDb } from "@/lib/supabase/client";
import { api, useApp } from "./provider";
import {
  Loading,
  PageHeading,
  useData,
  Failure,
  Empty,
  Status,
  useNow,
  useHydrated,
} from "./ui";
import type { Application, Company, Profile } from "@/lib/types";
export function Protected({
  children,
  employer = false,
}: {
  children: ReactNode;
  employer?: boolean;
}) {
  const { profile, authLoading, t } = useApp();
  if (authLoading) return <Loading />;
  if (!profile)
    return (
      <div className="container page">
        <Empty title={t("signInRequired")}>
          <Link className="button" href="/login">
            {t("login")}
            <ArrowRight size={17} />
          </Link>
        </Empty>
      </div>
    );
  if (employer && profile.role !== "EMPLOYER")
    return <Empty title={t("wrongRole")} />;
  return <>{children}</>;
}
type AuthValues = { email: string; password: string; display_name: string };
export function Auth({ signup = false }: { signup?: boolean }) {
  const hydrated = useHydrated();
  const { t, refreshProfile } = useApp();
  const params = useSearchParams();
  const [role, setRole] = useState(
    params.get("role") === "EMPLOYER" ? "EMPLOYER" : "WORKER",
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false);
  const router = useRouter();
  const { register, handleSubmit } = useForm<AuthValues>();
  async function submit(values: AuthValues) {
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const client = browserDb();
      if (signup) {
        const { error } = await client.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: { display_name: values.display_name, role },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage(t("verifyEmail"));
      } else {
        const { error } = await client.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
        await refreshProfile();
        const {
          data: { user },
        } = await client.auth.getUser();
        const next = params.get("next");
        router.push(
          next?.startsWith("/") && !next.startsWith("//")
            ? next
            : user?.user_metadata?.role === "EMPLOYER"
              ? "/employer"
              : "/applications",
        );
      }
    } catch {
      setFailed(true);
      setMessage(t("authError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout container">
      <section className="auth-story">
        <p className="eyebrow">FLEXIROVA</p>
        <h1>{t("onboarding")}</h1>
        <p>{t("heroBody")}</p>
        <div className="auth-art">
          <div className="auth-art-ring" />
          <MapPin size={64} />
          <div className="auth-art-tag">
            <Check size={18} />
            {t("free")}
          </div>
        </div>
        <div className="auth-promises">
          <span>
            <Check size={17} />
            {t("clearPay")}
          </span>
          <span>
            <Check size={17} />
            {t("local")}
          </span>
        </div>
      </section>
      <section className="auth-form panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t(signup ? "register" : "welcome")}</p>
            <h2>{t(signup ? "create" : "welcome")}</h2>
            <p className="muted">{t("loginBody")}</p>
          </div>
        </div>
        {signup && (
          <div className="role-picker">
            <button
              type="button"
              className={role === "WORKER" ? "selected" : ""}
              onClick={() => setRole("WORKER")}
            >
              <BriefcaseBusiness size={21} />
              {t("worker")}
            </button>
            <button
              type="button"
              className={role === "EMPLOYER" ? "selected" : ""}
              onClick={() => setRole("EMPLOYER")}
            >
              <Building2 size={21} />
              {t("employer")}
            </button>
          </div>
        )}
        <form method="post" onSubmit={handleSubmit(submit)}>
          {signup && (
            <label>
              {t("name")}
              <input
                {...register("display_name")}
                disabled={!hydrated || busy}
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
              />
            </label>
          )}
          <label>
            {t("email")}
            <input
              {...register("email")}
              disabled={!hydrated || busy}
              type="email"
              required
              autoComplete="email"
            />
          </label>
          <label>
            {t("password")}
            <input
              {...register("password")}
              disabled={!hydrated || busy}
              aria-label={t("password")}
              aria-describedby={signup ? "password-help" : undefined}
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete={signup ? "new-password" : "current-password"}
            />
            {signup && <small id="password-help">{t("passwordHelp")}</small>}
          </label>
          {message && (
            <p
              role="status"
              className={failed ? "form-error" : "notice success-notice"}
            >
              {message}
            </p>
          )}
          <button className="button" type="submit" disabled={busy || !hydrated}>
            {t(busy ? "loading" : signup ? "create" : "login")}
            <ArrowRight size={18} />
          </button>
        </form>
        <p className="auth-switch">
          {t(signup ? "haveAccount" : "newHere")}{" "}
          <Link href={signup ? "/login" : "/register"}>
            {t(signup ? "login" : "register")}
          </Link>
        </p>
        {signup && (
          <p className="notice small-text">
            <Mail size={16} />
            {t("emailLocal")}{" "}
            <a href="http://127.0.0.1:55324" target="_blank" rel="noreferrer">
              {t("inbox")}
            </a>
          </p>
        )}
        {!signup && process.env.NEXT_PUBLIC_LOCAL_DEMO === "true" && (
          <div className="demo-accounts">
            <strong>{t("demoAccounts")}</strong>
            <span>worker@flexirova.example</span>
            <span>employer@flexirova.example</span>
            <small>
              {t("credentials")} <code>FlexiRova!2026</code>
            </small>
          </div>
        )}
      </section>
    </div>
  );
}
export function ProfilePage() {
  const { t, profile } = useApp();
  return (
    <Protected>
      <div className="container page">
        <div className="account-top">
          <PageHeading
            eyebrow={t("profile")}
            title={t("onboarding")}
            body={t("profileBody")}
          />
          <Link
            className="button secondary"
            href={profile?.role === "EMPLOYER" ? "/employer" : "/applications"}
          >
            {t(profile?.role === "EMPLOYER" ? "overview" : "applications")}
            <ArrowUpRight size={16} />
          </Link>
        </div>
        {profile && <ProfileForm key={profile.id} profile={profile} />}
      </div>
    </Protected>
  );
}
function ProfileForm({ profile }: { profile: Profile }) {
  const { t, refreshProfile, report } = useApp();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          ...Object.fromEntries(f),
          skills: String(f.get("skills"))
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      await refreshProfile();
      toast.success(t("saved"));
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form method="post" className="panel profile-form" onSubmit={submit}>
      <div className="profile-identity">
        <span className="company-avatar">{profile.display_name[0]}</span>
        <div>
          <h2>{profile.display_name}</h2>
          <p className="muted">
            {profile.role === "WORKER" ? t("worker") : t("employers")}
          </p>
        </div>
      </div>
      <div className="form-grid">
        <label>
          {t("name")}
          <input
            name="display_name"
            defaultValue={profile.display_name}
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label>
          {t("city")}
          <input name="city" defaultValue={profile.city} maxLength={80} />
        </label>
        <label>
          {t("district")}
          <DistrictSelect value={profile.district} />
        </label>
        <label>
          {t("availability")}
          <input
            name="availability"
            defaultValue={profile.availability}
            maxLength={500}
          />
        </label>
        <label className="full-row">
          {t("bio")}
          <textarea
            name="bio"
            defaultValue={profile.bio}
            maxLength={2000}
            rows={4}
          />
        </label>
        <label className="full-row">
          {t("skills")}
          <input
            name="skills"
            defaultValue={profile.skills.join(", ")}
            maxLength={1800}
          />
          <small>{t("skillsHelp")}</small>
        </label>
      </div>
      <div className="form-footer">
        <p className="muted small-text">
          <Info size={14} />
          {t("aiOff")}
        </p>
        <button className="button" disabled={busy}>
          {t(busy ? "loading" : "save")}
          <Check size={17} />
        </button>
      </div>
    </form>
  );
}
import { districts } from "@/lib/types";
export function DistrictSelect({
  value = "",
  required = false,
}: {
  value?: string;
  required?: boolean;
}) {
  const { t } = useApp();
  return (
    <select
      aria-label={t("district")}
      name="district"
      defaultValue={value}
      required={required}
    >
      <option value="">{t("district")}</option>
      {districts.map((d) => (
        <option key={d}>{d}</option>
      ))}
    </select>
  );
}
export function CompanyPage() {
  const { t, profile } = useApp();
  const result = useData<Company>(
    profile?.role === "EMPLOYER" ? "/api/company" : null,
  );
  return (
    <Protected employer>
      <PageHeading
        eyebrow={t("employers")}
        title={t("company")}
        body={t("companyBody")}
      />
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <Failure retry={result.reload} />
      ) : (
        <CompanyForm company={result.data} saved={result.reload} />
      )}
    </Protected>
  );
}
function CompanyForm({
  company,
  saved,
}: {
  company: Company | null;
  saved: () => void;
}) {
  const { t, report } = useApp();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/company", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      toast.success(t("saved"));
      saved();
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      method="post"
      className="panel profile-form"
      key={company?.id ?? "new"}
      onSubmit={submit}
    >
      <div className="profile-identity">
        <span className="company-avatar">
          <Building2 />
        </span>
        <div>
          <h2>{company?.name ?? t("company")}</h2>
          <p className="neutral-status">{t("unverified")}</p>
        </div>
      </div>
      <div className="form-grid">
        <label>
          {t("companyName")}
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={company?.name}
          />
        </label>
        <label>
          {t("contact")}
          <input
            name="contact_email"
            type="email"
            required
            defaultValue={company?.contact_email}
          />
        </label>
        <label>
          {t("city")}
          <input
            name="city"
            required
            maxLength={80}
            defaultValue={company?.city}
          />
        </label>
        <label>
          {t("district")}
          <DistrictSelect required value={company?.district} />
        </label>
        <label className="full-row">
          {t("description")}
          <textarea
            name="description"
            rows={4}
            maxLength={2000}
            defaultValue={company?.description}
          />
        </label>
      </div>
      <div className="form-footer">
        <p className="muted small-text">{t("companyBody")}</p>
        <button className="button" disabled={busy}>
          {t(busy ? "loading" : "save")}
          <Check size={17} />
        </button>
      </div>
    </form>
  );
}
export function Applications() {
  const now = useNow();
  const { t, profile, date, time, report } = useApp();
  const result = useData<Application[]>(
    profile?.role === "WORKER" ? "/api/me/applications" : null,
  );
  const [busy, setBusy] = useState("");
  async function withdraw(id: string) {
    setBusy(id);
    try {
      await api(`/api/applications/${id}/withdraw`, { method: "POST" });
      result.reload();
      toast.success(t("saved"));
    } catch (e) {
      report(e);
    } finally {
      setBusy("");
    }
  }
  return (
    <Protected>
      <div className="container page">
        <PageHeading
          eyebrow={t("profile")}
          title={t("applications")}
          body={t("applicationsBody")}
          action={
            <Link href="/jobs" className="button">
              {t("find")}
              <ArrowRight size={17} />
            </Link>
          }
        />
        {result.loading ? (
          <Loading />
        ) : result.error ? (
          <Failure retry={result.reload} />
        ) : result.data?.length ? (
          <div className="application-list">
            {result.data.map((a) => (
              <article className="panel application-card" key={a.id}>
                <span className="company-avatar">{a.job.company.name[0]}</span>
                <div className="application-info">
                  <Link href={`/jobs/${a.job_id}`}>
                    <h2>{a.job.title}</h2>
                  </Link>
                  <p className="muted">{a.job.company.name}</p>
                  <div className="inline-facts">
                    <span>
                      <CalendarDays size={15} />
                      {date(a.job.shift_start_at)}
                    </span>
                    <span>
                      <Clock3 size={15} />
                      {time(a.job.shift_start_at)}
                    </span>
                    <span>
                      <MapPin size={15} />
                      {a.job.city}
                    </span>
                  </div>
                </div>
                <div className="application-actions">
                  <Status value={a.status} />
                  {a.status === "PENDING" &&
                    Date.parse(a.job.application_cutoff_at) > now && (
                      <button
                        className="text-button danger-text"
                        onClick={() => withdraw(a.id)}
                        disabled={busy === a.id}
                      >
                        {t(busy === a.id ? "loading" : "withdraw")}
                      </button>
                    )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty title={t("noApplications")}>
            <Link href="/jobs" className="button">
              {t("browse")}
              <ArrowRight size={17} />
            </Link>
          </Empty>
        )}
      </div>
    </Protected>
  );
}
