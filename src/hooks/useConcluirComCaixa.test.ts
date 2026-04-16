import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/* ── Module-level mocks ──────────────────────────────────────────────────── */

const mockMutateAsync = vi.fn();
const mockConcluirFaturaMutateAsync = vi.fn();

vi.mock("@/hooks/useSolicitacoes", () => ({
  useSolicitacoes: vi.fn(() => ({ data: [] })),
  useUpdateSolicitacao: vi.fn(() => ({ mutateAsync: mockMutateAsync })),
  useUpdateRotasBulk: vi.fn(() => ({ mutateAsync: vi.fn(() => Promise.resolve()) })),
}));

vi.mock("@/hooks/useClientes", () => ({
  useClientes: vi.fn(() => ({ data: [] })),
  useClienteSaldoMap: vi.fn(() => ({ getClienteSaldo: () => 0 })),
}));

vi.mock("@/hooks/useEntregadores", () => ({
  useEntregadores: vi.fn(() => ({ data: [] })),
}));

vi.mock("@/hooks/useFaturas", () => ({
  useFaturas: vi.fn(() => ({ data: [] })),
  useConcluirFaturaEntrega: vi.fn(() => ({ mutateAsync: mockConcluirFaturaMutateAsync })),
}));

vi.mock("@/contexts/CaixaStore", () => ({
  useCaixaStore: vi.fn(() => ({ addRecebimentoAutomatico: vi.fn() })),
}));

vi.mock("@/contexts/SettingsStore", () => ({
  useSettingsStore: Object.assign(vi.fn(() => ({ limite_saldo_pre_pago: 50 })), {
    getState: () => ({ limite_saldo_pre_pago: 50 }),
  }),
}));

vi.mock("@/services/solicitacoes", () => ({
  fetchRotasBySolicitacao: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/lib/mappers", () => ({
  rowToRota: vi.fn((row: unknown) => row),
}));

vi.mock("@/services/whatsapp", () => ({
  notificarEntregaConcluida: vi.fn(() => Promise.resolve()),
  notificarFaturaGerada: vi.fn(() => Promise.resolve()),
  notificarFaturaFechada: vi.fn(() => Promise.resolve()),
  notificarSaldoBaixo: vi.fn(() => Promise.resolve()),
}));

/* ── Re-import mocked modules for per-test config ────────────────────────── */

import { useSolicitacoes } from "@/hooks/useSolicitacoes";
import { useClientes, useClienteSaldoMap } from "@/hooks/useClientes";
import { useEntregadores } from "@/hooks/useEntregadores";
import { useFaturas } from "@/hooks/useFaturas";
import { useCaixaStore } from "@/contexts/CaixaStore";
import { fetchRotasBySolicitacao } from "@/services/solicitacoes";
import { useConcluirComCaixa } from "./useConcluirComCaixa";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

const makeSol = (overrides = {}) => ({
  id: "sol-1",
  codigo: "S001",
  cliente_id: "cli-1",
  entregador_id: "ent-1",
  status: "em_andamento",
  ...overrides,
});

const makeCliente = (overrides = {}) => ({
  id: "cli-1",
  nome: "Loja Teste",
  telefone: null,
  modalidade: "faturado",
  frequencia_faturamento: "manual",
  ...overrides,
});

const makeRota = (overrides = {}) => ({
  id: "rota-1",
  solicitacao_id: "sol-1",
  taxa_resolvida: 10,
  receber_do_cliente: false,
  valor_a_receber: null,
  ...overrides,
});

/* ── Tests ────────────────────────────────────────────────────────────────── */

