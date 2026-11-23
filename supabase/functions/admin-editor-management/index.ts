/// <reference lib="deno.ns" />
// Edge Function `admin-editor-management` (Etapa 10.5).
//
// Única parte do sistema que usa a API administrativa do Supabase Auth e a
// chave secreta (disponível apenas nos secrets padrão da função; nunca no
// Worker nem no navegador). Fluxo:
//
// 1. `verify_jwt` (plataforma) e `withSupabase({ auth: "user" })` validam o
//    JWT da sessão do painel; sem JWT válido a função responde 401.
// 2. O núcleo (`_shared/editor-accounts.ts`) consulta o vínculo atual em
//    `admin_memberships` e só então executa uma das operações da lista
//    fechada. O papel enviado pelo navegador nunca é lido.
// 3. Senhas vão apenas para o Supabase Auth; os logs têm só códigos.

import { withSupabase } from "npm:@supabase/server@1.9.2";
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.118.0";

import {
  handleEditorRequest,
  httpStatusFor,
  type AuthAdminPort,
  type AuthFailure,
  type AuthUser,
  type Membership,
  type StoredEvent,
  type StorePort,
} from "../_shared/editor-accounts.ts";

const MEMBERSHIP_COLUMNS = "user_id, role, is_active, must_change_password, password_change_required_at, created_at";
const LIST_PAGE_SIZE = 1000;
const LIST_MAX_PAGES = 20;

type MembershipRow = {
  user_id: string;
  role: string;
  is_active: boolean;
  must_change_password: boolean;
  password_change_required_at: string | null;
  created_at: string;
};

type EventRow = {
  id: number;
  created_at: string;
  actor_user_id: string | null;
  target_user_id: string | null;
  target_email: string | null;
  event_type: StoredEvent["type"];
  outcome: StoredEvent["outcome"];
  detail: string | null;
};

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    createdAt: user.created_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
    appMetadata: (user.app_metadata ?? {}) as Record<string, unknown>,
  };
}

function toMembership(row: MembershipRow): Membership {
  return {
    userId: row.user_id,
    role: row.role,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    passwordChangeRequiredAt: row.password_change_required_at,
    createdAt: row.created_at,
  };
}

function authFailure(error: { code?: string; status?: number }): AuthFailure {
  if (error.code === "email_exists" || error.code === "user_already_exists") return "email-exists";
  if (error.code === "weak_password") return "weak-password";
  if (error.status === 429 || error.code === "over_request_rate_limit") return "rate-limited";
  return "unexpected";
}

function publishableKey(): string {
  const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}") as Record<string, string>;
  const key = keys.default;
  if (!key) throw new Error("publishable key unavailable");
  return key;
}

function authPort(admin: SupabaseClient): AuthAdminPort {
  return {
    async listUsers() {
      const users: AuthUser[] = [];
      for (let page = 1; page <= LIST_MAX_PAGES; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: LIST_PAGE_SIZE });
        if (error) throw new Error(`auth list failed: ${error.code ?? error.status}`);
        users.push(...data.users.map(toAuthUser));
        if (data.users.length < LIST_PAGE_SIZE) break;
      }
      return users;
    },
    async getUser(id) {
      const { data, error } = await admin.auth.admin.getUserById(id);
      if (error) {
        if (error.status === 404 || error.code === "user_not_found") return null;
        throw new Error(`auth get failed: ${error.code ?? error.status}`);
      }
      return data.user ? toAuthUser(data.user) : null;
    },
    async createUser({ email, password, appMetadata }) {
      // email_confirm: confirmação administrativa (sem link nem e-mail).
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: appMetadata,
      });
      if (error || !data.user) {
        console.warn("[editors] Auth recusou a criação:", error?.code ?? error?.status ?? "no-user");
        return { error: error ? authFailure(error) : "unexpected" };
      }
      return { user: toAuthUser(data.user) };
    },
    async updateUser(id, { password, appMetadata }) {
      const { error } = await admin.auth.admin.updateUserById(id, {
        ...(password !== undefined ? { password } : {}),
        ...(appMetadata !== undefined ? { app_metadata: appMetadata } : {}),
      });
      if (error) {
        console.warn("[editors] Auth recusou a alteração:", error.code ?? error.status);
        return { error: authFailure(error) };
      }
      return {};
    },
    async passwordMatches(email, password) {
      // Cliente descartável (sem armazenamento): a sessão aberta pela
      // conferência é encerrada imediatamente.
      const probe = createClient(Deno.env.get("SUPABASE_URL")!, publishableKey(), {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data, error } = await probe.auth.signInWithPassword({ email, password });
      if (data.session) {
        await probe.auth.signOut({ scope: "local" });
        return true;
      }
      if (error?.code === "invalid_credentials") return false;
      console.warn("[editors] Conferência de senha indisponível:", error?.code ?? error?.status ?? "no-session");
      return "error";
    },
  };
}

