export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0c10] text-white">
      <div className="max-w-2xl text-center px-6">
        <p className="text-xs font-mono tracking-widest text-cyan-500 uppercase mb-4">
          CodeSensei
        </p>
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Build with AI.
          <br />
          <span className="text-cyan-400">Learn like a real engineer.</span>
        </h1>
        <p className="text-zinc-400 text-lg mb-8">
          Your personal AI-assisted learning operating system. Understand every
          line, explain every decision, and master what you build.
        </p>
        <a
          href="/dashboard"
          className="inline-block bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-6 py-3 rounded-md transition-colors"
        >
          Open Dashboard
        </a>
      </div>
    </main>
  );
}
