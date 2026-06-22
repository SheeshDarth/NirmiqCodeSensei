export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-pulse">
      <div className="h-6 bg-zinc-800 rounded w-48" />
      <div className="bg-[#0d1117] border border-zinc-800 rounded-lg p-5 space-y-3">
        <div className="h-4 bg-zinc-800 rounded w-64" />
        <div className="h-3 bg-zinc-800 rounded w-full" />
        <div className="h-3 bg-zinc-800 rounded w-3/4" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-[#0d1117] border border-zinc-800 rounded-lg p-4 space-y-2"
          >
            <div className="h-3 bg-zinc-800 rounded w-24" />
            <div className="h-6 bg-zinc-800 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
