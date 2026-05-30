import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";

function makeTemporaryPassword() {
  return `TempTrack!${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

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
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing authorization token." },
        { status: 401 },
      );
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json(
        { ok: false, error: "Could not verify the current user." },
        { status: 401 },
      );
    }

    const { data: callerProfile, error: callerError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (callerError || !callerProfile) {
      return NextResponse.json(
        { ok: false, error: "Your profile could not be loaded." },
        { status: 403 },
      );
    }

    if (!["agency_admin", "platform_owner"].includes(callerProfile.role)) {
      return NextResponse.json(
        { ok: false, error: "Only agency admins or platform owners can create client managers." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      agencyId?: string;
      assignedClientIds?: string[];
      assignedSiteIds?: string[];
    };

    const firstName = body.firstName?.trim() ?? "";
    const lastName = body.lastName?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const phone = body.phone?.trim() ?? "";
    const assignedClientIds = Array.isArray(body.assignedClientIds)
      ? body.assignedClientIds
      : [];
    const assignedSiteIds = Array.isArray(body.assignedSiteIds)
      ? body.assignedSiteIds
      : [];

    const targetAgencyId =
      callerProfile.role === "platform_owner"
        ? body.agencyId?.trim() ?? ""
        : callerProfile.agency_id;

    if (!targetAgencyId || !firstName || !lastName || !email) {
      return NextResponse.json(
        { ok: false, error: "Agency, name, and email are required." },
        { status: 400 },
      );
    }

    const tempPassword = makeTemporaryPassword();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role: "client_manager",
        agency_id: targetAgencyId,
        first_name: firstName,
        last_name: lastName,
        phone,
        assigned_client_ids: assignedClientIds,
        assigned_site_ids: assignedSiteIds,
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "Could not create the client manager." },
        { status: 400 },
      );
    }

    const profile = await waitForProfile(data.user.id);

    if (!profile) {
      await supabase.auth.admin.deleteUser(data.user.id);
      return NextResponse.json(
        { ok: false, error: "The login was created, but the client manager profile did not finish provisioning." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      userId: data.user.id,
      agencyId: profile.agency_id,
      password: tempPassword,
    });
  } catch (error) {
    console.error("Client manager creation failed", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not create the client manager.",
      },
      { status: 500 },
    );
  }
}
