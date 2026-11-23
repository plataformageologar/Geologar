/**
 * Núcleo do gerenciamento de contas de Editor (Etapa 10.5).
 *
 * Código puro, sem dependências: a Edge Function `admin-editor-management`
 * injeta o acesso ao Supabase Auth (API administrativa) e ao banco
 * (service_role), e os testes unitários injetam implementações falsas. O
 * painel (Next.js) reutiliza as validações de e-mail e senha.
 *
 * Regras centrais:
 * - lista fechada de operações; o papel das novas contas é sempre `editor`;
 * - o chamador é identificado pelo JWT validado na borda e autorizado pelo
 *   vínculo atual em `admin_memberships` (nunca por dados do navegador);
 * - administradores nunca são alterados por este módulo;
 * - senhas só passam para o Supabase Auth: nunca são gravadas, registradas
 *   em log nem devolvidas.
 */

// -----------------------------------------------------------------------------
// Validação compartilhada
// -----------------------------------------------------------------------------

export const PASSWORD_MIN_LENGTH = 12;
/** Limite do bcrypt usado pelo Supabase Auth (bytes em UTF-8). */
export const PASSWORD_MAX_BYTES = 72;
export const EMAIL_MAX_LENGTH = 254;
export const EDITORS_PAGE_SIZE = 20;
export const SEARCH_MAX_LENGTH = 100;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** E-mail sem espaços nas extremidades e em minúsculas, ou `null` se inválido. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

export type PasswordProblem = "too-short" | "too-long" | "weak" | "contains-email";

/**
 * Política de senha do CMS: pelo menos 12 caracteres, no máximo 72 bytes,
 * três dos quatro tipos (minúscula, maiúscula, número, símbolo) e sem conter
 * a parte local do e-mail. O Supabase Auth aplica, além disso, a própria
 * configuração do projeto.
 */
export function passwordProblem(password: string, email?: string | null): PasswordProblem | null {
  if ([...password].length < PASSWORD_MIN_LENGTH) return "too-short";
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return "too-long";
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password));
  if (classes.length < 3) return "weak";
  const local = email?.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && password.toLowerCase().includes(local)) return "contains-email";
  return null;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

// -----------------------------------------------------------------------------
// Contrato da Edge Function
// -----------------------------------------------------------------------------

export const EDITOR_OPERATIONS = [
  "list-editors",
  "create-editor",
  "deactivate-editor",
  "reactivate-editor",
  "reset-editor-password",
  "complete-initial-password",
] as const;
export type EditorOperation = (typeof EDITOR_OPERATIONS)[number];

export const EDITOR_FILTERS = ["all", "active", "inactive", "pending"] as const;
export type EditorFilter = (typeof EDITOR_FILTERS)[number];

export type EditorRequest =
  | { operation: "list-editors"; search: string; filter: EditorFilter; page: number }
  | { operation: "create-editor"; email: string; password: string; confirmation: string }
  | { operation: "deactivate-editor" | "reactivate-editor"; userId: string }
  | { operation: "reset-editor-password"; userId: string; password: string; confirmation: string }
  | { operation: "complete-initial-password"; password: string; confirmation: string };

export type ErrorCode =
  | "bad-request"
  | "forbidden"
  | "password-change-required"
  | "invalid-email"
  | "password-mismatch"
  | "weak-password"
  | "same-password"
  | "already-active"
  | "already-inactive"
  | "is-admin"
  | "existing-account"
  | "conflict"
  | "not-found"
  | "not-editor"
  | "rate-limited"
  | "auth-error"
  | "membership-failed"
  | "finalize-failed"
  | "unexpected";

export type EditorListItem = {
  id: string;
  email: string;
  /** `incomplete`: conta criada por este módulo cujo vínculo não foi gravado. */
  state: "active" | "inactive" | "incomplete";
  mustChangePassword: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
};

export type EditorEventItem = {
  id: number;
  createdAt: string;
  type: EventType;
  outcome: "success" | "failure";
  actorEmail: string | null;
  targetEmail: string | null;
};

export type EditorList = {
  items: EditorListItem[];
  total: number;
  page: number;
  pageSize: number;
  events: EditorEventItem[];
};

