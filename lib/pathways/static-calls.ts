import ts from "typescript";
import path from "path";
import { readFileSync, realpathSync, lstatSync } from "fs";
import { createHash } from "crypto";
import type { FileRecord } from "@/lib/services/code-analyzer.service";
import type { WalkEdge } from "./shared";

const ROOT = "/workspace/";
const id = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 24);
export function readModuleAliases(root: string): Record<string, string[]> {
  for (const name of ["tsconfig.json", "jsconfig.json"]) {
    try {
      const file = path.join(root, name);
      if (lstatSync(file).isSymbolicLink() || realpathSync(file) !== path.join(realpathSync(root), name) || lstatSync(file).size > 80_000) continue;
      const parsed = ts.parseConfigFileTextToJson(name, readFileSync(file, "utf8"));
      const options = parsed.config?.compilerOptions;
      if (!options) continue;
      const base = typeof options.baseUrl === "string" ? options.baseUrl.replaceAll("\\", "/") : ".";
      if (base.startsWith("/") || base.includes(":") || base.split("/").includes("..")) return {};
      const result: Record<string, string[]> = {};
      for (const [key, values] of Object.entries(options.paths ?? {})) {
        if (!Array.isArray(values)) continue;
        const safe = values.filter((v): v is string => typeof v === "string" && !v.includes(":") && !v.startsWith("/") && !v.replaceAll("\\", "/").split("/").includes(".."));
        if (safe.length) result[key] = safe.map(v => path.posix.join(base, v.replaceAll("\\", "/")));
      }
      return result;
    } catch { /* Absent configuration: relative imports still resolve. External extends are not loaded. */ }
  }
  return {};
}
type Callable = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;
function callableName(node: Callable): string | undefined {
  if (node.name && ts.isIdentifier(node.name)) return node.name.text;
  if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) return node.parent.name.text;
  if (ts.isFunctionDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword)) return "default";
  return undefined;
}
function qualifiedName(node: Callable): string | undefined {
  const parts: string[] = [];
  let current: ts.Node | undefined = node;
  while (current) {
    if (ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current) || ts.isArrowFunction(current)) {
      const name = callableName(current);
      if (!name) return undefined;
      parts.unshift(name);
    }
    current = current.parent;
  }
  return parts.join(".") || undefined;
}

