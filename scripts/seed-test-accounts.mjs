import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const platformOwnerEmail =
  process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase() ||
  "owner@temptrackpro.com";
const platformOwnerPassword =
  process.env.PLATFORM_OWNER_PASSWORD?.trim() || "ChangeMe123!";

const agencyAdminEmail = "agencyadmin@northstarstaffing.com";
const agencyAdminPassword = "ChangeMe123!";
const clientManagerEmail = "manager@alphawarehouse.com";
const clientManagerPassword = "ChangeMe123!";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function findAuthUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) throw error;

    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (!data.users.length || data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureAuthUser({ email, password, metadata }) {
  const existing = await findAuthUserByEmail(email);

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      email,
      password,
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        ...metadata,
      },
      email_confirm: true,
    });

    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error || !data.user) {
    throw error ?? new Error(`Could not create auth user for ${email}.`);
  }

  return data.user;
}

async function waitForUserProfile(userId) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
    await wait(400);
  }

  return null;
}

async function ensurePlatformOwner() {
  const authUser = await ensureAuthUser({
    email: platformOwnerEmail,
    password: platformOwnerPassword,
    metadata: {
      role: "platform_owner",
      first_name: "Platform",
      last_name: "Owner",
    },
  });

  const { error } = await supabase.from("users").upsert({
    id: authUser.id,
    agency_id: null,
    role: "platform_owner",
    first_name: "Platform",
    last_name: "Owner",
    email: platformOwnerEmail,
    phone: null,
    status: "active",
    assigned_client_ids: [],
    assigned_site_ids: [],
  });

  if (error) throw error;

  console.log(`Platform owner ready: ${platformOwnerEmail}`);
}

async function ensureAgencyAdmin() {
  const authUser = await ensureAuthUser({
    email: agencyAdminEmail,
    password: agencyAdminPassword,
    metadata: {
      role: "agency_admin",
      agency_name: "Northstar Staffing",
      first_name: "Nina",
      last_name: "North",
      phone: "555-010-1100",
      plan_id: "starter",
    },
  });

  let profile = await waitForUserProfile(authUser.id);

  if (!profile) {
    const slug = "northstar-staffing";
    const { data: existingAgency } = await supabase
      .from("agencies")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    const agency =
      existingAgency ??
      (
        await supabase
          .from("agencies")
          .insert({
            name: "Northstar Staffing",
            slug,
            status: "active",
            created_by: authUser.id,
          })
          .select("*")
          .single()
      ).data;

    if (!agency) {
      throw new Error("Could not create the seeded agency.");
    }

    const { error: userError } = await supabase.from("users").upsert({
      id: authUser.id,
      agency_id: agency.id,
      role: "agency_admin",
      first_name: "Nina",
      last_name: "North",
      email: agencyAdminEmail,
      phone: "555-010-1100",
      status: "active",
      assigned_client_ids: [],
      assigned_site_ids: [],
    });

    if (userError) throw userError;

    const { error: subscriptionError } = await supabase.from("subscriptions").upsert({
      agency_id: agency.id,
      plan_id: "starter",
      status: "trialing",
      worker_limit: 50,
    });

    if (subscriptionError) throw subscriptionError;

    profile = await waitForUserProfile(authUser.id);
  }

  if (!profile?.agency_id) {
    throw new Error("Agency admin profile exists but agency_id is still missing.");
  }

  console.log(`Agency admin ready: ${agencyAdminEmail}`);
  return profile;
}

