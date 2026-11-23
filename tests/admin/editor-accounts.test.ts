import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  META_MANAGED,
  META_PASSWORD_CHANGED_AT,
  META_PASSWORD_SET_AT,
  handleEditorRequest,
  httpStatusFor,
  normalizeEmail,
  parseEditorRequest,
  passwordProblem,
  type AuthAdminPort,
  type AuthFailure,
  type AuthUser,
  type EditorDeps,
  type EditorResult,
  type Membership,
  type NewEvent,
  type StoredEvent,
  type StorePort,
} from "../../supabase/functions/_shared/editor-accounts";

// Núcleo da Edge Function admin-editor-management com Auth e banco falsos
// (em memória). Nenhuma chamada de rede; senhas fictícias.

const ADMIN = "a0000000-0000-4000-8000-000000000001";
const OTHER_ADMIN = "a0000000-0000-4000-8000-000000000002";
const EDITOR = "e0000000-0000-4000-8000-000000000001";
const INACTIVE = "e0000000-0000-4000-8000-000000000002";
const PENDING = "e0000000-0000-4000-8000-000000000003";
const LOOSE = "b0000000-0000-4000-8000-000000000001";

const STRONG = "Granito-Basalto-42";
const OTHER_STRONG = "Quartzo#Feldspato7";

type Faults = {
  createUser?: AuthFailure;
  updateUser?: AuthFailure;
  insertMembership?: boolean;
  updateMembership?: boolean;
  getMembership?: boolean;
  passwordCheck?: boolean;
};

class World {
  users = new Map<string, AuthUser & { password: string }>();
  memberships = new Map<string, Membership>();
  events: StoredEvent[] = [];
  faults: Faults = {};
  clock = Date.parse("2026-11-23T12:00:00Z");
  logs: string[] = [];
  nextId = 1;

  addUser(id: string, email: string, password: string, appMetadata: Record<string, unknown> = {}) {
    this.users.set(id, { id, email, password, createdAt: "2026-11-01T00:00:00Z", lastSignInAt: null, appMetadata });
  }

  addMembership(userId: string, role: string, isActive = true, mustChange = false) {
    this.memberships.set(userId, {
      userId,
      role,
      isActive,
      mustChangePassword: mustChange,
      passwordChangeRequiredAt: mustChange ? new Date(this.clock - 60_000).toISOString() : null,
      createdAt: "2026-11-01T00:00:00Z",
    });
  }

  tick(ms = 1000) {
    this.clock += ms;
  }

  deps(): EditorDeps {
    return depsFor(this);
  }

  run(callerId: string, body: unknown): Promise<EditorResult> {
    const email = this.users.get(callerId)?.email ?? null;
    return handleEditorRequest(this.deps(), { id: callerId, email }, body);
  }
}

/** Conta do Auth sem a senha (a API administrativa nunca devolve senhas). */
function publicUser(user: AuthUser & { password: string }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    lastSignInAt: user.lastSignInAt,
    appMetadata: { ...user.appMetadata },
  };
}

