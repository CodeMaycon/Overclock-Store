import { NextRequest, NextResponse } from "next/server";
import { PATCH } from "../route";

// Endpoint dedicado POST /api/admin/licenses/[id]/revoke
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(req, context);
}
