# Repository Setup — NirmiqCodeSensei

## 1. Clone Repository

```bash
git clone https://github.com/SheeshDarth/NirmiqCodeSensei.git
cd NirmiqCodeSensei
```

## 2. Initialize App if Empty

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app
```

Recommended choices:
- TypeScript: yes
- ESLint: yes
- Tailwind: yes
- src directory: no
- App Router: yes
- import alias: yes

## 3. Install Recommended Dependencies

```bash
npm install drizzle-orm better-sqlite3 zod zustand lucide-react
npm install -D drizzle-kit @types/better-sqlite3
```

Optional UI:
```bash
npx shadcn@latest init
npx shadcn@latest add button card input textarea badge tabs dialog dropdown-menu progress
```

## 4. Add Scripts

Add to package.json:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

## 5. First Commit

```bash
git add .
git commit -m "chore: initialize NirmiqCodeSensei project"
git push origin main
```