function storePort(admin: SupabaseClient): StorePort {
  return {
    async getMembership(userId) {
      const { data, error } = await admin
        .from("admin_memberships")
        .select(MEMBERSHIP_COLUMNS)
        .eq("user_id", userId)
        .maybeSingle<MembershipRow>();
      if (error) throw new Error(`membership read failed: ${error.code}`);
      return data ? toMembership(data) : null;
    },
    async listMemberships() {
      const { data, error } = await admin.from("admin_memberships").select(MEMBERSHIP_COLUMNS).returns<MembershipRow[]>();
      if (error) throw new Error(`membership list failed: ${error.code}`);
      return (data ?? []).map(toMembership);
    },
    async insertEditorMembership(userId, requiredAt) {
      const { error } = await admin.from("admin_memberships").insert({
        user_id: userId,
        role: "editor",
        is_active: true,
        must_change_password: true,
        password_change_required_at: requiredAt,
      });
      if (error) throw new Error(`membership insert failed: ${error.code}`);
    },
    async updateMembership(userId, patch) {
      const values: Record<string, unknown> = {};
      if (patch.isActive !== undefined) values.is_active = patch.isActive;
      if (patch.mustChangePassword !== undefined) values.must_change_password = patch.mustChangePassword;
      if (patch.passwordChangeRequiredAt !== undefined) values.password_change_required_at = patch.passwordChangeRequiredAt;
      // Defesa extra: este módulo nunca altera vínculos de administradores.
      const { data, error } = await admin
        .from("admin_memberships")
        .update(values)
        .eq("user_id", userId)
        .eq("role", "editor")
        .select("user_id");
      if (error) throw new Error(`membership update failed: ${error.code}`);
      if (!data || data.length !== 1) throw new Error("membership update matched no editor");
    },
    async countRecentEvents(actorUserId, sinceIso, outcome) {
      let query = admin
        .from("admin_user_events")
        .select("id", { count: "exact", head: true })
        .eq("actor_user_id", actorUserId)
        .gte("created_at", sinceIso);
      if (outcome) query = query.eq("outcome", outcome);
      const { count, error } = await query;
      if (error) throw new Error(`event count failed: ${error.code}`);
      return count ?? 0;
    },
    async recordEvent(event) {
      const { error } = await admin.from("admin_user_events").insert({
        actor_user_id: event.actorUserId,
        target_user_id: event.targetUserId,
        target_email: event.targetEmail,
        event_type: event.type,
        outcome: event.outcome,
        detail: event.detail ?? null,
      });
      if (error) throw new Error(`event insert failed: ${error.code}`);
    },
    async listEvents(limit) {
      const { data, error } = await admin
        .from("admin_user_events")
        .select("id, created_at, actor_user_id, target_user_id, target_email, event_type, outcome, detail")
        .order("created_at", { ascending: false })
        .limit(limit)
        .returns<EventRow[]>();
      if (error) throw new Error(`event list failed: ${error.code}`);
      return (data ?? []).map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        actorUserId: row.actor_user_id,
        targetUserId: row.target_user_id,
        targetEmail: row.target_email,
        type: row.event_type,
        outcome: row.outcome,
        detail: row.detail ?? undefined,
      }));
    },
  };
}

const handler = {
  // Chamada apenas pelo servidor do painel (Server Actions): sem CORS, o
  // navegador de outros sites não recebe resposta legível.
  fetch: withSupabase({ auth: "user", cors: "disabled" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ ok: false, code: "bad-request" }, { status: 405 });
    }
    const callerId = ctx.userClaims?.id;
    if (!callerId) return Response.json({ ok: false, code: "forbidden" }, { status: 401 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ ok: false, code: "bad-request" }, { status: 400 });
    }

    const admin = ctx.supabaseAdmin as unknown as SupabaseClient;
    const result = await handleEditorRequest(
      {
        auth: authPort(admin),
        store: storePort(admin),
        now: () => new Date(),
        log: (message, code) => console.error(message, code),
      },
      { id: callerId, email: typeof ctx.userClaims?.email === "string" ? ctx.userClaims.email : null },
      body,
    );
    return Response.json(result, {
      status: httpStatusFor(result),
      headers: { "Cache-Control": "no-store" },
    });
  }),
};

export default handler;
