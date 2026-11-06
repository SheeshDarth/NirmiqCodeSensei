/**
 * publish-guard — the rules that decide whether a file may be shipped in dist/.
 *
 * Kept separate from pack-standalone.mjs (which deletes and rebuilds dist/ the
 * moment it runs) so the predicate can be imported and tested on its own. This is
 * the last gate before a tarball goes out: file tracing really does copy data/
 * (the database and users' imported projects) into the standalone output.
 *
 * Paths are tested separator-agnostically so the same rules hold on Windows
 * (backslashes) and Linux/macOS (forward slashes).
 */

const segments = (p) => p.split(/[\\/]/).filter(Boolean);

export const FORBIDDEN = [
  { test: (p) => segments(p)[0] === "data", why: "local database / imported user projects" },
  { test: (p) => /\.db(-wal|-shm)?$/.test(p), why: "SQLite database" },
  { test: (p) => segments(p).some((s) => s.startsWith(".env")), why: "environment file" },
  { test: (p) => p.endsWith(".node"), why: "platform-specific native binary" },
  { test: (p) => segments(p).includes(".git"), why: "git history" },
  // Only a dist-root ignore file is dangerous — it is the one npm applies to the
  // whole tarball. The .gitignore files individual npm packages ship inside
  // node_modules are inert here, so don't fail on those.
  {
    test: (p) => p === ".gitignore" || p === ".npmignore",
    why: "root ignore file — would gut the tarball",
  },
];

/** Reasons a dist-relative path must not be published; empty means it is fine. */
export function forbiddenReasons(relativePath) {
  return FORBIDDEN.filter((rule) => rule.test(relativePath)).map((rule) => rule.why);
}