export type EditorResult =
  | { ok: true; operation: "list-editors"; list: EditorList }
  | { ok: true; operation: Exclude<EditorOperation, "list-editors">; email?: string; recovered?: boolean; unchanged?: boolean }
  | { ok: false; code: ErrorCode; passwordChanged?: boolean; problem?: PasswordProblem };

function text(value: unknown, max = 1024): string | null {
  return typeof value === "string" && value.length <= max ? value : null;
}

/** Valida o corpo da requisição. Qualquer operação ou campo fora do contrato é recusado. */
export function parseEditorRequest(body: unknown): EditorRequest | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  const operation = input.operation;

  switch (operation) {
    case "list-editors": {
      const search = input.search === undefined ? "" : text(input.search, SEARCH_MAX_LENGTH);
      const filter = input.filter === undefined ? "all" : input.filter;
      const page = input.page === undefined ? 1 : input.page;
      if (search === null || !EDITOR_FILTERS.includes(filter as EditorFilter)) return null;
      if (typeof page !== "number" || !Number.isInteger(page) || page < 1 || page > 10_000) return null;
      return { operation, search: search.trim().toLowerCase(), filter: filter as EditorFilter, page };
    }
    case "create-editor": {
      const email = text(input.email, 1024);
      const password = text(input.password);
      const confirmation = text(input.confirmation);
      if (email === null || password === null || confirmation === null) return null;
      return { operation, email, password, confirmation };
    }
    case "deactivate-editor":
    case "reactivate-editor":
      return isUuid(input.userId) ? { operation, userId: input.userId.toLowerCase() } : null;
    case "reset-editor-password": {
      const password = text(input.password);
      const confirmation = text(input.confirmation);
      if (!isUuid(input.userId) || password === null || confirmation === null) return null;
      return { operation, userId: input.userId.toLowerCase(), password, confirmation };
    }
    case "complete-initial-password": {
      const password = text(input.password);
      const confirmation = text(input.confirmation);
      if (password === null || confirmation === null) return null;
      return { operation, password, confirmation };
    }
    default:
      return null;
  }
}

// -----------------------------------------------------------------------------
// Portas (implementadas pela Edge Function e pelos testes)
// -----------------------------------------------------------------------------

export type AuthUser = {
  id: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  appMetadata: Record<string, unknown>;
};

export type AuthFailure = "email-exists" | "weak-password" | "rate-limited" | "unexpected";

export interface AuthAdminPort {
  /** Todas as contas do Auth (paginado internamente, com limite). Lança em caso de falha. */
  listUsers(): Promise<AuthUser[]>;
  /** Lança em caso de falha; `null` quando a conta não existe. */
  getUser(id: string): Promise<AuthUser | null>;
  createUser(input: {
    email: string;
    password: string;
    appMetadata: Record<string, unknown>;
  }): Promise<{ user: AuthUser } | { error: AuthFailure }>;
  updateUser(
    id: string,
    input: { password?: string; appMetadata?: Record<string, unknown> },
  ): Promise<{ error?: AuthFailure }>;
  /** Confere se a senha é a atual da conta (entrada descartável, sessão encerrada em seguida). */
  passwordMatches(email: string, password: string): Promise<boolean | "error">;
}

export type Membership = {
  userId: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  passwordChangeRequiredAt: string | null;
  createdAt: string;
};

export type EventType =
  | "editor_created"
  | "editor_deactivated"
  | "editor_reactivated"
  | "editor_password_reset"
  | "initial_password_changed";

export type NewEvent = {
  actorUserId: string | null;
  targetUserId: string | null;
  targetEmail: string | null;
  type: EventType;
  outcome: "success" | "failure";
  detail?: string;
};

export type StoredEvent = NewEvent & { id: number; createdAt: string };

export interface StorePort {
  /** Lança em caso de falha (o acesso nunca é concedido por falha). */
  getMembership(userId: string): Promise<Membership | null>;
  listMemberships(): Promise<Membership[]>;
  insertEditorMembership(userId: string, requiredAt: string): Promise<void>;
  updateMembership(
    userId: string,
    patch: { isActive?: boolean; mustChangePassword?: boolean; passwordChangeRequiredAt?: string | null },
  ): Promise<void>;
  countRecentEvents(actorUserId: string, sinceIso: string, outcome?: "failure"): Promise<number>;
  recordEvent(event: NewEvent): Promise<void>;
  listEvents(limit: number): Promise<StoredEvent[]>;
}

