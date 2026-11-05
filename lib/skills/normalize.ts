/**
 * Maps equivalent skill names to one standard name. This is a plain table, not AI, so the same
 * input always gives the same result. Meaning-based matching belongs to the matching module.
 */
const KNOWN_SKILLS: Record<string, string[]> = {
  JavaScript: ["js", "javascript", "ecmascript", "es6"],
  TypeScript: ["ts", "typescript"],
  Python: ["py", "python", "python3"],
  Java: ["java"],
  "C++": ["c++", "cpp"],
  "C#": ["c#", "csharp"],
  ".NET": ["dotnet", "net", "netcore"],
  Go: ["go", "golang"],
  Ruby: ["ruby"],
  "Ruby on Rails": ["rails", "rubyonrails", "ror"],
  PHP: ["php"],
  Rust: ["rust"],
  Kotlin: ["kotlin"],
  Swift: ["swift"],
  HTML: ["html", "html5"],
  CSS: ["css", "css3"],
  SQL: ["sql"],
  PostgreSQL: ["postgres", "postgresql", "psql", "pgsql"],
  MySQL: ["mysql"],
  "SQL Server": ["sqlserver", "mssql", "microsoftsqlserver"],
  MongoDB: ["mongo", "mongodb"],
  Redis: ["redis"],
  React: ["react", "reactjs"],
  "React Native": ["reactnative"],
  "Next.js": ["next", "nextjs"],
  "Vue.js": ["vue", "vuejs"],
  Angular: ["angular", "angularjs"],
  "Node.js": ["node", "nodejs"],
  "Express.js": ["express", "expressjs"],
  Django: ["django"],
  "Django REST Framework": ["drf", "djangorest", "djangorestframework"],
  Flask: ["flask"],
  FastAPI: ["fastapi"],
  "Spring Boot": ["spring", "springboot"],
  Docker: ["docker", "dockerfile"],
  Kubernetes: ["k8s", "kubernetes", "kube"],
  AWS: ["aws", "amazonwebservices"],
  Azure: ["azure", "microsoftazure"],
  "Google Cloud": ["gcp", "googlecloud", "googlecloudplatform"],
  Git: ["git"],
  "CI/CD": ["cicd", "ci/cd", "continuousintegration"],
  "REST APIs": ["rest", "restapi", "restapis", "restful", "restfulapi", "restfulapis"],
  GraphQL: ["graphql"],
  "Machine Learning": ["ml", "machinelearning"],
  "Artificial Intelligence": ["ai", "artificialintelligence"],
};

const NAME_BY_ALIAS = new Map(
  Object.entries(KNOWN_SKILLS).flatMap(([name, aliases]) =>
    aliases.map((alias) => [alias, name] as const),
  ),
);

/** Ignores case, spaces and the punctuation people vary, but keeps the + and # in C++ and C#. */
function compact(term: string): string {
  return term.toLowerCase().replace(/[\s._-]+/g, "");
}

function tidy(term: string): string {
  return term.trim().replace(/\s+/g, " ");
}

/** The name to show: "js" becomes "JavaScript". Unknown skills keep their own wording. */
export function displaySkill(term: string): string {
  return NAME_BY_ALIAS.get(compact(term)) ?? tidy(term);
}

/** The key to compare by: "Postgres" becomes "postgresql". */
export function normalizeSkill(term: string): string {
  return displaySkill(term).toLowerCase();
}

export type MergedSkill = {
  name: string;
  normalizedName: string;
  rawTerm: string;
  excerpt: string | null;
};

/** One entry per skill, keeping the first wording used and the first excerpt found. */
export function mergeSkills(
  skills: { term: string; excerpt: string | null }[],
): MergedSkill[] {
  const merged = new Map<string, MergedSkill>();

  for (const { term, excerpt } of skills) {
    if (!term.trim()) continue;
    const normalizedName = normalizeSkill(term);
    const existing = merged.get(normalizedName);
    if (existing) {
      existing.excerpt ??= excerpt;
    } else {
      merged.set(normalizedName, {
        name: displaySkill(term),
        normalizedName,
        rawTerm: tidy(term),
        excerpt,
      });
    }
  }

  return [...merged.values()];
}
