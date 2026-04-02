import { MOCK_ENTREGADORES } from "./mockEntregadores";

export type StatusCaixa = "aberto" | "fechado" | "divergente";

export interface RecebimentoDinheiro {
  id: string;
  solicitacao_codigo: string;
  cliente_nome: string;
  valor_recebido: number;
  hora: string;
}

export interface CaixaEntregador {
  id: string;
  entregador_id: string;
  entregador_nome: string;
  data: string;
  troco_inicial: number;
  recebimentos: RecebimentoDinheiro[];
  total_recebido: number;
  total_esperado: number;
  valor_devolvido: number | null;
  diferenca: number | null;
  status: StatusCaixa;
  observacoes: string | null;
  created_at: string;
  closed_at: string | null;
}

export const MOCK_CAIXAS: CaixaEntregador[] = [
  {
    id: "caixa-001",
    entregador_id: "ent-001",
    entregador_nome: "Carlos Silva",
    data: "2026-03-30",
    troco_inicial: 50,
    recebimentos: [
      { id: "rec-001", solicitacao_codigo: "LT-20260330-00001", cliente_nome: "Loja ABC", valor_recebido: 45, hora: "09:30" },
      { id: "rec-002", solicitacao_codigo: "LT-20260330-00005", cliente_nome: "Restaurante XYZ", valor_recebido: 30, hora: "11:15" },
      { id: "rec-003", solicitacao_codigo: "LT-20260330-00009", cliente_nome: "Farmácia Popular", valor_recebido: 25, hora: "14:00" },
    ],
    total_recebido: 100,
    total_esperado: 150,
    valor_devolvido: null,
    diferenca: null,
    status: "aberto",
    observacoes: null,
    created_at: "2026-03-30T08:00:00Z",
    closed_at: null,
  },
  {
    id: "caixa-002",
    entregador_id: "ent-002",
    entregador_nome: "Ricardo Oliveira",
    data: "2026-03-30",
    troco_inicial: 30,
    recebimentos: [
      { id: "rec-004", solicitacao_codigo: "LT-20260330-00002", cliente_nome: "Padaria Estrela", valor_recebido: 60, hora: "10:00" },
      { id: "rec-005", solicitacao_codigo: "LT-20260330-00007", cliente_nome: "Pet Shop Amigo", valor_recebido: 35, hora: "13:45" },
    ],
    total_recebido: 95,
    total_esperado: 125,
    valor_devolvido: 125,
    diferenca: 0,
    status: "fechado",
    observacoes: null,
    created_at: "2026-03-30T07:30:00Z",
    closed_at: "2026-03-30T18:00:00Z",
  },
  {
    id: "caixa-003",
    entregador_id: "ent-003",
    entregador_nome: "Fernando Santos",
    data: "2026-03-29",
    troco_inicial: 40,
    recebimentos: [
      { id: "rec-006", solicitacao_codigo: "LT-20260329-00003", cliente_nome: "Boutique Elegance", valor_recebido: 80, hora: "09:00" },
      { id: "rec-007", solicitacao_codigo: "LT-20260329-00006", cliente_nome: "Livraria Cultura", valor_recebido: 55, hora: "11:30" },
      { id: "rec-008", solicitacao_codigo: "LT-20260329-00010", cliente_nome: "Loja ABC", valor_recebido: 40, hora: "15:20" },
    ],
    total_recebido: 175,
    total_esperado: 215,
    valor_devolvido: 210,
    diferenca: -5,
    status: "divergente",
    observacoes: "Entregador alegou ter dado troco a mais em uma entrega",
    created_at: "2026-03-29T08:00:00Z",
    closed_at: "2026-03-29T18:30:00Z",
  },
  {
    id: "caixa-004",
    entregador_id: "ent-004",
    entregador_nome: "Lucas Pereira",
    data: "2026-03-30",
    troco_inicial: 20,
    recebimentos: [
      { id: "rec-009", solicitacao_codigo: "LT-20260330-00004", cliente_nome: "Restaurante XYZ", valor_recebido: 50, hora: "10:30" },
    ],
    total_recebido: 50,
    total_esperado: 70,
    valor_devolvido: null,
    diferenca: null,
    status: "aberto",
    observacoes: null,
    created_at: "2026-03-30T09:00:00Z",
    closed_at: null,
  },
  {
    id: "caixa-005",
    entregador_id: "ent-006",
    entregador_nome: "Paulo Mendes",
    data: "2026-03-29",
    troco_inicial: 50,
    recebimentos: [
      { id: "rec-010", solicitacao_codigo: "LT-20260329-00008", cliente_nome: "Papelaria Central", valor_recebido: 90, hora: "08:45" },
      { id: "rec-011", solicitacao_codigo: "LT-20260329-00012", cliente_nome: "Loja do Povo", valor_recebido: 45, hora: "12:00" },
      { id: "rec-012", solicitacao_codigo: "LT-20260329-00015", cliente_nome: "Mercado Bom Preço", valor_recebido: 70, hora: "16:00" },
      { id: "rec-013", solicitacao_codigo: "LT-20260329-00018", cliente_nome: "Farmácia Popular", valor_recebido: 30, hora: "17:30" },
    ],
    total_recebido: 235,
    total_esperado: 285,
    valor_devolvido: 285,
    diferenca: 0,
    status: "fechado",
    observacoes: null,
    created_at: "2026-03-29T07:00:00Z",
    closed_at: "2026-03-29T19:00:00Z",
  },
  {
    id: "caixa-006",
    entregador_id: "ent-001",
    entregador_nome: "Carlos Silva",
    data: "2026-03-29",
    troco_inicial: 50,
    recebimentos: [
      { id: "rec-014", solicitacao_codigo: "LT-20260329-00001", cliente_nome: "Loja ABC", valor_recebido: 65, hora: "09:15" },
      { id: "rec-015", solicitacao_codigo: "LT-20260329-00005", cliente_nome: "Restaurante XYZ", valor_recebido: 40, hora: "13:00" },
    ],
    total_recebido: 105,
    total_esperado: 155,
    valor_devolvido: 155,
    diferenca: 0,
    status: "fechado",
    observacoes: null,
    created_at: "2026-03-29T08:00:00Z",
    closed_at: "2026-03-29T18:00:00Z",
  },
];

export function getEntregadorNome(id: string): string {
  return MOCK_ENTREGADORES.find((e) => e.id === id)?.nome ?? id;
}
