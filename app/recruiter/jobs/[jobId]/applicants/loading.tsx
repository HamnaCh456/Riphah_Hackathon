// Shows before the page and its shell arrive, so it holds the same left-rail space.
export default function Loading() {
  return (
    <div aria-busy="true" className="px-5 py-6 lg:pl-[280px] lg:pr-10">
      <div className="h-8 w-64 animate-pulse rounded-small bg-wash" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-5 h-14 animate-pulse border-b border-hairline-soft bg-wash" />
      ))}
    </div>
  );
}