export type Caller = { id: string; email: string | null };

export type EditorDeps = {
  auth: AuthAdminPort;
  store: StorePort;
  now: () => Date;
  /** Registro técnico: apenas códigos (nunca senhas, e-mails ou tokens). */
  log: (message: string, code: string) => void;
};

/** Marcadores em `app_metadata` (somente a API administrativa os altera). */
export const META_MANAGED = "geologar_managed";
export const META_PASSWORD_SET_AT = "geologar_password_set_at";
export const META_PASSWORD_CHANGED_AT = "geologar_password_changed_at";

/** Limites de operações por conta (proteção contra repetição e abuso). */
export const ADMIN_OPERATIONS_PER_HOUR = 30;
export const PASSWORD_CHANGE_FAILURES_PER_HOUR = 10;

// -----------------------------------------------------------------------------
// Operações
// -----------------------------------------------------------------------------

const fail = (code: ErrorCode, extra: { passwordChanged?: boolean; problem?: PasswordProblem } = {}): EditorResult => ({
  ok: false,
  code,
  ...extra,
});

function timestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

async function record(deps: EditorDeps, event: NewEvent) {
  try {
    await deps.store.recordEvent(event);
  } catch (error) {
    // O histórico não pode mascarar o resultado da operação.
    deps.log("[editors] Evento não registrado", error instanceof Error ? error.name : "unknown");
  }
}

function checkPasswords(password: string, confirmation: string, email: string | null): EditorResult | null {
  if (password !== confirmation) return fail("password-mismatch");
  const problem = passwordProblem(password, email);
  return problem ? fail("weak-password", { problem }) : null;
}

async function rateLimited(deps: EditorDeps, actorId: string, perHour: number, outcome?: "failure") {
  const since = new Date(deps.now().getTime() - 60 * 60 * 1000).toISOString();
  return (await deps.store.countRecentEvents(actorId, since, outcome)) >= perHour;
}

async function emailOf(deps: EditorDeps, userId: string): Promise<string | null> {
  try {
    return (await deps.auth.getUser(userId))?.email ?? null;
  } catch {
    return null;
  }
}

