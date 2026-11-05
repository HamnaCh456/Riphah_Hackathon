// The stages come from the brief. The ones marked are decided by a person, never by the AI.
const STAGES = [
  { name: "Submitted" },
  { name: "Parsed" },
  { name: "AI assessment available" },
  { name: "Recruiter review" },
  { name: "Shortlisted or rejected", decidedByRecruiter: true },
  { name: "Interview" },
  { name: "Selected or rejected", decidedByRecruiter: true },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <main className="px-5 py-10 lg:px-10 lg:pt-[12vh]">
        <div className="mx-auto w-full max-w-sm">
          <p className="mb-8 text-[17px] font-medium tracking-[-.02em] text-platinum">
            Talent Intelligence
          </p>
          {children}
        </div>
      </main>

      <aside className="hidden border-l bg-deep px-10 py-10 lg:block lg:pt-[12vh]">
        <div className="mx-auto w-full max-w-xl">
          <p className="max-w-[20ch] text-[2.6rem] font-medium leading-none tracking-[-.038em] text-platinum">
            AI recommends. People decide.
          </p>
          <ol className="mt-10 border-b">
            {STAGES.map((stage, index) => (
              <li
                key={stage.name}
                className="flex items-baseline justify-between gap-4 border-t py-3"
              >
                <span className="flex items-baseline gap-4">
                  <span className="font-mono text-xs tabular-nums">
                    {index + 1}
                  </span>
                  <span className="text-mist">{stage.name}</span>
                </span>
                {stage.decidedByRecruiter && (
                  <span className="font-mono text-[10px] uppercase tracking-[.15em] text-lavender">
                    Recruiter decides
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
