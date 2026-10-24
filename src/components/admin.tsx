"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Moon,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, useApp } from "./provider";
import { Logo, useData } from "./ui";
import { browserDb } from "@/lib/supabase/client";
import {
  adminCsv,
  adminSections,
  matchesAdminSearch,
  type AdminApplication,
  type AdminCompany,
  type AdminJob,
  type AdminSection,
  type AdminSnapshot,
  type AdminUser,
} from "@/lib/admin";
import "./admin.css";

const navigation = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "users", label: "Users", icon: Users },
  { key: "companies", label: "Companies", icon: Building2 },
  { key: "jobs", label: "Job listings", icon: BriefcaseBusiness },
  { key: "applications", label: "Applications", icon: ClipboardList },
  { key: "activity", label: "Activity log", icon: Activity },
] as const;
const sectionCopy: Record<AdminSection, [string, string]> = {
  overview: ["Platform overview", "A little oversight. A lot of opportunity."],
  users: ["Your community", "The people making flexible work happen."],
  companies: [
    "Company directory",
    "Build a trusted network of local employers.",
  ],
  jobs: [
    "Job listings",
    "Keep every opportunity clear, current, and credible.",
  ],
  applications: [
    "Applications",
    "Follow the journey from application to opportunity.",
  ],
  activity: [
    "Activity log",
    "A clear record of every administrative decision.",
  ],
};
const statusLabel = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (s) => s.toUpperCase());
const number = (n: number) => new Intl.NumberFormat("en-LK").format(n);
const date = (value: string, full = false) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo",
    day: "numeric",
    month: "short",
    ...(full ? { year: "numeric" as const } : {}),
  }).format(new Date(value));
const stamp = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("") || "FR";
const hrefFor = (key: AdminSection) =>
  key === "overview" ? "/admin" : `/admin/${key}`;
type Detail =
  | { kind: "company"; item: AdminCompany }
  | { kind: "job"; item: AdminJob }
  | { kind: "user"; item: AdminUser }
  | { kind: "application"; item: AdminApplication };