function depsFor(world: World): EditorDeps {
    const auth: AuthAdminPort = {
      async listUsers() {
        return [...world.users.values()].map(publicUser);
      },
      async getUser(id) {
        const user = world.users.get(id);
        return user ? publicUser(user) : null;
      },
      async createUser({ email, password, appMetadata }) {
        if (world.faults.createUser) return { error: world.faults.createUser };
        if ([...world.users.values()].some((user) => user.email === email)) return { error: "email-exists" };
        const id = `c0000000-0000-4000-8000-${String(world.nextId++).padStart(12, "0")}`;
        world.addUser(id, email, password, { ...appMetadata });
        return { user: publicUser(world.users.get(id)!) };
      },
      async updateUser(id, { password, appMetadata }) {
        if (world.faults.updateUser) return { error: world.faults.updateUser };
        const user = world.users.get(id);
        if (!user) return { error: "unexpected" };
        if (password !== undefined) user.password = password;
        if (appMetadata) {
          for (const [key, value] of Object.entries(appMetadata)) {
            if (value === null) delete user.appMetadata[key];
            else user.appMetadata[key] = value;
          }
        }
        return {};
      },
      async passwordMatches(email, password) {
        if (world.faults.passwordCheck) return "error";
        return [...world.users.values()].some((user) => user.email === email && user.password === password);
      },
    };
    const store: StorePort = {
      async getMembership(userId) {
        if (world.faults.getMembership) throw new Error("db down");
        const membership = world.memberships.get(userId);
        return membership ? { ...membership } : null;
      },
      async listMemberships() {
        return [...world.memberships.values()].map((membership) => ({ ...membership }));
      },
      async insertEditorMembership(userId, requiredAt) {
        if (world.faults.insertMembership) throw new Error("insert failed");
        if (world.memberships.has(userId)) throw new Error("duplicate");
        world.memberships.set(userId, {
          userId,
          role: "editor",
          isActive: true,
          mustChangePassword: true,
          passwordChangeRequiredAt: requiredAt,
          createdAt: new Date(world.clock).toISOString(),
        });
      },
      async updateMembership(userId, patch) {
        if (world.faults.updateMembership) throw new Error("update failed");
        const membership = world.memberships.get(userId);
        if (!membership || membership.role !== "editor") throw new Error("no editor");
        if (patch.isActive !== undefined) membership.isActive = patch.isActive;
        if (patch.mustChangePassword !== undefined) membership.mustChangePassword = patch.mustChangePassword;
        if (patch.passwordChangeRequiredAt !== undefined) {
          membership.passwordChangeRequiredAt = patch.passwordChangeRequiredAt;
        }
      },
      async countRecentEvents(actorUserId, sinceIso, outcome) {
        return world.events.filter(
          (event) =>
            event.actorUserId === actorUserId &&
            event.createdAt >= sinceIso &&
            (!outcome || event.outcome === outcome),
        ).length;
      },
      async recordEvent(event: NewEvent) {
        world.events.push({ ...event, id: world.events.length + 1, createdAt: new Date(world.clock).toISOString() });
      },
      async listEvents(limit) {
        return [...world.events].reverse().slice(0, limit);
      },
    };
    return { auth, store, now: () => new Date(world.clock), log: (message, code) => world.logs.push(`${message} ${code}`) };
}

let world: World;

beforeEach(() => {
  world = new World();
  world.addUser(ADMIN, "admin@example.test", "Admin-Senha-Teste1");
  world.addUser(OTHER_ADMIN, "admin2@example.test", "Admin-Senha-Teste2");
  world.addUser(EDITOR, "editora@example.test", "Editora-Senha-Teste1");
  world.addUser(INACTIVE, "inativa@example.test", "Inativa-Senha-Teste1");
  world.addUser(PENDING, "pendente@example.test", STRONG, {
    [META_MANAGED]: true,
    [META_PASSWORD_SET_AT]: "2026-11-23T11:59:00.000Z",
  });
  world.addUser(LOOSE, "solta@example.test", "Solta-Senha-Teste1");
  world.addMembership(ADMIN, "admin");
  world.addMembership(OTHER_ADMIN, "admin");
  world.addMembership(EDITOR, "editor");
  world.addMembership(INACTIVE, "editor", false);
  world.addMembership(PENDING, "editor", true, true);
});

function expectError(result: EditorResult, code: string) {
  assert.equal(result.ok, false, `esperava erro ${code}`);
  if (!result.ok) assert.equal(result.code, code);
}

const create = (email: string, password = STRONG, confirmation = password) => ({
  operation: "create-editor",
  email,
  password,
  confirmation,
});