async function listEditors(
  deps: EditorDeps,
  request: Extract<EditorRequest, { operation: "list-editors" }>,
): Promise<EditorResult> {
  const [users, memberships, events] = await Promise.all([
    deps.auth.listUsers(),
    deps.store.listMemberships(),
    deps.store.listEvents(15),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const membershipIds = new Set(memberships.map((membership) => membership.userId));

  const editors: EditorListItem[] = memberships
    .filter((membership) => membership.role === "editor")
    .map((membership) => {
      const user = usersById.get(membership.userId);
      return {
        id: membership.userId,
        email: user?.email ?? "(conta sem e-mail)",
        state: membership.isActive ? "active" : "inactive",
        mustChangePassword: membership.mustChangePassword,
        createdAt: membership.createdAt,
        lastSignInAt: user?.lastSignInAt ?? null,
      } satisfies EditorListItem;
    });

  // Contas criadas por este módulo sem vínculo (falha parcial): aparecem para
  // que o administrador conclua o cadastro repetindo "Adicionar Editor".
  for (const user of users) {
    if (user.appMetadata[META_MANAGED] === true && !membershipIds.has(user.id)) {
      editors.push({
        id: user.id,
        email: user.email ?? "(conta sem e-mail)",
        state: "incomplete",
        mustChangePassword: true,
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
      });
    }
  }

  const filtered = editors
    .filter((item) => {
      if (request.filter === "active") return item.state === "active";
      if (request.filter === "inactive") return item.state === "inactive";
      if (request.filter === "pending") return item.mustChangePassword && item.state !== "inactive";
      return true;
    })
    .filter((item) => !request.search || item.email.includes(request.search))
    .sort((a, b) => a.email.localeCompare(b.email));

  const start = (request.page - 1) * EDITORS_PAGE_SIZE;
  return {
    ok: true,
    operation: "list-editors",
    list: {
      items: filtered.slice(start, start + EDITORS_PAGE_SIZE),
      total: filtered.length,
      page: request.page,
      pageSize: EDITORS_PAGE_SIZE,
      events: events.map((event) => ({
        id: event.id,
        createdAt: event.createdAt,
        type: event.type,
        outcome: event.outcome,
        actorEmail: event.actorUserId ? (usersById.get(event.actorUserId)?.email ?? null) : null,
        targetEmail: event.targetEmail,
      })),
    },
  };
}

async function createEditor(
  deps: EditorDeps,
  caller: Caller,
  request: Extract<EditorRequest, { operation: "create-editor" }>,
): Promise<EditorResult> {
  const email = normalizeEmail(request.email);
  if (!email) return fail("invalid-email");
  const invalid = checkPasswords(request.password, request.confirmation, email);
  if (invalid) return invalid;
  if (await rateLimited(deps, caller.id, ADMIN_OPERATIONS_PER_HOUR)) return fail("rate-limited");

  const base = { actorUserId: caller.id, targetEmail: email, type: "editor_created" as const };
  const requiredAt = deps.now().toISOString();
  const existing = (await deps.auth.listUsers()).find((user) => user.email?.toLowerCase() === email);

  if (existing) {
    const membership = await deps.store.getMembership(existing.id);
    if (membership?.role === "admin") return fail("is-admin");
    if (membership) return fail(membership.isActive ? "already-active" : "already-inactive");

    // Conta do Auth sem vínculo. Só uma conta criada por este módulo (falha
    // parcial anterior) é concluída; qualquer outra exige verificação manual
    // e nunca tem a senha alterada aqui.
    if (existing.appMetadata[META_MANAGED] !== true) {
      await record(deps, { ...base, targetUserId: existing.id, outcome: "failure", detail: "existing_account" });
      return fail("existing-account");
    }
    const updated = await deps.auth.updateUser(existing.id, {
      password: request.password,
      appMetadata: { [META_PASSWORD_SET_AT]: requiredAt, [META_PASSWORD_CHANGED_AT]: null },
    });
    if (updated.error) {
      await record(deps, { ...base, targetUserId: existing.id, outcome: "failure", detail: `recover:auth_${updated.error}` });
      return updated.error === "weak-password" ? fail("weak-password") : fail("auth-error");
    }
    try {
      await deps.store.insertEditorMembership(existing.id, requiredAt);
    } catch (error) {
      deps.log("[editors] Vínculo não gravado (recuperação)", error instanceof Error ? error.name : "unknown");
      await record(deps, { ...base, targetUserId: existing.id, outcome: "failure", detail: "recover:membership" });
      return fail("membership-failed");
    }
    await record(deps, { ...base, targetUserId: existing.id, outcome: "success", detail: "recovered" });
    return { ok: true, operation: "create-editor", email, recovered: true };
  }

  const created = await deps.auth.createUser({
    email,
    password: request.password,
    appMetadata: { [META_MANAGED]: true, [META_PASSWORD_SET_AT]: requiredAt },
  });
  if ("error" in created) {
    if (created.error === "email-exists") return fail("conflict");
    await record(deps, { ...base, targetUserId: null, outcome: "failure", detail: `auth_${created.error}` });
    if (created.error === "weak-password") return fail("weak-password");
    if (created.error === "rate-limited") return fail("rate-limited");
    return fail("auth-error");
  }

  try {
    await deps.store.insertEditorMembership(created.user.id, requiredAt);
  } catch (error) {
    // Sem vínculo a conta não acessa o CMS. Repetir o cadastro com o mesmo
    // e-mail conclui a configuração (ramo de recuperação acima).
    deps.log("[editors] Vínculo não gravado", error instanceof Error ? error.name : "unknown");
    await record(deps, { ...base, targetUserId: created.user.id, outcome: "failure", detail: "membership" });
    return fail("membership-failed");
  }
  await record(deps, { ...base, targetUserId: created.user.id, outcome: "success" });
  return { ok: true, operation: "create-editor", email };
}

async function editorTarget(deps: EditorDeps, caller: Caller, userId: string) {
  if (userId === caller.id) return { error: fail("forbidden") };
  const membership = await deps.store.getMembership(userId);
  if (!membership) return { error: fail("not-found") };
  // Administradores (e qualquer papel que não seja editor) ficam fora do módulo.
  if (membership.role !== "editor") return { error: fail("not-editor") };
  return { membership };
}

async function setEditorActive(
  deps: EditorDeps,
  caller: Caller,
  request: Extract<EditorRequest, { operation: "deactivate-editor" | "reactivate-editor" }>,
): Promise<EditorResult> {
  const target = await editorTarget(deps, caller, request.userId);
  if (target.error) return target.error;
  const active = request.operation === "reactivate-editor";
  if (target.membership.isActive === active) return { ok: true, operation: request.operation, unchanged: true };
  if (await rateLimited(deps, caller.id, ADMIN_OPERATIONS_PER_HOUR)) return fail("rate-limited");

  const event = {
    actorUserId: caller.id,
    targetUserId: request.userId,
    targetEmail: await emailOf(deps, request.userId),
    type: active ? ("editor_reactivated" as const) : ("editor_deactivated" as const),
  };
  try {
    // A exigência de troca de senha não muda ao reativar.
    await deps.store.updateMembership(request.userId, { isActive: active });
  } catch (error) {
    deps.log("[editors] Situação não alterada", error instanceof Error ? error.name : "unknown");
    await record(deps, { ...event, outcome: "failure", detail: "membership" });
    return fail("unexpected");
  }
  await record(deps, { ...event, outcome: "success" });
  return { ok: true, operation: request.operation, email: event.targetEmail ?? undefined };
}

async function resetEditorPassword(
  deps: EditorDeps,
  caller: Caller,
  request: Extract<EditorRequest, { operation: "reset-editor-password" }>,
): Promise<EditorResult> {
  const target = await editorTarget(deps, caller, request.userId);
  if (target.error) return target.error;
  const user = await deps.auth.getUser(request.userId);
  if (!user) return fail("not-found");
  const invalid = checkPasswords(request.password, request.confirmation, user.email);
  if (invalid) return invalid;
  if (await rateLimited(deps, caller.id, ADMIN_OPERATIONS_PER_HOUR)) return fail("rate-limited");

  const event = {
    actorUserId: caller.id,
    targetUserId: request.userId,
    targetEmail: user.email,
    type: "editor_password_reset" as const,
  };
  const requiredAt = deps.now().toISOString();

  // 1. Exige a troca ANTES de alterar a senha: se o Auth falhar, a conta fica
  //    apenas bloqueada até o Editor definir uma senha própria (lado seguro).
  try {
    await deps.store.updateMembership(request.userId, {
      mustChangePassword: true,
      passwordChangeRequiredAt: requiredAt,
    });
  } catch (error) {
    deps.log("[editors] Exigência de troca não gravada", error instanceof Error ? error.name : "unknown");
    await record(deps, { ...event, outcome: "failure", detail: "membership" });
    return fail("unexpected");
  }

  // 2. Nova senha inicial (o Supabase Auth encerra as sessões da conta).
  const updated = await deps.auth.updateUser(request.userId, {
    password: request.password,
    appMetadata: { [META_PASSWORD_SET_AT]: requiredAt, [META_PASSWORD_CHANGED_AT]: null },
  });
  if (updated.error) {
    await record(deps, { ...event, outcome: "failure", detail: `auth_${updated.error}` });
    return updated.error === "weak-password" ? fail("weak-password") : fail("auth-error");
  }
  await record(deps, { ...event, outcome: "success" });
  return { ok: true, operation: "reset-editor-password", email: user.email ?? undefined };
}

async function completeInitialPassword(
  deps: EditorDeps,
  caller: Caller,
  membership: Membership,
  request: Extract<EditorRequest, { operation: "complete-initial-password" }>,
): Promise<EditorResult> {
  if (!membership.mustChangePassword) return { ok: true, operation: request.operation, unchanged: true };

  const user = await deps.auth.getUser(caller.id);
  if (!user) return fail("unexpected");
  const email = user.email ?? caller.email;
  const event = {
    actorUserId: caller.id,
    targetUserId: caller.id,
    targetEmail: email,
    type: "initial_password_changed" as const,
  };

  const finalize = async (): Promise<EditorResult> => {
    try {
      await deps.store.updateMembership(caller.id, { mustChangePassword: false, passwordChangeRequiredAt: null });
    } catch (error) {
      deps.log("[editors] Troca de senha não concluída no banco", error instanceof Error ? error.name : "unknown");
      await record(deps, { ...event, outcome: "failure", detail: "finalize" });
      return fail("finalize-failed", { passwordChanged: true });
    }
    await record(deps, { ...event, outcome: "success" });
    return { ok: true, operation: request.operation };
  };

  // Nova tentativa depois de uma falha parcial: a troca já foi registrada no
  // Auth depois da exigência atual, então basta concluir no banco (sem pedir
  // de novo uma senha que já foi substituída).
  const changedAt = timestamp(user.appMetadata[META_PASSWORD_CHANGED_AT]);
  const requiredAt = timestamp(membership.passwordChangeRequiredAt);
  if (changedAt !== null && requiredAt !== null && changedAt > requiredAt) return finalize();

  const invalid = checkPasswords(request.password, request.confirmation, email);
  if (invalid) return invalid;
  if (!email) return fail("unexpected");
  if (await rateLimited(deps, caller.id, PASSWORD_CHANGE_FAILURES_PER_HOUR, "failure")) return fail("rate-limited");

  // A nova senha precisa ser diferente da senha inicial (conhecida pelo administrador).
  const same = await deps.auth.passwordMatches(email, request.password);
  if (same === "error") {
    await record(deps, { ...event, outcome: "failure", detail: "auth_check" });
    return fail("auth-error");
  }
  if (same) {
    await record(deps, { ...event, outcome: "failure", detail: "same_password" });
    return fail("same-password");
  }

  const updated = await deps.auth.updateUser(caller.id, {
    password: request.password,
    appMetadata: { [META_PASSWORD_CHANGED_AT]: deps.now().toISOString() },
  });
  if (updated.error) {
    await record(deps, { ...event, outcome: "failure", detail: `auth_${updated.error}` });
    if (updated.error === "weak-password") return fail("weak-password");
    if (updated.error === "rate-limited") return fail("rate-limited");
    return fail("auth-error");
  }
  return finalize();
}

/**
 * Ponto de entrada: autoriza o chamador pelo vínculo atual e executa a
 * operação. Falhas inesperadas (banco ou Auth indisponíveis) resultam em
 * `unexpected`, nunca em acesso concedido.
 */
export async function handleEditorRequest(deps: EditorDeps, caller: Caller, body: unknown): Promise<EditorResult> {
  const request = parseEditorRequest(body);
  if (!request) return fail("bad-request");

  try {
    const membership = await deps.store.getMembership(caller.id);
    if (!membership || !membership.isActive) return fail("forbidden");

    if (request.operation === "complete-initial-password") {
      return await completeInitialPassword(deps, caller, membership, request);
    }

    if (membership.role !== "admin") return fail("forbidden");
    if (membership.mustChangePassword) return fail("password-change-required");

    switch (request.operation) {
      case "list-editors":
        return await listEditors(deps, request);
      case "create-editor":
        return await createEditor(deps, caller, request);
      case "deactivate-editor":
      case "reactivate-editor":
        return await setEditorActive(deps, caller, request);
      case "reset-editor-password":
        return await resetEditorPassword(deps, caller, request);
    }
  } catch (error) {
    deps.log("[editors] Falha inesperada", error instanceof Error ? error.name : "unknown");
    return fail("unexpected");
  }
}

/** Status HTTP da resposta da Edge Function para cada resultado. */
export function httpStatusFor(result: EditorResult): number {
  if (result.ok) return 200;
  if (result.code === "bad-request") return 400;
  if (result.code === "forbidden" || result.code === "password-change-required") return 403;
  if (result.code === "rate-limited") return 429;
  if (result.code === "unexpected") return 500;
  return 200;
}