describe("useConcluirComCaixa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue(undefined);
    mockConcluirFaturaMutateAsync.mockResolvedValue({ success: true });
  });

  it("returns error when solicitação not found", async () => {
    vi.mocked(useSolicitacoes).mockReturnValue({ data: [] } as never);

    const { result } = renderHook(() => useConcluirComCaixa(), { wrapper });
    let res: { success: boolean; error?: string };
    await act(async () => {
      res = await result.current("non-existent");
    });
    expect(res!.success).toBe(false);
    expect(res!.error).toContain("não encontrada");
  });

  it("returns error when fetchRotas fails", async () => {
    vi.mocked(useSolicitacoes).mockReturnValue({ data: [makeSol()] } as never);
    vi.mocked(useClientes).mockReturnValue({ data: [makeCliente()] } as never);
    vi.mocked(fetchRotasBySolicitacao).mockRejectedValueOnce(new Error("network"));

    const { result } = renderHook(() => useConcluirComCaixa(), { wrapper });
    let res: { success: boolean; error?: string };
    await act(async () => {
      res = await result.current("sol-1");
    });
    expect(res!.success).toBe(false);
    expect(res!.error).toContain("rotas");
  });

  it("blocks pre-paid client with insufficient balance", async () => {
    vi.mocked(useSolicitacoes).mockReturnValue({ data: [makeSol()] } as never);
    vi.mocked(useClientes).mockReturnValue({ data: [makeCliente({ modalidade: "pre_pago" })] } as never);
    vi.mocked(useClienteSaldoMap).mockReturnValue({ getClienteSaldo: () => 5 } as never);
    vi.mocked(fetchRotasBySolicitacao).mockResolvedValueOnce([makeRota({ taxa_resolvida: 20 })] as never);

    const { result } = renderHook(() => useConcluirComCaixa(), { wrapper });
    let res: { success: boolean; error?: string };
    await act(async () => {
      res = await result.current("sol-1");
    });
    expect(res!.success).toBe(false);
    expect(res!.error).toContain("Saldo insuficiente");
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("concludes successfully for faturado client", async () => {
    vi.mocked(useSolicitacoes).mockReturnValue({ data: [makeSol()] } as never);
    vi.mocked(useClientes).mockReturnValue({ data: [makeCliente()] } as never);
    vi.mocked(useEntregadores).mockReturnValue({ data: [{ id: "ent-1", nome: "João" }] } as never);
    vi.mocked(useFaturas).mockReturnValue({ data: [] } as never);
    vi.mocked(fetchRotasBySolicitacao).mockResolvedValueOnce([makeRota()] as never);
    mockConcluirFaturaMutateAsync.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useConcluirComCaixa(), { wrapper });
    let res: { success: boolean; error?: string };
    await act(async () => {
      res = await result.current("sol-1");
    });
    expect(res!.success).toBe(true);
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sol-1", patch: expect.objectContaining({ status: "concluida" }) })
    );
    expect(mockConcluirFaturaMutateAsync).toHaveBeenCalled();
  });

  it("auto-adds cash recebimento to caixa when rota has valor_a_receber", async () => {
    const addReceb = vi.fn();
    vi.mocked(useSolicitacoes).mockReturnValue({ data: [makeSol()] } as never);
    vi.mocked(useClientes).mockReturnValue({ data: [makeCliente({ modalidade: "avulso" })] } as never);
    vi.mocked(useCaixaStore).mockReturnValue({ addRecebimentoAutomatico: addReceb } as never);
    vi.mocked(fetchRotasBySolicitacao).mockResolvedValueOnce([
      makeRota({ receber_do_cliente: true, valor_a_receber: 30 }),
    ] as never);

    const { result } = renderHook(() => useConcluirComCaixa(), { wrapper });
    await act(async () => {
      await result.current("sol-1");
    });
    expect(addReceb).toHaveBeenCalledWith("ent-1", "sol-1", "S001", "Loja Teste", 30);
  });

  it("returns success with error message when fatura RPC fails", async () => {
    vi.mocked(useSolicitacoes).mockReturnValue({ data: [makeSol()] } as never);
    vi.mocked(useClientes).mockReturnValue({ data: [makeCliente()] } as never);
    vi.mocked(fetchRotasBySolicitacao).mockResolvedValueOnce([makeRota()] as never);
    mockConcluirFaturaMutateAsync.mockRejectedValueOnce(new Error("rpc error"));

    const { result } = renderHook(() => useConcluirComCaixa(), { wrapper });
    let res: { success: boolean; error?: string };
    await act(async () => {
      res = await result.current("sol-1");
    });
    expect(res!.success).toBe(true);
    expect(res!.error).toContain("fatura");
  });
});