describe("validação compartilhada", () => {
  it("normaliza e-mail (espaços e maiúsculas) e recusa formatos inválidos", () => {
    assert.equal(normalizeEmail("  Nova.Editora@Example.TEST "), "nova.editora@example.test");
    assert.equal(normalizeEmail("sem-arroba"), null);
    assert.equal(normalizeEmail("a b@example.test"), null);
    assert.equal(normalizeEmail(42), null);
  });

  it("exige senha forte", () => {
    assert.equal(passwordProblem("Curta-1"), "too-short");
    assert.equal(passwordProblem("somenteletrasminusculas"), "weak");
    assert.equal(passwordProblem("a".repeat(30) + "A1!" + "é".repeat(30)), "too-long");
    assert.equal(passwordProblem("Mariana-Silva-2026", "mariana@example.test"), "contains-email");
    assert.equal(passwordProblem(STRONG, "editora@example.test"), null);
  });

  it("aceita só as operações da lista fechada, sem papel vindo do navegador", () => {
    assert.equal(parseEditorRequest({ operation: "delete-user", userId: EDITOR }), null);
    assert.equal(parseEditorRequest({ operation: "updateUserById" }), null);
    assert.equal(parseEditorRequest({ operation: "deactivate-editor", userId: "1; drop" }), null);
    assert.equal(parseEditorRequest({ operation: "list-editors", filter: "admins" }), null);
    const parsed = parseEditorRequest({ ...create("x@example.test"), role: "admin" });
    assert.ok(parsed && !("role" in parsed));
  });
});

describe("autorização do chamador", () => {
  it("editor, conta inativa e conta sem vínculo não gerenciam usuários", async () => {
    expectError(await world.run(EDITOR, create("nova@example.test")), "forbidden");
    expectError(await world.run(INACTIVE, create("nova@example.test")), "forbidden");
    expectError(await world.run(LOOSE, create("nova@example.test")), "forbidden");
    expectError(await world.run(EDITOR, { operation: "list-editors" }), "forbidden");
    expectError(await world.run(EDITOR, { operation: "reset-editor-password", userId: PENDING, password: STRONG, confirmation: STRONG }), "forbidden");
    assert.equal(world.users.size, 6);
  });

  it("falha ao consultar o vínculo nunca concede acesso", async () => {
    world.faults.getMembership = true;
    const result = await world.run(ADMIN, create("nova@example.test"));
    expectError(result, "unexpected");
    assert.equal(httpStatusFor(result), 500);
  });

  it("requisição inválida responde 400", async () => {
    const result = await world.run(ADMIN, { operation: "create-editor" });
    expectError(result, "bad-request");
    assert.equal(httpStatusFor(result), 400);
  });
});

