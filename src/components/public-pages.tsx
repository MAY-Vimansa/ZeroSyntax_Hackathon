"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Search,
  Check,
  ShieldCheck,
  Navigation,
  SlidersHorizontal,
  BriefcaseBusiness,
  Users,
  ChevronLeft,
  ChevronRight,
  Info,
  LocateFixed,
  ArrowDown,
} from "lucide-react";
import { useApp } from "./provider";
import { useData, JobCard, Loading, Failure, Empty, PageHeading } from "./ui";
import { categories, districts, type SearchResult } from "@/lib/types";

export function Home() {
  const { t } = useApp();
  const { data, loading, error, reload } =
    useData<SearchResult>("/api/jobs?limit=3");
  const stats = useData<{ jobs: number; districts: number; companies: number }>(
    "/api/stats",
  );
  const first = data?.jobs[0];
  return (
    <>
      <section className="hero">
        <div className="hero-glow" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="red-line" />
              {t("heroEyebrow")}
            </p>
            <h1>
              {t("heroOne")}
              <br />
              <span>{t("heroTwo")}</span>
            </h1>
            <p className="hero-description">{t("heroBody")}</p>
            <div className="hero-buttons">
              <Link className="button" href="/jobs">
                {t("browse")}
                <ArrowUpRight size={20} />
              </Link>
              <Link className="button secondary" href="/for-employers">
                {t("hire")}
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="hero-proof">
              <span>
                <Check size={15} />
                {t("free")}
              </span>
              <span>
                <Check size={15} />
                {t("clearPay")}
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="radar-circle circle-one" />
            <div className="radar-circle circle-two" />
            <div className="radar-circle circle-three" />
            <div className="map-grid" />
            <span className="map-label label-colombo">Colombo</span>
            <span className="map-label label-gampaha">Gampaha</span>
            <span className="map-label label-negombo">Negombo</span>
            <div className="map-center">
              <MapPin size={37} fill="currentColor" strokeWidth={1.4} />
            </div>
            <span className="map-dot dot-one" />
            <span className="map-dot dot-two" />
            <span className="map-dot dot-three" />
            <div className="floating-note">
              <span className="note-icon">
                <Navigation size={19} />
              </span>
              <div>
                <strong>{t("nearTitle")}</strong>
                <small>{t("local")}</small>
              </div>
            </div>
            {first ? (
              <div className="hero-job">
                <span className="hero-job-label">
                  <span className="availability-dot" />
                  {t("demoShort")}
                </span>
                <JobCard job={first} compact />
              </div>
            ) : (
              <div className="hero-placeholder">
                <BriefcaseBusiness size={44} />
                <p>{t("fresh")}</p>
              </div>
            )}
            <span className="visual-caption">
              <MapPin size={12} />
              {t("distanceNote")} · {t("demoShort")}
            </span>
          </div>
        </div>
        <div className="container hero-search">
          <QuickSearch />
        </div>
      </section>
      <div className="container">
        <div className="stats-strip">
          <div>
            <strong>{stats.data?.jobs ?? "—"}</strong>
            <span>{t("openJobs")}</span>
          </div>
          <div>
            <strong>{stats.data?.districts ?? "—"}</strong>
            <span>{t("districts")}</span>
          </div>
          <div>
            <strong>{stats.data?.companies ?? "—"}</strong>
            <span>{t("companiesCount")}</span>
          </div>
          <div className="stats-promise">
            <ShieldCheck size={25} />
            <span>
              {t("free")}
              <small>{t("notGuaranteed")}</small>
            </span>
          </div>
        </div>
        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("fresh")}</p>
              <h2>{t("latest")}</h2>
              <p className="muted">{t("latestBody")}</p>
            </div>
            <Link className="text-link" href="/jobs">
              {t("viewAll")}
              <ArrowRight size={17} />
            </Link>
          </div>
          <p className="demo-disclosure">
            <Info size={14} />
            {t("demo")}
          </p>
          {loading ? (
            <Loading />
          ) : error ? (
            <Failure retry={reload} />
          ) : data?.jobs.length ? (
            <div className="job-grid">
              {data.jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <Empty title={t("noResults")} body={t("noResultsBody")} />
          )}
        </section>
        <section className="section how-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">FLEXIROVA</p>
              <h2>{t("how")}</h2>
            </div>
            <span className="subtle-arrow">
              <ArrowDown />
            </span>
          </div>
          <div className="steps">
            {[
              {
                key: "step1" as const,
                body: "step1Body" as const,
                Icon: Search,
              },
              {
                key: "step2" as const,
                body: "step2Body" as const,
                Icon: BriefcaseBusiness,
              },
              {
                key: "step3" as const,
                body: "step3Body" as const,
                Icon: Check,
              },
            ].map(({ key, body, Icon }, index) => (
              <div className="step" key={key}>
                <div className="step-top">
                  <span className="step-icon">
                    <Icon size={24} />
                  </span>
                  <span className="step-number">0{index + 1}</span>
                </div>
                <h3>{t(key)}</h3>
                <p className="muted">{t(body)}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="employer-banner">
          <div>
            <p className="eyebrow">{t("employers")}</p>
            <h2>{t("employerTitle")}</h2>
            <p>{t("employerBody")}</p>
          </div>
          <Link className="button light-button" href="/for-employers">
            {t("hire")}
            <ArrowUpRight size={19} />
          </Link>
        </section>
      </div>
    </>
  );
}
function QuickSearch() {
  const { t } = useApp();
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const params = new URLSearchParams();
        for (const [k, v] of form) if (v) params.set(k, String(v));
        router.push(`/jobs?${params}`);
      }}
      className="quick-search"
    >
      <label>
        <span>{t("search")}</span>
        <div>
          <Search size={18} />
          <input name="query" placeholder={t("searchPlaceholder")} />
        </div>
      </label>
      <label>
        <span>{t("district")}</span>
        <div>
          <MapPin size={18} />
          <select aria-label={t("district")} name="district">
            <option value="">{t("allDistricts")}</option>
            {districts.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
      </label>
      <button className="button" type="submit">
        {t("search")}
        <ArrowRight size={18} />
      </button>
    </form>
  );
}

export function Jobs({ near = false }: { near?: boolean }) {
  const { t, categoryName, location, enableLocation, locating, clearLocation } =
    useApp();
  const params = useSearchParams();
  const router = useRouter();
  const [filterOpen, setFilterOpen] = useState(false);
  const query = new URLSearchParams(params.toString());
  if (near && location) {
    query.set("lat", String(location.lat));
    query.set("lng", String(location.lng));
    query.set("radiusKm", params.get("radiusKm") ?? "10");
  }
  const ready =
    !near || !!location || !!params.get("district") || !!params.get("city");
  const { data, loading, error, reload } = useData<SearchResult>(
    ready ? `/api/jobs?${query}` : null,
  );
  const page = Number(params.get("page") ?? 1);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = new URLSearchParams();
    for (const [k, v] of form) if (v) next.set(k, String(v));
    router.push(`${near ? "/jobs/near-me" : "/jobs"}?${next}`);
  }
  function go(p: number) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    router.push(`${near ? "/jobs/near-me" : "/jobs"}?${next}`);
  }
  return (
    <div className="container page">
      <PageHeading
        eyebrow={near ? t("near") : t("jobs")}
        title={near ? t("nearTitle") : t("latest")}
        body={near ? t("nearBody") : t("latestBody")}
      />
      {near && (
        <section className="location-panel">
          <span className="location-icon">
            <LocateFixed size={27} />
          </span>
          <div>
            <strong>
              <span className={`location-state ${location ? "enabled" : ""}`} />
              {t(
                location
                  ? "locationOn"
                  : params.get("district")
                    ? "manual"
                    : "locationOff",
              )}
            </strong>
            <p>{t("locationPrivacy")}</p>
          </div>
          <button
            className="button"
            onClick={enableLocation}
            disabled={locating}
          >
            <Navigation size={17} />
            {t(locating ? "loading" : "enable")}
          </button>
          {location && (
            <button className="text-button" onClick={clearLocation}>
              {t("forget")}
            </button>
          )}
        </section>
      )}
      <div className="search-layout">
        <aside className={`filter-panel ${filterOpen ? "filters-open" : ""}`}>
          <button
            className="filter-toggle"
            onClick={() => setFilterOpen(!filterOpen)}
            aria-expanded={filterOpen}
          >
            <SlidersHorizontal size={18} />
            {t("filters")}
          </button>
          <form key={params.toString()} onSubmit={submit}>
            <h3>
              <SlidersHorizontal size={17} />
              {t("filters")}
            </h3>
            <label>
              {t("search")}
              <input
                name="query"
                defaultValue={params.get("query") ?? ""}
                placeholder={t("searchPlaceholder")}
              />
            </label>
            <label>
              {t("district")}
              <select
                aria-label={t("district")}
                name="district"
                defaultValue={params.get("district") ?? ""}
              >
                <option value="">{t("allDistricts")}</option>
                {districts.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label>
              {t("category")}
              <select
                aria-label={t("category")}
                name="category"
                defaultValue={params.get("category") ?? ""}
              >
                <option value="">{t("allCategories")}</option>
                {categories.map((c) => (
                  <option value={c} key={c}>
                    {categoryName(c)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("minWage")}
              <input
                type="number"
                name="minWage"
                min="0"
                max="10000000"
                defaultValue={params.get("minWage") ?? ""}
                placeholder="LKR"
              />
            </label>
            <label>
              {t("date")}
              <input
                type="date"
                name="date"
                defaultValue={params.get("date") ?? ""}
              />
            </label>
            {near && location && (
              <label>
                {t("radius")}
                <select
                  aria-label={t("radius")}
                  name="radiusKm"
                  defaultValue={params.get("radiusKm") ?? "10"}
                >
                  {[5, 10, 25, 50].map((r) => (
                    <option key={r} value={r}>
                      {r} km
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              {t("sort")}
              <select
                aria-label={t("sort")}
                name="sort"
                defaultValue={
                  params.get("sort") ?? (location ? "nearest" : "soonest")
                }
              >
                <option value="soonest">{t("soonest")}</option>
                {location && <option value="nearest">{t("nearest")}</option>}
                <option value="wage">{t("highest")}</option>
              </select>
            </label>
            <button className="button" type="submit">
              <Search size={17} />
              {t("search")}
            </button>
            <Link
              className="text-button centered"
              href={near ? "/jobs/near-me" : "/jobs"}
            >
              {t("clear")}
            </Link>
          </form>
        </aside>
        <section className="search-results">
          <div className="results-heading">
            <span>
              <strong>{ready && data ? data.total : "—"}</strong> {t("results")}
            </span>
            <span className="demo-tag">{t("demoShort")}</span>
          </div>
          {!ready ? (
            <Empty title={t("chooseArea")} body={t("nearBody")} />
          ) : loading ? (
            <Loading />
          ) : error ? (
            <Failure retry={reload} />
          ) : data?.jobs.length ? (
            <>
              <div className="job-grid two-col">
                {data.jobs.map((j) => (
                  <JobCard job={j} key={j.id} />
                ))}
              </div>
              <div className="pagination">
                <button
                  className="button secondary"
                  disabled={page <= 1}
                  onClick={() => go(page - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft />
                </button>
                <span>
                  {page} / {Math.max(1, Math.ceil(data.total / 12))}
                </span>
                <button
                  className="button secondary"
                  disabled={page * 12 >= data.total}
                  onClick={() => go(page + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight />
                </button>
              </div>
            </>
          ) : (
            <Empty title={t("noResults")} body={t("noResultsBody")} />
          )}
          <p className="demo-disclosure">
            <Info size={14} />
            {t("demo")}
          </p>
          {near && location && (
            <p className="muted small-text">{t("distanceNote")}</p>
          )}
        </section>
      </div>
    </div>
  );
}

export function EmployersLanding() {
  const { t } = useApp();
  return (
    <div className="container page">
      <div className="employers-hero">
        <p className="eyebrow">{t("employers")}</p>
        <h1>{t("employerTitle")}</h1>
        <p>{t("employerBody")}</p>
        <Link className="button" href="/register?role=EMPLOYER">
          {t("register")}
          <ArrowUpRight size={20} />
        </Link>
      </div>
      <div className="steps">
        {[
          {
            Icon: BuildingIcon,
            title: "company" as const,
            body: "companyBody" as const,
          },
          {
            Icon: BriefcaseBusiness,
            title: "post" as const,
            body: "jobFormBody" as const,
          },
          {
            Icon: Users,
            title: "review" as const,
            body: "dashboardBody" as const,
          },
        ].map(({ Icon, title, body }) => (
          <article className="step" key={title}>
            <span className="step-icon">
              <Icon />
            </span>
            <h3>{t(title)}</h3>
            <p className="muted">{t(body)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
const BuildingIcon = BriefcaseBusiness;
export { Assistant } from "./assistant";
export function Privacy() {
  const { t } = useApp();
  return (
    <div className="container page narrow">
      <PageHeading title={t("privacy")} />
      <section className="panel prose">
        <ShieldCheck size={32} />
        <p>{t("privacyBody")}</p>
        <p className="muted">{t("demo")}</p>
      </section>
    </div>
  );
}
