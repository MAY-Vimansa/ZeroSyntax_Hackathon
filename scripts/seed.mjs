import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local", quiet: true });
if (
  !["localhost", "127.0.0.1"].includes(
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
  )
)
  throw new Error("This fictional demo seed is restricted to local Supabase.");
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
function check(result) {
  if (result.error) throw result.error;
  return result.data;
}
const listed = check(await admin.auth.admin.listUsers({ perPage: 1000 }));
async function user(email, name, role) {
  const found = listed.users.find((u) => u.email === email);
  if (found) return found.id;
  return check(
    await admin.auth.admin.createUser({
      email,
      password: "FlexiRova!2026",
      email_confirm: true,
      user_metadata: { display_name: name, role },
    }),
  ).user.id;
}
const employer = await user(
  "employer@flexirova.example",
  "Ravi Perera",
  "EMPLOYER",
);
const worker = await user("worker@flexirova.example", "Nimali Silva", "WORKER");
check(
  await admin
    .from("profiles")
    .update({
      city: "Colombo",
      district: "Colombo",
      bio: "I have experience in warehouse packing, sorting, and customer service.",
      skills: ["packing", "sorting", "customer service"],
      availability: "Weekdays and weekends",
    })
    .eq("id", worker),
);
const employer2 = await user(
  "employer2@flexirova.example",
  "Arun Fernando",
  "EMPLOYER",
);
const companyNames = [
  "Luma Logistics (Demo)",
  "Cinnamon Table (Demo)",
  "Northstar Events (Demo)",
  "Everyday Retail (Demo)",
  "Coastline Stays (Demo)",
];
const owners = [employer, employer2];
for (let i = 2; i < 5; i++)
  owners.push(
    await user(
      `employer${i + 1}@flexirova.example`,
      `Demo Employer ${i + 1}`,
      "EMPLOYER",
    ),
  );
const companies = [];
for (let i = 0; i < companyNames.length; i++) {
  companies.push(
    check(
      await admin
        .from("companies")
        .upsert(
          {
            owner_id: owners[i],
            name: companyNames[i],
            description:
              "A fictional business created exclusively for the FlexiRova demonstration. No real vacancies.",
            contact_email: `hello${i + 1}@flexirova.example`,
            city: i === 4 ? "Negombo" : "Colombo",
            district: i === 4 ? "Gampaha" : "Colombo",
          },
          { onConflict: "owner_id" },
        )
        .select("*")
        .single(),
    ),
  );
}
const records = [
  [
    "Warehouse Packing Assistant",
    "warehouse",
    3000,
    "Colombo",
    "Colombo",
    6.9271,
    79.8612,
    0,
    ["packing", "sorting"],
    6,
  ],
  [
    "Restaurant Service Assistant",
    "restaurant",
    2800,
    "Colombo",
    "Colombo",
    6.9032,
    79.8549,
    1,
    ["customer service", "cleaning"],
    4,
  ],
  [
    "Event Setup Crew",
    "events",
    3500,
    "Colombo",
    "Colombo",
    6.9164,
    79.8636,
    2,
    ["setup", "teamwork"],
    8,
  ],
  [
    "Retail Store Assistant",
    "retail",
    2700,
    "Dehiwala",
    "Colombo",
    6.8511,
    79.8659,
    3,
    ["customer service", "stocking"],
    3,
  ],
  [
    "Guest Services Helper",
    "hospitality",
    3200,
    "Negombo",
    "Gampaha",
    7.2083,
    79.8358,
    4,
    ["cleaning", "customer service"],
    4,
  ],
  [
    "Inventory & Stock Assistant",
    "warehouse",
    3200,
    "Wattala",
    "Gampaha",
    6.9906,
    79.8895,
    0,
    ["counting", "packing"],
    5,
  ],
  [
    "Packing & Sorting Shift",
    "warehouse",
    2900,
    "Gampaha",
    "Gampaha",
    7.0873,
    80.0144,
    0,
    ["packing", "sorting"],
    7,
  ],
  [
    "Shop Floor Helper",
    "retail",
    2600,
    "Maharagama",
    "Colombo",
    6.848,
    79.9265,
    3,
    ["stocking", "teamwork"],
    2,
  ],
  [
    "Factory Production Assistant",
    "factory",
    3100,
    "Kalutara",
    "Kalutara",
    6.5854,
    79.9607,
    0,
    ["packing", "teamwork"],
    6,
  ],
  [
    "Office Records Assistant",
    "office",
    3000,
    "Colombo",
    "Colombo",
    6.9147,
    79.8778,
    3,
    ["data entry", "filing"],
    2,
  ],
  [
    "Full Shift — Unavailable Fixture",
    "warehouse",
    2900,
    "Colombo",
    "Colombo",
    6.9271,
    79.8612,
    0,
    ["packing"],
    1,
  ],
  [
    "Expired Shift — Unavailable Fixture",
    "events",
    3400,
    "Colombo",
    "Colombo",
    6.9271,
    79.8612,
    2,
    ["setup"],
    2,
  ],
];
for (let i = 0; i < records.length; i++) {
  const [
    title,
    category,
    wage,
    city,
    district,
    latitude,
    longitude,
    c,
    skills,
    needed,
  ] = records[i];
  const day = new Date(Date.now() + (i === 11 ? -2 : 1 + (i % 3)) * 86400000);
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(day);
  const start = new Date(`${localDate}T09:00:00+05:30`),
    end = new Date(`${localDate}T17:00:00+05:30`);
  const id = `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
  const approved = await admin
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("job_id", id)
    .eq("status", "APPROVED");
  if (approved.error) throw approved.error;
  const approvedCount =
    i === 10 ? Math.max(1, approved.count ?? 0) : (approved.count ?? 0);
  check(
    await admin.from("jobs").upsert(
      {
        id,
        company_id: companies[c].id,
        created_by: owners[c],
        title,
        category,
        daily_wage_lkr: wage,
        description: `FICTIONAL DEMO SHIFT. Join the ${city} team as a ${title.toLowerCase()}. Support the team with ${skills.join(" and ")}. A supervisor provides a short induction. Bring comfortable closed-toe shoes and arrive before the shift starts. This listing does not represent an actual employment opportunity.`,
        required_skills: skills,
        shift_start_at: start.toISOString(),
        shift_end_at: end.toISOString(),
        application_cutoff_at: new Date(
          start.getTime() - 3600000,
        ).toISOString(),
        required_workers: Math.max(needed, approvedCount),
        approved_count: approvedCount,
        location_name: `Demo workplace, ${city} — fictional address`,
        city,
        district,
        latitude,
        longitude,
        payment_terms:
          i === 8
            ? ""
            : "Employer records wages after the completed shift; agree the payment method and timing before accepting.",
        status: "PUBLISHED",
      },
      { onConflict: "id" },
    ),
  );
}
check(
  await admin
    .from("applications")
    .upsert(
      { job_id: "00000000-0000-4000-8000-000000000001", worker_id: worker },
      { onConflict: "job_id,worker_id", ignoreDuplicates: true },
    ),
);
console.log(
  `Seeded ${records.length} fictional shifts (10 available, one full, one expired), 5 companies, and demo accounts. Re-running refreshes only these demo fixtures.`,
);