describe("criação de Editor", () => {
  it("cria conta confirmada com papel editor e troca obrigatória", async () => {
    const result = await world.run(ADMIN, create("  Nova@Example.test "));
    assert.deepEqual(result, { ok: true, operation: "create-editor", email: "nova@example.test" });
    const user = [...world.users.values()].find((item) => item.email === "nova@example.test")!;
    assert.equal(user.appMetadata[META_MANAGED], true);
    const membership = world.memberships.get(user.id)!;
    assert.equal(membership.role, "editor");
    assert.equal(membership.isActive, true);
    assert.equal(membership.mustChangePassword, true);
    assert.ok(membership.passwordChangeRequiredAt);
    const event = world.events.at(-1)!;
    assert.equal(event.type, "editor_created");
    assert.equal(event.outcome, "success");
    assert.equal(event.actorUserId, ADMIN);
    assert.ok(!JSON.stringify(world.events).includes(STRONG), "senha nunca vai para o histórico");
  });

  it("recusa e-mail inválido, senhas diferentes e senha fraca", async () => {
    expectError(await world.run(ADMIN, create("invalido")), "invalid-email");
    expectError(await world.run(ADMIN, create("nova@example.test", STRONG, OTHER_STRONG)), "password-mismatch");
    const weak = await world.run(ADMIN, create("nova@example.test", "fraca"));
    expectError(weak, "weak-password");
    assert.equal(!weak.ok && weak.problem, "too-short");
    assert.equal(world.users.size, 6);
  });

  it("e-mail de Editor ativo, desativado ou de administrador não é alterado", async () => {
    expectError(await world.run(ADMIN, create("EDITORA@example.test")), "already-active");
    expectError(await world.run(ADMIN, create("inativa@example.test")), "already-inactive");
    expectError(await world.run(ADMIN, create("admin2@example.test")), "is-admin");
    assert.equal(world.users.get(EDITOR)!.password, "Editora-Senha-Teste1");
    assert.equal(world.users.get(OTHER_ADMIN)!.password, "Admin-Senha-Teste2");
  });

  it("conta do Auth preexistente sem vínculo não é transformada em Editor nem tem a senha trocada", async () => {
    expectError(await world.run(ADMIN, create("solta@example.test")), "existing-account");
    assert.equal(world.memberships.has(LOOSE), false);
    assert.equal(world.users.get(LOOSE)!.password, "Solta-Senha-Teste1");
  });

  it("erro da API administrativa não cria vínculo", async () => {
    world.faults.createUser = "unexpected";
    expectError(await world.run(ADMIN, create("nova@example.test")), "auth-error");
    assert.equal(world.memberships.size, 5);
    assert.equal(world.events.at(-1)!.outcome, "failure");
  });

  it("falha no vínculo: não informa sucesso, não dá acesso e a repetição conclui sem duplicar", async () => {
    world.faults.insertMembership = true;
    expectError(await world.run(ADMIN, create("nova@example.test")), "membership-failed");
    const user = [...world.users.values()].find((item) => item.email === "nova@example.test")!;
    assert.equal(world.memberships.has(user.id), false, "sem vínculo, sem acesso ao CMS");

    const listed = await world.run(ADMIN, { operation: "list-editors" });
    assert.ok(listed.ok && listed.operation === "list-editors");
    assert.equal(listed.list.items.find((item) => item.id === user.id)?.state, "incomplete");

    world.faults.insertMembership = false;
    world.tick();
    const retry = await world.run(ADMIN, create("nova@example.test", OTHER_STRONG));
    assert.deepEqual(retry, { ok: true, operation: "create-editor", email: "nova@example.test", recovered: true });
    assert.equal([...world.users.values()].filter((item) => item.email === "nova@example.test").length, 1);
    assert.equal(world.users.get(user.id)!.password, OTHER_STRONG);
    assert.equal(world.memberships.get(user.id)!.role, "editor");
    assert.equal(world.memberships.get(user.id)!.mustChangePassword, true);
  });

  it("repetir o cadastro já concluído não duplica a conta", async () => {
    assert.equal((await world.run(ADMIN, create("nova@example.test"))).ok, true);
    expectError(await world.run(ADMIN, create("nova@example.test")), "already-active");
    assert.equal([...world.users.values()].filter((item) => item.email === "nova@example.test").length, 1);
  });

  it("limita operações em sequência", async () => {
    for (let index = 0; index < 30; index++) {
      world.events.push({
        id: index + 100,
        createdAt: new Date(world.clock - 1000).toISOString(),
        actorUserId: ADMIN,
        targetUserId: null,
        targetEmail: null,
        type: "editor_created",
        outcome: "success",
      });
    }
    const result = await world.run(ADMIN, create("nova@example.test"));
    expectError(result, "rate-limited");
    assert.equal(httpStatusFor(result), 429);
  });
});

describe("listagem", () => {
  it("lista só Editores, com filtros, busca e paginação", async () => {
    const all = await world.run(ADMIN, { operation: "list-editors" });
    assert.ok(all.ok && all.operation === "list-editors");
    assert.deepEqual(all.list.items.map((item) => item.email), [
      "editora@example.test",
      "inativa@example.test",
      "pendente@example.test",
    ]);
    assert.ok(!JSON.stringify(all).includes("admin2@example.test"), "administradores fora da lista");

    const pending = await world.run(ADMIN, { operation: "list-editors", filter: "pending" });
    assert.ok(pending.ok && pending.operation === "list-editors");
    assert.deepEqual(pending.list.items.map((item) => item.id), [PENDING]);

    const inactive = await world.run(ADMIN, { operation: "list-editors", filter: "inactive" });
    assert.ok(inactive.ok && inactive.operation === "list-editors");
    assert.deepEqual(inactive.list.items.map((item) => item.id), [INACTIVE]);

    const search = await world.run(ADMIN, { operation: "list-editors", search: "EDITORA" });
    assert.ok(search.ok && search.operation === "list-editors");
    assert.equal(search.list.total, 1);

    const page2 = await world.run(ADMIN, { operation: "list-editors", page: 2 });
    assert.ok(page2.ok && page2.operation === "list-editors");
    assert.equal(page2.list.items.length, 0);
    assert.equal(page2.list.total, 3);
  });
});

