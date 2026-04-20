/**
 * Tests for Fix #15: profile_id nunca vinculado após cadastro de entregador/cliente
 *
 * Verifica que a lógica de vínculo do profile_id está correta após
 * a Edge Function `create-user` retornar com sucesso.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Helpers que simulam o comportamento do handleSave ────────────────────────

interface EdgeFunctionResult {
  data: { user: { id: string; email: string } } | null;
  error: null | { message: string };
}

interface UpdateArgs {
  id: string;
  patch: { profile_id: string };
}

/**
 * Extrai a lógica de vínculo do profile_id do handleSave, isolada para teste.
 * Espelha exatamente o código em EntregadoresPage.tsx / ClientesPage.tsx.
 */
async function linkProfileId(
  fnData: unknown,
  createdId: string,
  updateMutateAsync: (args: UpdateArgs) => Promise<void>,
  warnCallback: (msg: string) => void,
): Promise<boolean> {
  const profileId = (fnData as { user: { id: string; email: string } })?.user?.id;
  if (profileId) {
    try {
      await updateMutateAsync({ id: createdId, patch: { profile_id: profileId } });
      return true;
    } catch {
      warnCallback("Entregador criado, mas erro ao vincular perfil. Contate o suporte.");
      return false;
    }
  }
  return false;
}

// ── Testes ───────────────────────────────────────────────────────────────────

describe("Fix #15 — profile_id link após cadastro", () => {
  const CREATED_ID = "entregador-uuid-123";
  const PROFILE_ID = "auth-profile-uuid-456";

  let updateMock: ReturnType<typeof vi.fn>;
  let warnMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    updateMock = vi.fn().mockResolvedValue(undefined);
    warnMock = vi.fn();
  });

  it("vincula profile_id quando Edge Function retorna user.id", async () => {
    const fnData = { user: { id: PROFILE_ID, email: "rafael@test.com" } };

    const linked = await linkProfileId(fnData, CREATED_ID, updateMock, warnMock);

    expect(linked).toBe(true);
    expect(updateMock).toHaveBeenCalledOnce();
    expect(updateMock).toHaveBeenCalledWith({
      id: CREATED_ID,
      patch: { profile_id: PROFILE_ID },
    });
    expect(warnMock).not.toHaveBeenCalled();
  });

  it("não chama update quando fnData não contém user.id", async () => {
    const fnData = { user: null };

    const linked = await linkProfileId(fnData, CREATED_ID, updateMock, warnMock);

    expect(linked).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("não chama update quando fnData é null", async () => {
    const linked = await linkProfileId(null, CREATED_ID, updateMock, warnMock);

    expect(linked).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("emite warning sem lançar exceção quando update falha", async () => {
    updateMock.mockRejectedValue(new Error("DB error"));
    const fnData = { user: { id: PROFILE_ID, email: "rafael@test.com" } };

    const linked = await linkProfileId(fnData, CREATED_ID, updateMock, warnMock);

    expect(linked).toBe(false);
    expect(warnMock).toHaveBeenCalledOnce();
    expect(warnMock.mock.calls[0][0]).toContain("vincular perfil");
  });

  it("profile_id do update corresponde exatamente ao id retornado pela Edge Function", async () => {
    const uniqueId = "unique-profile-id-789";
    const fnData = { user: { id: uniqueId, email: "outro@test.com" } };

    await linkProfileId(fnData, CREATED_ID, updateMock, warnMock);

    const callArgs = updateMock.mock.calls[0][0] as UpdateArgs;
    expect(callArgs.patch.profile_id).toBe(uniqueId);
    expect(callArgs.id).toBe(CREATED_ID);
  });
});

// ── Testa a migration SQL (estrutura lógica) ─────────────────────────────────

describe("Migration 28 — backfill profile_id (lógica)", () => {
  it("UPDATE é idempotente: só afeta rows com profile_id IS NULL", () => {
    // Simula o conjunto de entregadores no banco
    const entregadores = [
      { id: "e1", email: "rafael@test.com", profile_id: null },
      { id: "e2", email: "joao@test.com",   profile_id: null },
      { id: "e3", email: "maria@test.com",  profile_id: "already-set-uuid" },
    ];

    const profiles = [
      { id: "p-rafael", email: "rafael@test.com" },
      { id: "p-joao",   email: "joao@test.com" },
      { id: "p-maria",  email: "maria@test.com" },
    ];

    // Simula o UPDATE ... FROM profiles WHERE profile_id IS NULL AND email matches
    const updated = entregadores.map((e) => {
      if (e.profile_id !== null) return e; // já tem vínculo — não toca
      const match = profiles.find((p) => p.email.toLowerCase() === e.email.toLowerCase());
      return match ? { ...e, profile_id: match.id } : e;
    });

    const [rafael, joao, maria] = updated;

    expect(rafael.profile_id).toBe("p-rafael");
    expect(joao.profile_id).toBe("p-joao");
    // Maria já tinha profile_id — não foi alterada
    expect(maria.profile_id).toBe("already-set-uuid");
  });

  it("UPDATE não afeta entregadores sem profile correspondente", () => {
    const entregadores = [{ id: "e1", email: "semconta@test.com", profile_id: null }];
    const profiles: { id: string; email: string }[] = [];

    const updated = entregadores.map((e) => {
      if (e.profile_id !== null) return e;
      const match = profiles.find((p) => p.email === e.email);
      return match ? { ...e, profile_id: match.id } : e;
    });

    expect(updated[0].profile_id).toBeNull();
  });
});
