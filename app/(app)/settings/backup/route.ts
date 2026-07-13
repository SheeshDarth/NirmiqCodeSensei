import { NextResponse } from "next/server";
import { backupDatabase } from "@/lib/services/backup.service";

// Always run on request — this streams a fresh, live snapshot of the DB.
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const result = await backupDatabase();

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(result.data.data), {
    headers: {
      "Content-Type": "application/x-sqlite3",
      "Content-Disposition": `attachment; filename="${result.data.filename}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