describe("desativação e reativação", () => {
  it("desativa e reativa sem mexer na troca de senha pendente", async () => {
    assert.equal((await world.run(ADMIN, { operation: "deactivate-editor", userId: PENDING })).ok, true);
    assert.equal(world.memberships.get(PENDING)!.isActive, false);
    assert.equal(world.users.has(PENDING), true, "a conta do Auth não é excluída");
    expectError(await world.run(PENDING, { operation: "complete-initial-password", password: OTHER_STRONG, confirmation: OTHER_STRONG }), "forbidden");

    assert.equal((await world.run(ADMIN, { operation: "reactivate-editor", userId: PENDING })).ok, true);
    assert.equal(world.memberships.get(PENDING)!.isActive, true);
    assert.equal(world.memberships.get(PENDING)!.mustChangePassword, true);
    assert.deepEqual(
      world.events.slice(-2).map((event) => event.type),
      ["editor_deactivated", "editor_reactivated"],
    );
  });

  it("repetir a operação não gera alteração nova", async () => {
    const result = await world.run(ADMIN, { operation: "deactivate-editor", userId: INACTIVE });
    assert.deepEqual(result, { ok: true, operation: "deactivate-editor", unchanged: true });
    assert.equal(world.events.length, 0);
  });

  it("administradores e o próprio administrador ficam fora do módulo", async () => {
    expectError(await world.run(ADMIN, { operation: "deactivate-editor", userId: OTHER_ADMIN }), "not-editor");
    expectError(await world.run(ADMIN, { operation: "deactivate-editor", userId: ADMIN }), "forbidden");
    expectError(await world.run(ADMIN, { operation: "reactivate-editor", userId: LOOSE }), "not-found");
    assert.equal(world.memberships.get(OTHER_ADMIN)!.isActive, true);
  });
});

describe("redefinição de senha", () => {
  it("define nova senha inicial e volta a exigir a troca", async () => {
    const result = await world.run(ADMIN, {
      operation: "reset-editor-password",
      userId: EDITOR,
      password: OTHER_STRONG,
      confirmation: OTHER_STRONG,
    });
    assert.equal(result.ok, true);
    assert.equal(world.users.get(EDITOR)!.password, OTHER_STRONG);
    assert.equal(world.memberships.get(EDITOR)!.mustChangePassword, true);
    assert.equal(world.events.at(-1)!.type, "editor_password_reset");
  });

  it("nunca altera a senha de administradores", async () => {
    expectError(
      await world.run(ADMIN, { operation: "reset-editor-password", userId: OTHER_ADMIN, password: OTHER_STRONG, confirmation: OTHER_STRONG }),
      "not-editor",
    );
    assert.equal(world.users.get(OTHER_ADMIN)!.password, "Admin-Senha-Teste2");
  });

  it("falha no Auth mantém a conta bloqueada até a troca (lado seguro)", async () => {
    world.faults.updateUser = "unexpected";
    expectError(
      await world.run(ADMIN, { operation: "reset-editor-password", userId: EDITOR, password: OTHER_STRONG, confirmation: OTHER_STRONG }),
      "auth-error",
    );
    assert.equal(world.users.get(EDITOR)!.password, "Editora-Senha-Teste1");
    assert.equal(world.memberships.get(EDITOR)!.mustChangePassword, true);
  });
});

