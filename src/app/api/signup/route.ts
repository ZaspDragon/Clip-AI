import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";

async function waitForProfile(userId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data } = await supabase
      .from("users")
      .select("id, agency_id, role")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      return data;
    }

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  return null;
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase service role is not configured." },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as {
      agencyName?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      password?: string;
      planId?: string;
    };

    const agencyName = body.agencyName?.trim() ?? "";
    const firstName = body.firstName?.trim() ?? "";
    const lastName = body.lastName?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const planId = body.planId === "growth" || body.planId === "pro" ? body.planId : "starter";

    if (!agencyName || !firstName || !lastName || !email || password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Agency name, admin name, email, and an 8 character password are required." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "agency_admin",
        agency_name: agencyName,
        first_name: firstName,
        last_name: lastName,
        phone,
        plan_id: planId,
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "Could not create the agency admin." },
        { status: 400 },
      );
    }

    const profile = await waitForProfile(data.user.id);

    if (!profile) {
      await supabase.auth.admin.deleteUser(data.user.id);
      return NextResponse.json(
        { ok: false, error: "The account was created, but the agency setup did not finish. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      userId: data.user.id,
      agencyId: profile.agency_id,
    });
  } catch (error) {
    console.error("Signup API failed", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not complete the signup request.",
      },
      { status: 500 },
    );
  }
}
