"use client";
import { usePathname } from "next/navigation";
import {
  Home,
  Jobs,
  EmployersLanding,
  Assistant,
  Privacy,
} from "./public-pages";
import { JobDetail } from "./job-detail";
import { Auth, ProfilePage, Applications, CompanyPage } from "./accounts";
import {
  EmployerDashboard,
  EmployerJobs,
  Applicants,
  ManageJob,
  JobEditor,
} from "./employer";
import { Empty } from "./ui";
import { useApp } from "./provider";
import { AdminDashboard } from "./admin";
export function App() {
  const path = usePathname();
  const { t } = useApp();
  if (path === "/admin" || path.startsWith("/admin/"))
    return <AdminDashboard />;
  if (path === "/") return <Home />;
  if (path === "/jobs") return <Jobs />;
  if (path === "/jobs/near-me") return <Jobs near />;
  if (/^\/jobs\/[^/]+$/.test(path))
    return <JobDetail id={path.split("/")[2]} />;
  if (path === "/login") return <Auth />;
  if (path === "/register") return <Auth signup />;
  if (path === "/profile") return <ProfilePage />;
  if (path === "/applications") return <Applications />;
  if (path === "/assistant") return <Assistant />;
  if (path === "/privacy") return <Privacy />;
  if (path === "/for-employers") return <EmployersLanding />;
  if (path === "/employer") return <EmployerDashboard />;
  if (path === "/employer/jobs") return <EmployerJobs />;
  if (path === "/employer/company") return <CompanyPage />;
  if (path === "/employer/applicants") return <Applicants />;
  if (path === "/employer/jobs/new") return <JobEditor />;
  if (/^\/employer\/jobs\/[^/]+\/edit$/.test(path))
    return <JobEditor id={path.split("/")[3]} />;
  if (/^\/employer\/jobs\/[^/]+$/.test(path))
    return <ManageJob id={path.split("/")[3]} />;
  return <Empty title={t("notFound")} />;
}
