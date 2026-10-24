"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sun,
  Moon,
  Menu,
  X,
  ArrowUpRight,
  LayoutDashboard,
  BriefcaseBusiness,
  Users,
  Building2,
  Plus,
  LogOut,
  MapPin,
  Sparkles,
  User,
  ClipboardList,
  Globe,
} from "lucide-react";
import { useApp } from "./provider";
import { Logo } from "./ui";
import { browserDb } from "@/lib/supabase/client";
import type { MessageKey } from "@/lib/i18n";
export function Shell({ children }: { children: ReactNode }) {
  const { t, locale, setLocale, theme, toggleTheme, profile, refreshProfile } =
    useApp();
  const [pathOpen, setPathOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const employer = path.startsWith("/employer");
  if (path === "/admin" || path.startsWith("/admin/")) return <>{children}</>;
  const publicLinks: [string, MessageKey][] =
    profile?.role === "WORKER"
      ? [
          ["/jobs", "find"],
          ["/jobs/near-me", "near"],
          ["/applications", "applications"],
          ["/assistant", "assistant"],
          ["/profile", "profile"],
        ]
      : [
          ["/", "home"],
          ["/jobs", "jobs"],
          ["/jobs/near-me", "near"],
          ["/assistant", "assistant"],
          ["/for-employers", "employers"],
        ];
  const staffLinks = [
    { href: "/employer", key: "overview" as const, Icon: LayoutDashboard },
    { href: "/employer/jobs", key: "myJobs" as const, Icon: BriefcaseBusiness },
    { href: "/employer/applicants", key: "applicants" as const, Icon: Users },
    { href: "/employer/company", key: "company" as const, Icon: Building2 },
  ];
  const active = (href: string) =>
    href === "/" || href === "/employer"
      ? path === href
      : path === href ||
        (href === "/jobs" &&
          path.startsWith("/jobs/") &&
          path !== "/jobs/near-me");
  const logout = async () => {
    await browserDb().auth.signOut();
    await refreshProfile();
    router.push("/");
  };
  return (
    <>
      <a href="#main" className="skip-link">
        {t("skip")}
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Main">
            {publicLinks.map(([href, key]) => (
              <Link
                key={href}
                className={active(href) ? "active" : ""}
                href={href}
              >
                {t(key)}
              </Link>
            ))}
          </nav>
          <div className="header-controls">
            <label className="language-control">
              <Globe size={15} />
              <select
                aria-label="Language / භාෂාව / மொழி"
                value={locale}
                onChange={(e) => setLocale(e.target.value as typeof locale)}
              >
                <option value="en">EN</option>
                <option value="si">සිං</option>
                <option value="ta">தமிழ்</option>
              </select>
            </label>
            <button
              className="icon-button theme-toggle"
              onClick={toggleTheme}
              aria-label={t(theme === "dark" ? "light" : "dark")}
              title={t(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {profile ? (
              <Link
                className="button small secondary account-link"
                href={
                  profile.role === "ADMIN"
                    ? "/admin"
                    : profile.role === "EMPLOYER"
                      ? "/employer"
                      : "/applications"
                }
              >
                <span className="avatar-mini">
                  {profile.display_name[0] || "F"}
                </span>
                {profile.display_name.split(" ")[0]}
              </Link>
            ) : (
              <>
                <Link className="login-link" href="/login">
                  {t("login")}
                </Link>
                <Link className="button small header-register" href="/register">
                  {t("register")}
                  <ArrowUpRight size={15} />
                </Link>
              </>
            )}
            {profile && (
              <button
                className="icon-button logout-button"
                onClick={logout}
                aria-label={t("logout")}
              >
                <LogOut size={17} />
              </button>
            )}
            <button
              className="icon-button mobile-menu-toggle"
              onClick={() => setPathOpen(!pathOpen)}
              aria-label={t("menu")}
              aria-expanded={pathOpen}
            >
              {pathOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {pathOpen && (
          <nav className="mobile-menu">
            {profile?.role === "EMPLOYER" && (
              <Link href="/employer" onClick={() => setPathOpen(false)}>
                {t("overview")}
              </Link>
            )}
            {publicLinks.map(([href, key]) => (
              <Link key={href} href={href} onClick={() => setPathOpen(false)}>
                {t(key)}
              </Link>
            ))}
            <Link
              href={profile ? "/profile" : "/login"}
              onClick={() => setPathOpen(false)}
            >
              {t(profile ? "profile" : "login")}
            </Link>
            {profile && <button onClick={logout}>{t("logout")}</button>}
          </nav>
        )}
      </header>
      {employer ? (
        <div className="workspace">
          <aside className="sidebar">
            <p className="sidebar-label">{t("employers")}</p>
            <nav>
              {staffLinks.map(({ href, key, Icon }) => (
                <Link
                  key={href}
                  className={path === href ? "active" : ""}
                  href={href}
                >
                  <Icon size={19} />
                  {t(key)}
                </Link>
              ))}
            </nav>
            <Link className="button" href="/employer/jobs/new">
              <Plus size={18} />
              {t("post")}
            </Link>
            <div className="sidebar-bottom">
              <span className="demo-tag">{t("demoShort")}</span>
              <p className="muted">{t("tagline")}</p>
              {profile && (
                <button className="text-button" onClick={logout}>
                  <LogOut size={16} />
                  {t("logout")}
                </button>
              )}
            </div>
          </aside>
          <main id="main" className="workspace-main">
            {children}
          </main>
        </div>
      ) : (
        <main id="main">{children}</main>
      )}
      {!employer && (
        <footer className="footer">
          <div className="footer-top">
            <div>
              <Logo />
              <p>{t("tagline")}</p>
            </div>
            <div className="footer-links">
              <Link href="/jobs">{t("jobs")}</Link>
              <Link href="/for-employers">{t("employers")}</Link>
              <Link href="/privacy">{t("privacy")}</Link>
            </div>
            <span className="made-in">
              <span />
              Sri Lanka · LKR
            </span>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} FlexiRova</span>
            <span>{t("demo")}</span>
          </div>
        </footer>
      )}
      {profile?.role === "WORKER" && (
        <nav className="bottom-nav">
          {[
            { href: "/jobs", key: "find" as const, Icon: MapPin },
            {
              href: "/applications",
              key: "applications" as const,
              Icon: ClipboardList,
            },
            { href: "/assistant", key: "assistant" as const, Icon: Sparkles },
            { href: "/profile", key: "profile" as const, Icon: User },
          ].map(({ href, key, Icon }) => (
            <Link
              key={href}
              className={path === href ? "active" : ""}
              href={href}
            >
              <Icon size={21} />
              <span>{t(key)}</span>
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