/** Compiler host contains only the bounded scanned corpus. No plugins, lib files, filesystem reads or execution. */
export function analyzeStaticCalls(corpus: FileRecord[], aliases: Record<string, string[]> = {}, entryFiles?: string[]): { edges: WalkEdge[]; imports: WalkEdge[]; entries: Array<{ file: string; symbol: string; line: number }>; parsed: number; parsedFiles: string[]; unresolved: number; limited: boolean } {
  const selected = corpus.filter(f => /\.(tsx?|jsx?|mjs|cjs)$/.test(f.rel));
  const files = new Map(selected.map(f => [ROOT + f.rel, f.content]));
  const options: ts.CompilerOptions = { allowJs: true, noEmit: true, noLib: true, skipLibCheck: true, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.Preserve, baseUrl: ROOT, paths: aliases };
  const normalize = (s: string) => path.posix.normalize(s.replaceAll("\\", "/"));
  const sources = new Map<string, ts.SourceFile>();
  const host: ts.CompilerHost = {
    getSourceFile: name => {
      const key = normalize(name); const text = files.get(key); if (text === undefined) return undefined;
      if (!sources.has(key)) {
        if (sources.size >= 100) return undefined;
        sources.set(key, ts.createSourceFile(key, text, ts.ScriptTarget.ESNext, true));
      }
      return sources.get(key);
    },
    getDefaultLibFileName: () => "", writeFile: () => {}, getCurrentDirectory: () => ROOT,
    getDirectories: () => [], fileExists: name => files.has(normalize(name)),
    readFile: name => files.get(normalize(name)), useCaseSensitiveFileNames: () => true,
    getCanonicalFileName: name => name, getNewLine: () => "\n",
    directoryExists: name => [...files.keys()].some(f => f.startsWith(normalize(name).replace(/\/$/, "") + "/")),
  };
  const roots = (entryFiles ? entryFiles.map(f => ROOT + f).filter(f => files.has(f)) : [...files.keys()]).slice(0, 100);
  // Reserve recognized roots, then spend the remaining parse budget on reachable imports.
  for (const root of roots) host.getSourceFile(root, ts.ScriptTarget.ESNext);
  const program = ts.createProgram(roots, options, host);
  const checker = program.getTypeChecker();
  const edges: WalkEdge[] = [];
  const imports: WalkEdge[] = [];
  const entries: Array<{ file: string; symbol: string; line: number }> = [];
  const declarations = new Map<string, number>();
  for (const source of program.getSourceFiles()) {
    const collect = (node: ts.Node) => {
      if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) && node.body) {
        const name = qualifiedName(node);
        if (name) { const key = `${source.fileName}:${name}`; declarations.set(key, (declarations.get(key) ?? 0) + 1); }
      }
      ts.forEachChild(node, collect);
    };
    collect(source);
  }
  let unresolved = 0;
  let limited = false;
  for (const source of program.getSourceFiles()) {
    for (const statement of source.statements) {
      if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        const resolved = ts.resolveModuleName(statement.moduleSpecifier.text, source.fileName, options, host).resolvedModule;
        if (resolved && files.has(normalize(resolved.resolvedFileName))) {
          const from = source.fileName.slice(ROOT.length); const to = normalize(resolved.resolvedFileName).slice(ROOT.length);
          if (imports.length < 5000) imports.push({ id: id(`import:${from}:${to}`), from, to, kind: "imports", basis: "syntax", line: source.getLineAndCharacterOfPosition(statement.getStart()).line + 1 });
          else limited = true;
        }
      }
      const exported = ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      if (exported && ts.isFunctionDeclaration(statement) && statement.body) {
        const symbol = qualifiedName(statement);
        if (symbol) entries.push({ file: source.fileName.slice(ROOT.length), symbol, line: source.getLineAndCharacterOfPosition(statement.getStart()).line + 1 });
      }
      if (exported && ts.isVariableStatement(statement)) for (const decl of statement.declarationList.declarations) {
        if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
          const symbol = qualifiedName(decl.initializer);
          if (symbol) entries.push({ file: source.fileName.slice(ROOT.length), symbol, line: source.getLineAndCharacterOfPosition(decl.getStart()).line + 1 });
        }
      }
    }
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        if (edges.length >= 5000) { unresolved++; limited = true; return; }
        // Allow lexical calls and namespace imports, not arbitrary dynamic receiver dispatch.
        let eligible = ts.isIdentifier(node.expression);
        if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression)) {
          const sym = checker.getSymbolAtLocation(node.expression.expression);
          eligible = !!sym?.declarations?.some(d => ts.isNamespaceImport(d));
        }
        const declaration = eligible ? checker.getResolvedSignature(node)?.getDeclaration() : undefined;
        let caller: ts.Node | undefined = node.parent;
        while (caller && !ts.isFunctionDeclaration(caller) && !ts.isFunctionExpression(caller) && !ts.isArrowFunction(caller)) caller = caller.parent;
        const fromSymbol = caller ? qualifiedName(caller as Callable) : undefined;
        if (declaration && (ts.isFunctionDeclaration(declaration) || ts.isFunctionExpression(declaration) || ts.isArrowFunction(declaration)) && declaration.body && fromSymbol && files.has(declaration.getSourceFile().fileName)) {
          const toSymbol = qualifiedName(declaration);
          if (toSymbol && declarations.get(`${source.fileName}:${fromSymbol}`) === 1 && declarations.get(`${declaration.getSourceFile().fileName}:${toSymbol}`) === 1) {
            const from = source.fileName.slice(ROOT.length); const to = declaration.getSourceFile().fileName.slice(ROOT.length);
            const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
            edges.push({ id: id(`${from}:${fromSymbol}:${line}:${to}:${toSymbol}`), from, to, kind: "static_call", basis: "syntax", fromSymbol, toSymbol, line, toLine: declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1 });
          } else unresolved++;
        } else unresolved++;
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  const parsedFiles = program.getSourceFiles().map(f => f.fileName.slice(ROOT.length));
  return { edges, imports, entries, parsed: parsedFiles.length, parsedFiles, unresolved, limited };
}