async function ensureAgencyData(agencyProfile) {
  const agencyId = agencyProfile.agency_id;

  const { data: existingClient } = await supabase
    .from("clients")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("name", "Alpha Warehouse")
    .maybeSingle();

  const client =
    existingClient ??
    (
      await supabase
        .from("clients")
        .insert({
          agency_id: agencyId,
          name: "Alpha Warehouse",
          status: "active",
          contact_name: "Avery Collins",
          contact_email: clientManagerEmail,
          notes: "Main warehouse client for seeded workflow tests.",
          created_by: agencyProfile.id,
        })
        .select("*")
        .single()
    ).data;

  const { data: existingSite } = await supabase
    .from("sites")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("client_id", client.id)
    .eq("name", "Main Warehouse")
    .maybeSingle();

  const site =
    existingSite ??
    (
      await supabase
        .from("sites")
        .insert({
          agency_id: agencyId,
          client_id: client.id,
          name: "Main Warehouse",
          address_line_1: "101 Logistics Park",
          city: "Atlanta",
          state: "GA",
          postal_code: "30303",
          status: "active",
          created_by: agencyProfile.id,
        })
        .select("*")
        .single()
    ).data;

  const { data: existingWorker } = await supabase
    .from("workers")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("first_name", "Brandon")
    .eq("last_name", "Smith")
    .maybeSingle();

  const worker =
    existingWorker ??
    (
      await supabase
        .from("workers")
        .insert({
          agency_id: agencyId,
          first_name: "Brandon",
          last_name: "Smith",
          phone: "5551234821",
          phone_last4: "4821",
          worker_pin: "4821",
          email: null,
          pay_rate: 19.5,
          status: "active",
          assigned_client_id: client.id,
          assigned_site_id: site.id,
          notes: "Seed worker for the primary QR punch flow.",
          created_by: agencyProfile.id,
        })
        .select("*")
        .single()
    ).data;

  const { data: existingAssignment } = await supabase
    .from("assignments")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("worker_id", worker.id)
    .eq("site_id", site.id)
    .eq("status", "active")
    .maybeSingle();

  if (!existingAssignment) {
    const { error } = await supabase.from("assignments").insert({
      agency_id: agencyId,
      worker_id: worker.id,
      client_id: client.id,
      site_id: site.id,
      job_title: "Forklift Operator",
      start_date: new Date().toISOString().slice(0, 10),
      status: "active",
      created_by: agencyProfile.id,
    });

    if (error) throw error;
  }

  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  weekStart.setUTCHours(0, 0, 0, 0);

  const { data: existingPunches } = await supabase
    .from("punches")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("worker_id", worker.id)
    .gte("punched_at", weekStart.toISOString())
    .limit(1);

  if (!existingPunches?.length) {
    const baseDay = new Date(weekStart);
    baseDay.setUTCDate(baseDay.getUTCDate() + 1);
    const timestamps = [
      new Date(baseDay.setUTCHours(12, 0, 0, 0)),
      new Date(baseDay.setUTCHours(16, 0, 0, 0)),
      new Date(baseDay.setUTCHours(16, 30, 0, 0)),
      new Date(baseDay.setUTCHours(21, 0, 0, 0)),
    ];

    const punchTypes = ["clock_in", "start_lunch", "end_lunch", "clock_out"];

    const { error } = await supabase.from("punches").insert(
      punchTypes.map((punchType, index) => ({
        agency_id: agencyId,
        client_id: client.id,
        site_id: site.id,
        worker_id: worker.id,
        worker_name: "Brandon Smith",
        worker_matched: true,
        punch_type: punchType,
        punched_at: timestamps[index].toISOString(),
        local_date: timestamps[index].toISOString().slice(0, 10),
        source: "manual_admin_edit",
        device_info: { seeded: true },
        notes: "Seeded test punch",
        created_by: agencyProfile.id,
        is_manual: true,
      })),
    );

    if (error) throw error;
  }

  return { agencyId, client, site, worker };
}

async function ensureClientManager(agencyId, clientId, siteId) {
  const authUser = await ensureAuthUser({
    email: clientManagerEmail,
    password: clientManagerPassword,
    metadata: {
      role: "client_manager",
      agency_id: agencyId,
      first_name: "Avery",
      last_name: "Collins",
      phone: "555-010-2200",
      assigned_client_ids: [clientId],
      assigned_site_ids: [siteId],
    },
  });

  const { error } = await supabase.from("users").upsert({
    id: authUser.id,
    agency_id: agencyId,
    role: "client_manager",
    first_name: "Avery",
    last_name: "Collins",
    email: clientManagerEmail,
    phone: "555-010-2200",
    status: "active",
    assigned_client_ids: [clientId],
    assigned_site_ids: [siteId],
  });

  if (error) throw error;

  console.log(`Client manager ready: ${clientManagerEmail}`);
}

async function main() {
  await ensurePlatformOwner();
  const agencyAdminProfile = await ensureAgencyAdmin();
  const seedData = await ensureAgencyData(agencyAdminProfile);
  await ensureClientManager(seedData.agencyId, seedData.client.id, seedData.site.id);

  console.log("");
  console.log("Seed complete.");
  console.log(`Platform Owner: ${platformOwnerEmail} / ${platformOwnerPassword}`);
  console.log(`Agency Admin: ${agencyAdminEmail} / ${agencyAdminPassword}`);
  console.log(`Client Manager: ${clientManagerEmail} / ${clientManagerPassword}`);
  console.log(`Worker QR route: /clock?agencyId=${seedData.agencyId}&clientId=${seedData.client.id}&siteId=${seedData.site.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
