import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  requireAuthenticatedRole,
  requireSameOriginMutation,
  RequestGuardError,
} from "@/lib/security/request-guards";

const bodySchema = z.object({
  accountStatus: z.enum(["ACTIVE", "SUSPENDED"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    requireSameOriginMutation(request);
    const admin = await requireAuthenticatedRole(["ADMIN"]);
    const { userId } = await params;
    const { accountStatus } = bodySchema.parse(await request.json());

    if (userId === admin.id) {
      return NextResponse.json(
        { error: "You cannot change your own account status." },
        { status: 400 },
      );
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { accountStatus },
      select: { id: true, accountStatus: true },
    });
    return NextResponse.json({ user });
  } catch (error) {
    const status =
      error instanceof z.ZodError
        ? 400
        : error instanceof RequestGuardError
          ? error.status
          : 404;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update account status." },
      { status },
    );
  }
}
