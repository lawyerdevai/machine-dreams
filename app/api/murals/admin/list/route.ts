import { NextResponse } from "next/server";
import { listMuralItems } from "@/lib/murals/store";
import { requireMuralsAdmin } from "../guard";

export async function GET(request: Request) {
  const denied = await requireMuralsAdmin(request);
  if (denied) return denied;

  const items = await listMuralItems();
  return NextResponse.json({ ok: true, items });
}
