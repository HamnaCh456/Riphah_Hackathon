// Creates the demo logins, and only the logins. Jobs, resumes, scores and evidence all come from
// clicking through the real app, so no AI output is faked.
// Safe to re-run: existing accounts keep their data and get their password and name reset.
// Run: node scripts/seed-demo.mjs
import { readFileSync } from "node:fs";

const PROJECT_REF = "lbxozdqgboubbyvzgquz";
const PASSWORD = "DemoRiphah!2026";
const ACCOUNTS = [
  { email: "recruiter@demo.test", role: "recruiter", fullName: "Demo Recruiter" },
  { email: "hira@demo.test", role: "candidate", fullName: "Hira Malik", resume: "hira-malik-strong.pdf" },
  { email: "omar@demo.test", role: "candidate", fullName: "Omar Tariq", resume: "omar-tariq-semantic.pdf" },
  { email: "zara@demo.test", role: "candidate", fullName: "Zara Noor", resume: "zara-noor-weak.pdf" },
];

function readEnv() {
  const env = {};
  for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
    const at = line.indexOf("=");
    if (at > 0) env[line.slice(0, at).trim()] = line.slice(at + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = readEnv();
const url = env["SUPABASE-URL"];
const key = env["ANON-API-KEY"];
if (!url || !key) throw new Error("SUPABASE-URL and ANON-API-KEY must both be set in .env");
if (new URL(url).hostname !== `${PROJECT_REF}.supabase.co`) {
  throw new Error(`Refusing to run: .env points at ${url}, not project ${PROJECT_REF}`);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

async function fetchWithRetry(target, options) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetch(target, { ...options, signal: AbortSignal.timeout(20_000) });
    } catch (error) {
      if (attempt === 4) throw new Error(`Could not reach Supabase: ${error.message}`);
      await new Promise((done) => setTimeout(done, 2000 * attempt));
    }
  }
}

async function call(path, options = {}) {
  const res = await fetchWithRetry(`${url}${path}`, { headers, ...options });
  const body = await res.text();
  if (!res.ok) throw new Error(`${options.method ?? "GET"} ${path} failed: ${res.status} ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}

async function findUser(email) {
  for (let page = 1; ; page += 1) {
    const { users } = await call(`/auth/v1/admin/users?page=${page}&per_page=200`);
    const match = users.find((user) => user.email === email);
    if (match) return match;
    if (users.length < 200) return null;
  }
}

async function ensureAccount({ email, role, fullName }) {
  const fields = {
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role, full_name: fullName },
  };
  const existing = await findUser(email);
  const user = existing
    ? await call(`/auth/v1/admin/users/${existing.id}`, { method: "PUT", body: JSON.stringify(fields) })
    : await call("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, ...fields }) });

  // The profile comes from the sign-up trigger, and its role can't change afterwards.
  const [profile] = await call(`/rest/v1/profiles?id=eq.${user.id}&select=role`);
  if (profile?.role !== role) {
    throw new Error(`${email} should have role ${role}, but its profile has ${profile?.role ?? "no row"}`);
  }

  await call("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  return existing ? "reset" : "created";
}

console.log(`Project: ${PROJECT_REF}\n`);
for (const account of ACCOUNTS) {
  const outcome = await ensureAccount(account);
  const resume = account.resume ? `  upload demo/resumes/${account.resume}` : "";
  console.log(`${account.role.padEnd(10)} ${account.email.padEnd(21)} ${PASSWORD}  (${outcome}, login checked)${resume}`);
}