export function AdminDashboard() {
  const { profile, authLoading, theme, toggleTheme, refreshProfile } = useApp();
  const path = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const key = path === "/admin" ? "overview" : path.split("/")[2];
  const section =
    adminSections.includes(key as AdminSection) &&
    path === hrefFor(key as AdminSection)
      ? (key as AdminSection)
      : null;
  const [days, setDays] = useState("30");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(params.get("filter") ?? "ALL");
  const [menuOpen, setMenuOpen] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const snapshot = useData<AdminSnapshot>(
    profile?.role === "ADMIN" ? `/api/admin?days=${days}` : null,
  );
  const data = snapshot.data;
  function navigate(key: AdminSection, status = "ALL") {
    setFilter(status);
    setQuery("");
    setMenuOpen(false);
    router.push(
      hrefFor(key) +
        (status === "ALL" ? "" : `?filter=${encodeURIComponent(status)}`),
    );
  }
  async function logout() {
    await browserDb().auth.signOut();
    await refreshProfile();
    router.push("/login");
  }
  if (authLoading)
    return (
      <div className="admin-gate">
        <ShieldCheck size={36} />
        <h1>Opening your workspace…</h1>
      </div>
    );
  if (!profile || profile.role !== "ADMIN")
    return (
      <main className="admin-gate">
        <Logo />
        <div className="admin-gate-icon">
          <ShieldCheck size={30} />
        </div>
        <span className="ad-eyebrow">FLEXIROVA ADMINISTRATION</span>
        <h1>
          {profile ? "Admin access required" : "Your admin workspace awaits."}
        </h1>
        <p>
          {profile
            ? "This account does not have permission to view platform records. Sign in with a provisioned administrator account."
            : "Sign in with your administrator account to manage the FlexiRova community."}
        </p>
        {profile ? (
          <button className="ad-button primary" onClick={logout}>
            Switch account <ArrowRight size={16} />
          </button>
        ) : (
          <Link className="ad-button primary" href="/login?next=/admin">
            Admin sign in <ArrowRight size={16} />
          </Link>
        )}
        <Link className="ad-text-button" href="/">
          <ArrowLeft size={15} /> Back to FlexiRova
        </Link>
      </main>
    );

  const users =
    data?.users.filter(
      (u) =>
        matchesAdminSearch(query, u.display_name, u.city, u.district, u.role) &&
        (filter === "ALL" || u.role === filter),
    ) ?? [];
  const companies =
    data?.companies.filter(
      (c) =>
        matchesAdminSearch(
          query,
          c.name,
          c.city,
          c.owner_name,
          c.verification_status,
        ) &&
        (filter === "ALL" ||
          (filter === "REVIEW"
            ? c.verification_status !== "VERIFIED"
            : c.verification_status === filter)),
    ) ?? [];
  const jobs =
    data?.jobs.filter(
      (j) =>
        matchesAdminSearch(query, j.title, j.company_name, j.city, j.status) &&
        (filter === "ALL" || j.status === filter),
    ) ?? [];
  const applications =
    data?.applications.filter(
      (a) =>
        matchesAdminSearch(
          query,
          a.worker_name,
          a.job_title,
          a.company_name,
          a.status,
        ) &&
        (filter === "ALL" || a.status === filter),
    ) ?? [];
  const activities =
    data?.activity.filter((a) =>
      matchesAdminSearch(query, a.actor_name, a.target_name, a.action, a.note),
    ) ?? [];
  const review =
    data?.companies.filter((c) => c.verification_status !== "VERIFIED") ?? [];
  const searchMode = section === "overview" && query.trim().length > 0;
  const current = section
    ? sectionCopy[section]
    : ["Page not found", "Choose a section from your workspace."];
  function exportCsv() {
    if (!data) return;
    let rows: (string | number)[][];
    if (section === "users")
      rows = [
        ["Name", "Role", "City", "District", "Joined"],
        ...users.map((u) => [
          u.display_name,
          u.role,
          u.city,
          u.district,
          u.created_at,
        ]),
      ];
    else if (section === "companies")
      rows = [
        ["Company", "Owner", "City", "Status"],
        ...companies.map((c) => [
          c.name,
          c.owner_name,
          c.city,
          c.verification_status,
        ]),
      ];
    else if (section === "jobs")
      rows = [
        [
          "Job",
          "Company",
          "City",
          "Daily wage LKR",
          "Status",
          "Approved",
          "Capacity",
        ],
        ...jobs.map((j) => [
          j.title,
          j.company_name,
          j.city,
          j.daily_wage_lkr,
          j.status,
          j.approved_count,
          j.required_workers,
        ]),
      ];
    else if (section === "applications")
      rows = [
        ["Worker", "Job", "Company", "Status", "Applied"],
        ...applications.map((a) => [
          a.worker_name,
          a.job_title,
          a.company_name,
          a.status,
          a.applied_at,
        ]),
      ];
    else if (section === "activity")
      rows = [
        ["Actor", "Action", "Record", "Before", "After", "Note", "Time"],
        ...activities.map((a) => [
          a.actor_name,
          a.action,
          a.target_name,
          a.previous_status,
          a.next_status,
          a.note,
          a.created_at,
        ]),
      ];
    else if (searchMode)
      rows = [
        ["Type", "Name", "Status"],
        ...users.map((u) => ["User", u.display_name, u.role]),
        ...companies.map((c) => ["Company", c.name, c.verification_status]),
        ...jobs.map((j) => ["Job", j.title, j.status]),
        ...applications.map((a) => ["Application", a.worker_name, a.status]),
      ];
    else
      rows = [
        ["Metric", "Value", "Scope"],
        ...Object.entries(data.totals).map(([k, v]) => [
          k,
          v,
          `Snapshot ${data.generated_at}; new/period metrics: last ${days} days`,
        ]),
      ];
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", adminCsv(rows)], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `flexirova-${section}-${data.generated_at.slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Report exported", {
      description: "Includes the current filters and search.",
    });
  }
  return (
    <div className="admin-app">
      <a href="#admin-main" className="skip-link">
        Skip to dashboard
      </a>
      {menuOpen && (
        <button
          className="ad-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`ad-sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="ad-brand">
          <Logo />
          <button
            className="ad-icon ad-mobile-close"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="ad-workspace-label">
          <span className="ad-workspace-icon">
            <ShieldCheck size={17} />
          </span>
          <div>
            Admin workspace<small>Platform management</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <p className="ad-nav-label">WORKSPACE</p>
        <nav aria-label="Admin navigation">
          {navigation.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={hrefFor(key)}
              aria-current={section === key ? "page" : undefined}
              className={section === key ? "active" : ""}
              onClick={() => {
                setMenuOpen(false);
                setFilter("ALL");
                setQuery("");
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
              {key === "companies" && !!data?.totals.unverified_companies && (
                <b>{data.totals.unverified_companies}</b>
              )}
            </Link>
          ))}
        </nav>
        <div className="ad-sidebar-foot">
          {process.env.NEXT_PUBLIC_LOCAL_DEMO === "true" && (
            <div className="ad-demo">
              <span />
              <strong>Local demonstration</strong>
              <p>Fictional people. Real workflows.</p>
            </div>
          )}
          <Link className="ad-marketplace" href="/">
            Visit marketplace <ExternalLink size={15} />
          </Link>
          <div className="ad-account">
            <span className="ad-avatar red">
              {initials(profile.display_name)}
            </span>
            <div>
              <strong>{profile.display_name}</strong>
              <small>Administrator</small>
            </div>
            <button
              className="ad-icon"
              aria-label="Sign out"
              title="Sign out"
              onClick={logout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="ad-body">
        <header className="ad-topbar">
          <button
            className="ad-icon ad-mobile-menu"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={21} />
          </button>
          <div className="ad-breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>
              {navigation.find((n) => n.key === section)?.label ?? "Not found"}
            </strong>
          </div>
          <label className="ad-global-search">
            <Search size={17} />
            <input
              aria-label="Search admin records"
              placeholder={
                section === "overview"
                  ? "Search the workspace…"
                  : `Search ${navigation.find((n) => n.key === section)?.label.toLowerCase() ?? "records"}…`
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                aria-label="Clear search"
                className="ad-icon"
                onClick={() => setQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </label>
          <div className="ad-topbar-actions">
            <button
              className="ad-icon"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "Use light theme" : "Use dark theme"
              }
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="ad-icon ad-notification"
              aria-label={`Review ${data?.totals.unverified_companies ?? 0} companies`}
              onClick={() => navigate("companies", "REVIEW")}
            >
              <Bell size={19} />
              {!!data?.totals.unverified_companies && <i />}
            </button>
            <span className="ad-topbar-divider" />
            <span className="ad-avatar red" title={profile.display_name}>
              {initials(profile.display_name)}
            </span>
          </div>
        </header>
        <main id="admin-main" className="ad-main">
          <div className="ad-heading">
            <div>
              <p className="ad-eyebrow">
                <span /> THE FLEXIROVA WORKSPACE
              </p>
              <h1>{searchMode ? "Search results" : current[0]}</h1>
              <p>
                {searchMode
                  ? `Matching records for “${query}” across your workspace.`
                  : current[1]}
              </p>
            </div>
            <div className="ad-heading-actions">
              <label className="ad-period">
                <CalendarDays size={16} />
                <select
                  aria-label="Reporting period"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                </select>
                <ChevronDown size={14} />
              </label>
              <button
                className="ad-button"
                onClick={exportCsv}
                disabled={!data || snapshot.loading}
              >
                <ArrowDownToLine size={16} /> Export report
              </button>
            </div>
          </div>
          {snapshot.error ? (
            <div className="ad-state" role="alert">
              <ShieldCheck size={30} />
              <h2>We couldn’t load your workspace.</h2>
              <p>
                Check the database connection and your administrator access,
                then try again.
              </p>
              <button className="ad-button primary" onClick={snapshot.reload}>
                <RefreshCw size={16} /> Try again
              </button>
            </div>
          ) : snapshot.loading || !data ? (
            <div
              className="ad-skeleton"
              role="status"
              aria-label="Loading dashboard"
            >
              <div />
              <div />
              <div />
              <div />
              <section />
              <section />
              <span className="sr-only">Loading platform records…</span>
            </div>
          ) : (
            <>
              {section === "overview" && !searchMode && (
                <>
                  <div className="ad-metrics">
                    {[
                      {
                        label: "Total workers",
                        value: data.totals.workers,
                        detail: `${number(data.totals.new_workers)} joined in ${days} days`,
                        icon: Users,
                        tone: "red",
                        target: "users" as const,
                        status: "WORKER",
                      },
                      {
                        label: "Registered employers",
                        value: data.totals.employers,
                        detail: `${number(data.totals.new_employers)} joined in ${days} days`,
                        icon: Building2,
                        tone: "blue",
                        target: "users" as const,
                        status: "EMPLOYER",
                      },
                      {
                        label: "Open opportunities",
                        value: data.totals.active_jobs,
                        detail: `Across ${number(data.totals.jobs)} total job listings`,
                        icon: BriefcaseBusiness,
                        tone: "amber",
                        target: "jobs" as const,
                        status: "ALL",
                      },
                      {
                        label: "Total applications",
                        value: data.totals.applications,
                        detail: `${number(data.totals.period_applications)} received in ${days} days`,
                        icon: ClipboardList,
                        tone: "green",
                        target: "applications" as const,
                        status: "ALL",
                      },
                    ].map((m) => (
                      <button
                        key={m.label}
                        className={`ad-metric ${m.tone}`}
                        onClick={() => navigate(m.target, m.status)}
                      >
                        <div className="ad-metric-top">
                          <span>{m.label}</span>
                          <span className={`ad-metric-icon ${m.tone}`}>
                            <m.icon size={19} />
                          </span>
                        </div>
                        <strong>{number(m.value)}</strong>
                        <div className="ad-metric-bottom">
                          <span>{m.detail}</span>
                          <ArrowUpRight size={16} />
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="ad-charts">
                    <RegistrationChart data={data} />
                    <ApplicationChart
                      data={data}
                      onView={() => navigate("applications")}
                    />
                  </div>
                  <div className="ad-lower-grid">
                    <section className="ad-card ad-recent-jobs">
                      <PanelTitle
                        title="Recent job listings"
                        subtitle="The latest opportunities on FlexiRova."
                        action={
                          <button
                            className="ad-text-button"
                            onClick={() => navigate("jobs")}
                          >
                            View all <ArrowRight size={15} />
                          </button>
                        }
                      />
                      <JobTable
                        jobs={data.jobs.slice(0, 5)}
                        select={(item) => setDetail({ kind: "job", item })}
                        compact
                      />
                      <div className="ad-card-foot">
                        <span>
                          <span className="ad-live-dot" />{" "}
                          {number(data.totals.active_jobs)} open opportunities
                          right now
                        </span>
                        <span>All wages in LKR</span>
                      </div>
                    </section>
                    <section className="ad-card ad-review">
                      <PanelTitle
                        title="Needs your attention"
                        subtitle="A trusted community starts here."
                      />
                      <div className="ad-review-summary">
                        <span className="ad-metric-icon amber">
                          <ShieldCheck size={21} />
                        </span>
                        <div>
                          <strong>
                            {number(data.totals.unverified_companies)} companies
                          </strong>
                          <p>Awaiting your verification</p>
                        </div>
                        <span className="ad-small-count">
                          {number(data.totals.unverified_companies)}
                        </span>
                      </div>
                      <div className="ad-review-list">
                        {review.slice(0, 3).map((c) => (
                          <button
                            key={c.id}
                            onClick={() =>
                              setDetail({ kind: "company", item: c })
                            }
                          >
                            <span className="ad-avatar neutral">
                              <Building2 size={18} />
                            </span>
                            <div>
                              <strong>{c.name.replace(" (Demo)", "")}</strong>
                              <small>
                                <MapPin size={11} /> {c.city}
                              </small>
                            </div>
                            <ChevronRight size={16} />
                          </button>
                        ))}
                        {!review.length && (
                          <div className="ad-all-clear">
                            <CheckCheck size={27} />
                            <strong>You’re all caught up.</strong>
                            <p>No companies awaiting verification.</p>
                          </div>
                        )}
                      </div>
                      <button
                        className="ad-button ad-review-button"
                        onClick={() => navigate("companies", "REVIEW")}
                      >
                        Review companies <ArrowRight size={16} />
                      </button>
                      <p className="ad-review-note">
                        <ShieldCheck size={13} /> Every decision leaves an audit
                        trail.
                      </p>
                    </section>
                  </div>
                </>
              )}
              {(section !== "overview" || searchMode) && section && (
                <>
                  {!searchMode && section !== "activity" && (
                    <div className="ad-table-toolbar">
                      <div className="ad-tabs" aria-label="Filter records">
                        {(section === "users"
                          ? [
                              ["ALL", "All users"],
                              ["WORKER", "Workers"],
                              ["EMPLOYER", "Employers"],
                              ["ADMIN", "Admins"],
                            ]
                          : section === "companies"
                            ? [
                                ["ALL", "All companies"],
                                ["REVIEW", "Needs review"],
                                ["VERIFIED", "Verified"],
                              ]
                            : section === "jobs"
                              ? [
                                  ["ALL", "All listings"],
                                  ["PUBLISHED", "Published"],
                                  ["DRAFT", "Drafts"],
                                  ["CLOSED", "Closed"],
                                  ["COMPLETED", "Completed"],
                                ]
                              : [
                                  ["ALL", "All applications"],
                                  ["PENDING", "Pending"],
                                  ["APPROVED", "Approved"],
                                  ["REJECTED", "Rejected"],
                                  ["WITHDRAWN", "Withdrawn"],
                                ]
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            onClick={() => setFilter(value)}
                            aria-pressed={filter === value}
                            className={filter === value ? "selected" : ""}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {(section === "users" || searchMode) && (
                    <RecordPanel
                      title="Users"
                      subtitle="Member profiles · roles are provisioned securely."
                      count={users.length}
                    >
                      <UserTable
                        users={users}
                        select={(item) => setDetail({ kind: "user", item })}
                      />
                    </RecordPanel>
                  )}
                  {(section === "companies" || searchMode) && (
                    <RecordPanel
                      title="Companies"
                      subtitle="Review business details before recording a verification decision."
                      count={companies.length}
                    >
                      <CompanyTable
                        companies={companies}
                        select={(item) => setDetail({ kind: "company", item })}
                      />
                    </RecordPanel>
                  )}
                  {(section === "jobs" || searchMode) && (
                    <RecordPanel
                      title="Job listings"
                      subtitle="Published is the listing status; applications also depend on deadline and capacity."
                      count={jobs.length}
                    >
                      <JobTable
                        jobs={jobs}
                        select={(item) => setDetail({ kind: "job", item })}
                      />
                    </RecordPanel>
                  )}
                  {(section === "applications" || searchMode) && (
                    <RecordPanel
                      title="Applications"
                      subtitle="Application decisions are made by the hiring employer."
                      count={applications.length}
                    >
                      <ApplicationTable
                        applications={applications}
                        select={(item) =>
                          setDetail({ kind: "application", item })
                        }
                      />
                    </RecordPanel>
                  )}
                  {section === "activity" && (
                    <section className="ad-card">
                      <PanelTitle
                        title="Administrative activity"
                        subtitle="Latest 200 decisions · times shown in Sri Lanka Standard Time."
                      />
                      {activities.length ? (
                        <div className="ad-audit-list">
                          {activities.map((a) => (
                            <article key={a.id}>
                              <span
                                className={`ad-audit-icon ${a.action === "CLOSE_JOB" ? "amber" : "green"}`}
                              >
                                {a.action === "CLOSE_JOB" ? (
                                  <BriefcaseBusiness size={18} />
                                ) : (
                                  <ShieldCheck size={18} />
                                )}
                              </span>
                              <div>
                                <h3>
                                  {statusLabel(a.action)}{" "}
                                  <span>· {a.target_name}</span>
                                </h3>
                                <p>{a.note}</p>
                                <small>
                                  {a.actor_name} <span>·</span>{" "}
                                  {statusLabel(a.previous_status)}{" "}
                                  <ArrowRight size={11} />{" "}
                                  {statusLabel(a.next_status)}
                                </small>
                              </div>
                              <time dateTime={a.created_at}>
                                {stamp(a.created_at)}
                              </time>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <NoRecords
                          title={
                            query ? "No matching activity" : "A fresh start."
                          }
                          body={
                            query
                              ? "Try a different search."
                              : "Company reviews and job closures will appear here, with the administrator and reason."
                          }
                        />
                      )}
                    </section>
                  )}
                </>
              )}
              {!section && (
                <div className="ad-state">
                  <h2>That admin page doesn’t exist.</h2>
                  <Link href="/admin" className="ad-button primary">
                    Return to overview
                  </Link>
                </div>
              )}
              <footer className="ad-footer">
                <span>
                  © {new Date(data.generated_at).getFullYear()} FlexiRova{" "}
                  <span>·</span> Better work, closer to home.
                </span>
                <button className="ad-text-button" onClick={snapshot.reload}>
                  <RefreshCw size={12} /> Updated {stamp(data.generated_at)} ·
                  Refresh
                </button>
              </footer>
            </>
          )}
        </main>
      </div>
      {detail && (
        <DetailDialog
          detail={detail}
          close={() => setDetail(null)}
          onSaved={() => {
            setDetail(null);
            snapshot.reload();
          }}
        />
      )}
    </div>
  );
}

function PanelTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="ad-panel-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
function Badge({ value }: { value: string }) {
  return (
    <span className={`ad-badge ${value.toLowerCase()}`}>
      <i />
      {statusLabel(value)}
    </span>
  );
}
function NoRecords({
  title = "No records found",
  body = "Try changing your search or filters.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="ad-no-records">
      <Search size={25} />
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
function RecordPanel({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="ad-card ad-record-panel">
      <PanelTitle
        title={title}
        subtitle={subtitle}
        action={
          <span className="ad-record-count">{number(count)} records</span>
        }
      />
      {children}
      <div className="ad-card-foot">
        Showing {number(count)} matching records from the latest 200. Overview
        metrics count all records.
      </div>
    </section>
  );
}
function TableWrap({
  children,
  empty,
}: {
  children: ReactNode;
  empty: boolean;
}) {
  return empty ? (
    <NoRecords />
  ) : (
    <div className="ad-table-scroll">{children}</div>
  );
}
function UserTable({
  users,
  select,
}: {
  users: AdminUser[];
  select: (u: AdminUser) => void;
}) {
  return (
    <TableWrap empty={!users.length}>
      <table className="ad-table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Role</th>
            <th>Location</th>
            <th>Joined</th>
            <th>
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                <button className="ad-person" onClick={() => select(u)}>
                  <span className="ad-avatar neutral">
                    {initials(u.display_name)}
                  </span>
                  <span>
                    <strong>{u.display_name || "Unnamed member"}</strong>
                    <small>
                      {u.skills.slice(0, 2).join(" · ") || "No skills added"}
                    </small>
                  </span>
                </button>
              </td>
              <td>
                <Badge value={u.role} />
              </td>
              <td>{u.city || "Not provided"}</td>
              <td>{date(u.created_at, true)}</td>
              <td>
                <button
                  className="ad-row-button"
                  onClick={() => select(u)}
                  aria-label={`View ${u.display_name}`}
                >
                  View <ArrowUpRight size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}
function CompanyTable({
  companies,
  select,
}: {
  companies: AdminCompany[];
  select: (c: AdminCompany) => void;
}) {
  return (
    <TableWrap empty={!companies.length}>
      <table className="ad-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Owner</th>
            <th>Location</th>
            <th>Verification</th>
            <th>
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id}>
              <td>
                <button className="ad-person" onClick={() => select(c)}>
                  <span className="ad-avatar neutral">
                    <Building2 size={19} />
                  </span>
                  <span>
                    <strong>{c.name}</strong>
                    <small>{c.contact_email}</small>
                  </span>
                </button>
              </td>
              <td>{c.owner_name}</td>
              <td>{c.city}</td>
              <td>
                <Badge value={c.verification_status} />
              </td>
              <td>
                <button className="ad-row-button" onClick={() => select(c)}>
                  Review <ArrowUpRight size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}
function JobTable({
  jobs,
  select,
  compact = false,
}: {
  jobs: AdminJob[];
  select: (j: AdminJob) => void;
  compact?: boolean;
}) {
  return (
    <TableWrap empty={!jobs.length}>
      <table className="ad-table">
        <thead>
          <tr>
            <th>Job / Company</th>
            {!compact && <th>Location</th>}
            <th>Daily wage</th>
            <th>Filled</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id}>
              <td>
                <button className="ad-person" onClick={() => select(j)}>
                  <span className={`ad-job-icon ${j.category}`}>
                    <BriefcaseBusiness size={17} />
                  </span>
                  <span>
                    <strong>{j.title}</strong>
                    <small>{j.company_name.replace(" (Demo)", "")}</small>
                  </span>
                </button>
              </td>
              {!compact && <td>{j.city}</td>}
              <td className="ad-wage">
                <span>LKR</span> {number(Number(j.daily_wage_lkr))}
              </td>
              <td>
                <span className="ad-capacity">
                  {j.approved_count}
                  <span> / {j.required_workers}</span>
                </span>
              </td>
              <td>
                <Badge value={j.status} />
              </td>
              <td>
                <button
                  className="ad-icon"
                  onClick={() => select(j)}
                  aria-label={`Review ${j.title}`}
                >
                  <ArrowUpRight size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}
function ApplicationTable({
  applications,
  select,
}: {
  applications: AdminApplication[];
  select: (a: AdminApplication) => void;
}) {
  return (
    <TableWrap empty={!applications.length}>
      <table className="ad-table">
        <thead>
          <tr>
            <th>Applicant</th>
            <th>Opportunity</th>
            <th>Status</th>
            <th>Applied</th>
            <th>
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {applications.map((a) => (
            <tr key={a.id}>
              <td>
                <button className="ad-person" onClick={() => select(a)}>
                  <span className="ad-avatar neutral">
                    {initials(a.worker_name)}
                  </span>
                  <strong>{a.worker_name}</strong>
                </button>
              </td>
              <td>
                <strong>{a.job_title}</strong>
                <small>{a.company_name}</small>
              </td>
              <td>
                <Badge value={a.status} />
              </td>
              <td>{date(a.applied_at, true)}</td>
              <td>
                <button className="ad-row-button" onClick={() => select(a)}>
                  View <ArrowUpRight size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}

function RegistrationChart({ data }: { data: AdminSnapshot }) {
  const [metric, setMetric] = useState("registrations");
  const [showData, setShowData] = useState(false);
  const applications = metric === "applications";
  const peak = Math.max(
    1,
    ...data.trend.map((d) =>
      applications ? d.applications : d.workers + d.employers,
    ),
  );
  const step = Math.max(1, Math.ceil(peak / 4));
  const max = step * 4;
  const total = data.trend.reduce(
    (sum, d) => sum + (applications ? d.applications : d.workers + d.employers),
    0,
  );
  return (
    <section className="ad-card ad-growth">
      <PanelTitle
        title="Community growth"
        subtitle="Small beginnings. More possibilities."
        action={
          <label className="ad-chart-select">
            <select
              value={metric}
              aria-label="Chart metric"
              onChange={(e) => setMetric(e.target.value)}
            >
              <option value="registrations">Registrations</option>
              <option value="applications">Applications</option>
            </select>
            <ChevronDown size={13} />
          </label>
        }
      />
      <div className="ad-chart-summary">
        <strong>{number(total)}</strong>
        <span>
          {applications ? "applications received" : "new members"} in{" "}
          {data.period_days} days
        </span>
        <div className="ad-legend">
          <span>
            <i className="red" />
            {applications ? "Applications" : "Workers"}
          </span>
          {!applications && (
            <span>
              <i className="slate" />
              Employers
            </span>
          )}
        </div>
      </div>
      <div
        className="ad-bar-chart"
        role="img"
        aria-label={`${total} ${applications ? "applications" : "registrations"} in the last ${data.period_days} days. Use View chart data for daily values.`}
      >
        <div className="ad-y-axis">
          {[4, 3, 2, 1, 0].map((i) => (
            <span key={i}>{number(step * i)}</span>
          ))}
        </div>
        <div className="ad-plot">
          <div className="ad-gridlines">
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} />
            ))}
          </div>
          <div className="ad-bars">
            {data.trend.map((d) => (
              <div
                key={d.day}
                className="ad-bar-column"
                title={`${date(`${d.day}T12:00:00+05:30`)}: ${d.workers} workers, ${d.employers} employers, ${d.applications} applications`}
              >
                <span
                  className="ad-bar-slate"
                  style={{
                    height: `${applications ? 0 : (d.employers / max) * 100}%`,
                  }}
                />
                <span
                  className="ad-bar-red"
                  style={{
                    height: `${((applications ? d.applications : d.workers) / max) * 100}%`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ad-x-axis">
        {[
          0,
          Math.floor((data.trend.length - 1) / 2),
          data.trend.length - 1,
        ].map((i) => (
          <span key={i}>{date(`${data.trend[i].day}T12:00:00+05:30`)}</span>
        ))}
      </div>
      <div className="ad-chart-foot">
        <span>Daily activity · Sri Lanka time</span>
        <button
          className="ad-text-button"
          onClick={() => setShowData(!showData)}
          aria-expanded={showData}
        >
          {showData ? "Hide chart data" : "View chart data"}{" "}
          <ChevronDown size={12} />
        </button>
      </div>
      {showData && (
        <div className="ad-chart-data">
          <table className="ad-table">
            <caption>Daily registrations and applications</caption>
            <thead>
              <tr>
                <th>Date</th>
                <th>Workers</th>
                <th>Employers</th>
                <th>Applications</th>
              </tr>
            </thead>
            <tbody>
              {data.trend.map((d) => (
                <tr key={d.day}>
                  <td>{d.day}</td>
                  <td>{d.workers}</td>
                  <td>{d.employers}</td>
                  <td>{d.applications}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
function ApplicationChart({
  data,
  onView,
}: {
  data: AdminSnapshot;
  onView: () => void;
}) {
  const entries = [
    ["APPROVED", "Approved", "#2c9b77"],
    ["PENDING", "Pending", "#e5aa4e"],
    ["REJECTED", "Rejected", "#df594f"],
    ["WITHDRAWN", "Withdrawn", "#8b97aa"],
  ];
  const total = Object.values(data.application_statuses).reduce(
    (a, b) => a + b,
    0,
  );
  let offset = 0;
  const gradient = entries
    .map(([key, , color]) => {
      const start = offset;
      offset += total ? (data.application_statuses[key] / total) * 100 : 0;
      return `${color} ${start}% ${offset}%`;
    })
    .join(",");
  return (
    <section className="ad-card ad-applications-chart">
      <PanelTitle
        title="Application snapshot"
        subtitle={`Every application is a new possibility · ${data.period_days} days`}
        action={
          <button
            className="ad-icon"
            onClick={onView}
            aria-label="View all applications"
          >
            <ArrowUpRight size={18} />
          </button>
        }
      />
      <div className="ad-donut-wrap">
        <div
          className="ad-donut"
          role="img"
          aria-label={`${total} applications: ${entries.map(([key, label]) => `${data.application_statuses[key]} ${label.toLowerCase()}`).join(", ")}`}
          style={{
            background: total
              ? `conic-gradient(${gradient})`
              : "var(--ad-border)",
          }}
        >
          <div>
            <strong>{number(total)}</strong>
            <span>Total applications</span>
          </div>
        </div>
      </div>
      <div className="ad-donut-legend">
        {entries.map(([key, label, color]) => (
          <div key={key}>
            <i style={{ background: color }} />
            <span>{label}</span>
            <strong>{number(data.application_statuses[key])}</strong>
            <small>
              {total
                ? Math.round((data.application_statuses[key] / total) * 100)
                : 0}
              %
            </small>
          </div>
        ))}
      </div>
      <button className="ad-chart-foot ad-text-button" onClick={onView}>
        Explore applications <ArrowRight size={14} />
      </button>
    </section>
  );
}

function DetailDialog({
  detail,
  close,
  onSaved,
}: {
  detail: Detail;
  close: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  const item = detail.item;
  const title =
    detail.kind === "company"
      ? detail.item.name
      : detail.kind === "job"
        ? detail.item.title
        : detail.kind === "user"
          ? detail.item.display_name
          : detail.item.worker_name;
  const action =
    detail.kind === "company"
      ? detail.item.verification_status === "VERIFIED"
        ? "UNVERIFY_COMPANY"
        : "VERIFY_COMPANY"
      : detail.kind === "job" && detail.item.status === "PUBLISHED"
        ? "CLOSE_JOB"
        : null;
  const label =
    action === "VERIFY_COMPANY"
      ? "Verify company"
      : action === "UNVERIFY_COMPANY"
        ? "Remove verification"
        : "Close listing";
  async function moderate() {
    setBusy(true);
    setError("");
    try {
      await api("/api/admin", {
        method: "POST",
        body: JSON.stringify({
          id: item.id,
          action,
          expectedStatus:
            detail.kind === "company"
              ? detail.item.verification_status
              : detail.kind === "job"
                ? detail.item.status
                : "",
          note,
        }),
      });
      toast.success(
        action === "VERIFY_COMPANY"
          ? "Company verified"
          : action === "UNVERIFY_COMPANY"
            ? "Verification removed"
            : "Listing closed",
        { description: "Your decision has been saved to the activity log." },
      );
      onSaved();
    } catch (e) {
      setError(
        e instanceof Error && e.message === "STATE_CHANGED"
          ? "This record has changed since you opened it. Close this panel, refresh the workspace, and review the latest state."
          : "The decision could not be saved. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      className="ad-detail-dialog"
      ref={dialog}
      aria-labelledby="admin-detail-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) close();
      }}
    >
      <div className="ad-detail-content">
        <header>
          <span className="ad-eyebrow">
            {detail.kind === "company"
              ? "COMPANY REVIEW"
              : detail.kind === "job"
                ? "LISTING DETAILS"
                : detail.kind === "user"
                  ? "MEMBER PROFILE"
                  : "APPLICATION DETAILS"}
          </span>
          <button
            className="ad-icon"
            aria-label="Close details"
            disabled={busy}
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        <span className="ad-detail-avatar">
          <span>
            {detail.kind === "company" ? (
              <Building2 size={30} />
            ) : detail.kind === "job" ? (
              <BriefcaseBusiness size={30} />
            ) : (
              initials(title)
            )}
          </span>
        </span>
        <h2 id="admin-detail-title">{title}</h2>
        <Badge
          value={
            detail.kind === "company"
              ? detail.item.verification_status
              : detail.kind === "user"
                ? detail.item.role
                : detail.item.status
          }
        />
        {detail.kind === "company" && (
          <>
            <p className="ad-detail-description">
              {detail.item.description || "No business description provided."}
            </p>
            <dl>
              <dt>Business owner</dt>
              <dd>{detail.item.owner_name}</dd>
              <dt>Contact email</dt>
              <dd>{detail.item.contact_email}</dd>
              <dt>Location</dt>
              <dd>
                {detail.item.city}, {detail.item.district}
              </dd>
              <dt>Registered</dt>
              <dd>{date(detail.item.created_at, true)}</dd>
            </dl>
          </>
        )}
        {detail.kind === "job" && (
          <>
            <p className="ad-detail-description">{detail.item.company_name}</p>
            <dl>
              <dt>Location</dt>
              <dd>
                {detail.item.city}, {detail.item.district}
              </dd>
              <dt>Daily wage</dt>
              <dd>LKR {number(Number(detail.item.daily_wage_lkr))}</dd>
              <dt>Shift starts</dt>
              <dd>{stamp(detail.item.shift_start_at)} SLST</dd>
              <dt>Shift ends</dt>
              <dd>{stamp(detail.item.shift_end_at)} SLST</dd>
              <dt>Application deadline</dt>
              <dd>{stamp(detail.item.application_cutoff_at)} SLST</dd>
              <dt>Filled places</dt>
              <dd>
                {detail.item.approved_count} of {detail.item.required_workers}
              </dd>
            </dl>
            <Link className="ad-text-button" href={`/jobs/${detail.item.id}`}>
              Open listing page <ExternalLink size={14} />
            </Link>
          </>
        )}
        {detail.kind === "user" && (
          <>
            <p className="ad-detail-description">
              {detail.item.bio || "No introduction provided."}
            </p>
            <dl>
              <dt>Location</dt>
              <dd>
                {[detail.item.city, detail.item.district]
                  .filter(Boolean)
                  .join(", ") || "Not provided"}
              </dd>
              <dt>Availability</dt>
              <dd>{detail.item.availability || "Not provided"}</dd>
              <dt>Skills</dt>
              <dd>{detail.item.skills.join(", ") || "Not provided"}</dd>
              <dt>Joined</dt>
              <dd>{date(detail.item.created_at, true)}</dd>
            </dl>
            <p className="ad-detail-info">
              <ShieldCheck size={18} /> Account roles are managed by a trusted
              operator. Public registration cannot create administrators.
            </p>
          </>
        )}
        {detail.kind === "application" && (
          <>
            <dl>
              <dt>Opportunity</dt>
              <dd>{detail.item.job_title}</dd>
              <dt>Employer</dt>
              <dd>{detail.item.company_name}</dd>
              <dt>Applied</dt>
              <dd>{stamp(detail.item.applied_at)} SLST</dd>
            </dl>
            <p className="ad-detail-info">
              <ClipboardList size={19} /> Hiring decisions stay with the
              employer. This view provides platform oversight.
            </p>
          </>
        )}
        {action && (
          <form
            className="ad-moderation"
            onSubmit={(e) => {
              e.preventDefault();
              void moderate();
            }}
          >
            <h3>{label}</h3>
            <p>
              {action === "VERIFY_COMPANY"
                ? "Confirm you have reviewed the business details. Verification will be visible to workers."
                : action === "UNVERIFY_COMPANY"
                  ? "The company will return to the review queue. Existing applications are preserved."
                  : "This listing will stop accepting applications. Existing applications are preserved."}
            </p>
            <label htmlFor="admin-review-note">
              Review note <span>Required</span>
            </label>
            <textarea
              id="admin-review-note"
              placeholder="Explain your decision for the audit trail…"
              minLength={10}
              maxLength={500}
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
            />
            <small>
              10–500 characters · Saved with your name and the decision.
            </small>
            {error && (
              <div className="ad-form-error" role="alert">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={busy || note.trim().length < 10}
              className={`ad-button ${action === "VERIFY_COMPANY" ? "primary" : "danger"}`}
            >
              {busy ? (
                <RefreshCw size={16} className="ad-spin" />
              ) : action === "VERIFY_COMPANY" ? (
                <Check size={17} />
              ) : (
                <ShieldCheck size={17} />
              )}
              {busy ? "Saving decision…" : label}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}
