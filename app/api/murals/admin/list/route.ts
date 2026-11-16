import { NextResponse } from "next/server";
import { requireMuralsAdmin } from "@/lib/murals/admin-auth";
import { listMuralItems } from "@/lib/murals/store";

export async function GET(request: Request) {
  const denied = requireMuralsAdmin(request);
  if (denied) return denied;

  const items = await listMuralItems();
  return NextResponse.json({ ok: true, items });
}
