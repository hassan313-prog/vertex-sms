import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Server configuration is incomplete" }, 500);
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Authentication required" }, 401);

  const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return json({ error: "Invalid session" }, 401);
  const actorId = auth.user.id;

  const { data: actor, error: actorError } = await db.from("profiles")
    .select("id,role,is_active").eq("id", actorId).maybeSingle();
  if (actorError || !actor || actor.is_active === false) return json({ error: "Active account required" }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid request body" }, 400); }
  const action = String(body.action || "create");

  const allowedChild: Record<string, string> = { admin: "manager", manager: "agent", agent: "client" };
  const managedRole = allowedChild[actor.role];
  if (!managedRole) return json({ error: "Clients cannot manage accounts" }, 403);

  if (action === "create") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const displayName = String(body.display_name || "").trim();
    const companyName = String(body.company_name || "").trim() || null;
    const role = String(body.role || "");
    if (role !== managedRole) return json({ error: `Your role can create ${managedRole} accounts only` }, 403);
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Valid email address required" }, 400);
    if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
    if (!displayName) return json({ error: "Name is required" }, 400);

    const { data: created, error: createError } = await db.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { display_name: displayName, company_name: companyName || "" },
    });
    if (createError || !created.user) return json({ error: createError?.message || "Account could not be created" }, 400);
    const userId = created.user.id;
    const { error: profileError } = await db.from("profiles").upsert({
      id: userId, email, display_name: displayName, role,
      company_name: companyName, parent_id: actor.role === "admin" ? null : actorId,
      is_active: true,
    }, { onConflict: "id" });
    if (profileError) {
      await db.auth.admin.deleteUser(userId);
      return json({ error: profileError.message }, 400);
    }
    const { error: walletError } = await db.from("wallets").upsert({
      user_id: userId, balance: 0, currency: "USD",
    }, { onConflict: "user_id", ignoreDuplicates: true });
    if (walletError) {
      await db.from("profiles").delete().eq("id", userId);
      await db.auth.admin.deleteUser(userId);
      return json({ error: walletError.message }, 400);
    }
    await db.from("audit_logs").insert({
      actor_id: actorId, action: "account.create", entity_type: "profile", entity_id: userId,
      details: { email, role, parent_id: actor.role === "admin" ? null : actorId },
    });
    return json({ success: true, user: { id: userId, email, display_name: displayName, role } }, 201);
  }

  const targetId = String(body.user_id || "");
  if (!targetId) return json({ error: "Account ID is required" }, 400);
  const { data: target, error: targetError } = await db.from("profiles")
    .select("id,email,role,parent_id,is_active").eq("id", targetId).maybeSingle();
  if (targetError || !target || target.is_active === false) return json({ error: "Account not found or already disabled" }, 404);
  if (target.role !== managedRole || (actor.role !== "admin" && target.parent_id !== actorId)) {
    return json({ error: "You can manage only your directly assigned " + managedRole + " accounts" }, 403);
  }

  if (action === "disable") {
    const { data: disabledIds, error } = await db.rpc("disable_hierarchy_account", { p_target_user_id: targetId });
    if (error) return json({ error: error.message }, 400);
    const ids = Array.isArray(disabledIds) ? disabledIds : [targetId];
    const banResults = await Promise.all(ids.map((id: string) =>
      db.auth.admin.updateUserById(id, { ban_duration: "876000h" })
    ));
    const banWarning = banResults.some(result => result.error);
    return json({ success: true, disabled_user_ids: ids, auth_ban_warning: banWarning });
  }

  if (action === "update") {
    const displayName = String(body.display_name || "").trim();
    const companyName = String(body.company_name || "").trim() || null;
    const email = String(body.email || "").trim().toLowerCase();
    if (!displayName || !/^\S+@\S+\.\S+$/.test(email)) {
      return json({ error: "Valid name and email are required" }, 400);
    }
    const { error: authUpdateError } = await db.auth.admin.updateUserById(targetId, { email, email_confirm: true });
    if (authUpdateError) return json({ error: authUpdateError.message }, 400);
    const { error: profileUpdateError } = await db.from("profiles")
      .update({ email, display_name: displayName, company_name: companyName, updated_at: new Date().toISOString() })
      .eq("id", targetId);
    if (profileUpdateError) return json({ error: profileUpdateError.message }, 400);
    await db.from("audit_logs").insert({
      actor_id: actorId, action: "account.update", entity_type: "profile", entity_id: targetId,
      details: { email, role: target.role },
    });
    return json({ success: true });
  }

  return json({ error: "Unsupported action" }, 400);
});