describe("troca obrigatória da senha inicial", () => {
  const complete = (password: string, confirmation = password) => ({
    operation: "complete-initial-password",
    password,
    confirmation,
  });

  it("conta pendente não executa operações administrativas", async () => {
    world.addMembership(ADMIN, "admin", true, true);
    expectError(await world.run(ADMIN, { operation: "list-editors" }), "password-change-required");
  });

  it("troca a senha, conclui a exigência e registra o evento", async () => {
    world.tick();
    const result = await world.run(PENDING, complete(OTHER_STRONG));
    assert.deepEqual(result, { ok: true, operation: "complete-initial-password" });
    assert.equal(world.users.get(PENDING)!.password, OTHER_STRONG);
    assert.equal(world.memberships.get(PENDING)!.mustChangePassword, false);
    assert.equal(world.events.at(-1)!.type, "initial_password_changed");
  });

  it("recusa manter a senha inicial", async () => {
    expectError(await world.run(PENDING, complete(STRONG)), "same-password");
    assert.equal(world.memberships.get(PENDING)!.mustChangePassword, true);
  });

  it("recusa senha fraca e confirmação diferente", async () => {
    expectError(await world.run(PENDING, complete("fraca")), "weak-password");
    expectError(await world.run(PENDING, complete(OTHER_STRONG, STRONG)), "password-mismatch");
  });

  it("falha do Auth: nada muda e a exigência continua", async () => {
    world.faults.updateUser = "unexpected";
    expectError(await world.run(PENDING, complete(OTHER_STRONG)), "auth-error");
    assert.equal(world.users.get(PENDING)!.password, STRONG);
    assert.equal(world.memberships.get(PENDING)!.mustChangePassword, true);
  });

  it("falha do banco depois da troca: bloqueio mantido e nova tentativa conclui sem pedir a senha antiga", async () => {
    world.tick();
    world.faults.updateMembership = true;
    const first = await world.run(PENDING, complete(OTHER_STRONG));
    expectError(first, "finalize-failed");
    assert.equal(!first.ok && first.passwordChanged, true);
    assert.equal(world.users.get(PENDING)!.password, OTHER_STRONG);
    assert.equal(world.memberships.get(PENDING)!.mustChangePassword, true, "acesso continua bloqueado");

    world.faults.updateMembership = false;
    const retry = await world.run(PENDING, complete(""));
    assert.deepEqual(retry, { ok: true, operation: "complete-initial-password" });
    assert.equal(world.memberships.get(PENDING)!.mustChangePassword, false);
  });

  it("marcador de troca anterior à exigência atual não conclui a exigência", async () => {
    world.users.get(PENDING)!.appMetadata[META_PASSWORD_CHANGED_AT] = "2026-11-01T00:00:00.000Z";
    expectError(await world.run(PENDING, complete("")), "weak-password");
    assert.equal(world.memberships.get(PENDING)!.mustChangePassword, true);
  });

  it("depois de redefinida pelo administrador, exige nova troca mesmo com marcador antigo", async () => {
    world.tick();
    assert.equal((await world.run(PENDING, complete(OTHER_STRONG))).ok, true);
    world.tick();
    await world.run(ADMIN, { operation: "reset-editor-password", userId: PENDING, password: STRONG, confirmation: STRONG });
    assert.equal(world.memberships.get(PENDING)!.mustChangePassword, true);
    expectError(await world.run(PENDING, complete("")), "weak-password");
  });

  it("conferência da senha indisponível não conclui a troca", async () => {
    world.faults.passwordCheck = true;
    expectError(await world.run(PENDING, complete(OTHER_STRONG)), "auth-error");
    assert.equal(world.users.get(PENDING)!.password, STRONG);
  });

  it("conta sem exigência não muda nada", async () => {
    const result = await world.run(EDITOR, complete(OTHER_STRONG));
    assert.deepEqual(result, { ok: true, operation: "complete-initial-password", unchanged: true });
    assert.equal(world.users.get(EDITOR)!.password, "Editora-Senha-Teste1");
  });
});
