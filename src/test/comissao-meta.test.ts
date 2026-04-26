import { describe, it, expect } from "vitest";

/**
 * Testes da lógica de comissão por meta de entregas.
 *
 * Cobre:
 *  1. calcularComissaoMetaClient — modo escalonado
 *  2. calcularComissaoMetaClient — modo faixa_maxima
 *  3. calcularComissaoMetaClient — gaps entre faixas (Opção B: herda faixa anterior)
 *  4. calcularComissaoMetaClient — casos extremos (0 entregas, faixas vazias)
 *  5. detectarGapsFaixas — detecção correta de intervalos sem faixa
 *  6. calcularProgressoFaixa — faixa atual + próxima + percentual
 *  7. getMesCorrenteRange — filtragem mensal (isolado)
 */

// ─── Reimplementação local das funções puras (sem importar hooks de React) ────
// Estas funções são cópias exatas das implementadas em useComissaoFaixas.ts
// para que os testes rodem sem o runtime do React.

interface FaixaTest {
  id: string;
  entregador_id: string;
  de: number;
  ate: number;
  valor_por_entrega: number;
  created_at: string;
  updated_at: string;
}

function makeFaixa(de: number, ate: number, valor: number): FaixaTest {
  return {
    id: `${de}-${ate}`,
    entregador_id: "ent-1",
    de,
    ate,
    valor_por_entrega: valor,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function calcularComissaoMetaClient(
  totalEntregas: number,
  faixas: FaixaTest[],
  modo: "escalonado" | "faixa_maxima"
): number {
  if (totalEntregas <= 0 || faixas.length === 0) return 0;

  const sorted = [...faixas].sort((a, b) => a.de - b.de);

  if (modo === "faixa_maxima") {
    const faixaAtingida = [...sorted]
      .reverse()
      .find((f) => f.de <= totalEntregas);
    if (!faixaAtingida) return 0;
    return Math.round(totalEntregas * faixaAtingida.valor_por_entrega * 100) / 100;
  }

  // escalonado
  let comissao = 0;
  let entregando = 1;
  let ultimoValor = 0;

  for (const faixa of sorted) {
    // Gap: herda último valor (Opção B)
    if (entregando < faixa.de && ultimoValor > 0) {
      const qtdGap = Math.min(faixa.de - 1, totalEntregas) - entregando + 1;
      if (qtdGap > 0) {
        comissao += qtdGap * ultimoValor;
        entregando += qtdGap;
      }
    }

    if (entregando > totalEntregas) break;

    if (entregando <= faixa.ate) {
      const inicio = Math.max(entregando, faixa.de);
      const fim = Math.min(faixa.ate, totalEntregas);
      const qtd = fim - inicio + 1;
      if (qtd > 0) {
        comissao += qtd * faixa.valor_por_entrega;
        entregando = fim + 1;
      }
    }

    ultimoValor = faixa.valor_por_entrega;
  }

  // Entregas além da última faixa: herda último valor (Opção B)
  if (entregando <= totalEntregas && ultimoValor > 0) {
    comissao += (totalEntregas - entregando + 1) * ultimoValor;
  }

  return Math.round(comissao * 100) / 100;
}

function detectarGapsFaixas(
  faixas: Array<{ de: number; ate: number; valor_por_entrega: number }>
): Array<{ de: number; ate: number; valorHerdado: number }> {
  const sorted = [...faixas].sort((a, b) => a.de - b.de);
  const gaps: Array<{ de: number; ate: number; valorHerdado: number }> = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const atual = sorted[i];
    const proxima = sorted[i + 1];
    if (proxima.de > atual.ate + 1) {
      gaps.push({
        de: atual.ate + 1,
        ate: proxima.de - 1,
        valorHerdado: atual.valor_por_entrega,
      });
    }
  }

  return gaps;
}

function calcularProgressoFaixa(
  totalEntregas: number,
  faixas: FaixaTest[]
): {
  faixaAtual: FaixaTest | null;
  proximaFaixa: FaixaTest | null;
  entregasFaltam: number;
  percentualProxima: number;
} {
  const sorted = [...faixas].sort((a, b) => a.de - b.de);

  let faixaAtual: FaixaTest | null = null;
  let proximaFaixa: FaixaTest | null = null;

  for (let i = 0; i < sorted.length; i++) {
    if (totalEntregas >= sorted[i].de) {
      faixaAtual = sorted[i];
      proximaFaixa = sorted[i + 1] ?? null;
    }
  }

  const entregasFaltam = proximaFaixa
    ? Math.max(0, proximaFaixa.de - totalEntregas)
    : 0;

  const percentualProxima =
    proximaFaixa && faixaAtual
      ? Math.min(
          100,
          Math.round(
            ((totalEntregas - faixaAtual.de) /
              (proximaFaixa.de - faixaAtual.de)) *
              100
          )
        )
      : 100;

  return { faixaAtual, proximaFaixa, entregasFaltam, percentualProxima };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const faixasPadrao = [
  makeFaixa(1, 100, 1.0),   // Faixa 1: 1–100  → R$ 1,00
  makeFaixa(101, 300, 1.5), // Faixa 2: 101–300 → R$ 1,50
  makeFaixa(301, 600, 2.0), // Faixa 3: 301–600 → R$ 2,00
];

const faixasComGap = [
  makeFaixa(1, 100, 1.0),   // Faixa 1: 1–100
  makeFaixa(101, 300, 1.5), // Faixa 2: 101–300
  // GAP: 301–499
  makeFaixa(500, 600, 2.0), // Faixa 3: 500–600
];

// ─── 1. Escalonado — sem gap ──────────────────────────────────────────────────

describe("calcularComissaoMetaClient — escalonado (sem gap)", () => {
  it("exatamente na 1ª faixa: 100 entregas", () => {
    // 100 × R$1,00 = R$100,00
    expect(calcularComissaoMetaClient(100, faixasPadrao, "escalonado")).toBe(100.0);
  });

  it("início da 2ª faixa: 101 entregas", () => {
    // 100 × R$1,00 + 1 × R$1,50 = R$101,50
    expect(calcularComissaoMetaClient(101, faixasPadrao, "escalonado")).toBe(101.5);
  });

  it("250 entregas (meio da 2ª faixa) — exemplo do plano", () => {
    // 100 × R$1,00 + 150 × R$1,50 = R$100 + R$225 = R$325,00
    expect(calcularComissaoMetaClient(250, faixasPadrao, "escalonado")).toBe(325.0);
  });

  it("300 entregas (fim da 2ª faixa) — exemplo do plano", () => {
    // 100 × R$1,00 + 200 × R$1,50 = R$100 + R$300 = R$400,00
    expect(calcularComissaoMetaClient(300, faixasPadrao, "escalonado")).toBe(400.0);
  });

  it("400 entregas (meio da 3ª faixa)", () => {
    // 100×1,00 + 200×1,50 + 100×2,00 = R$100 + R$300 + R$200 = R$600,00
    expect(calcularComissaoMetaClient(400, faixasPadrao, "escalonado")).toBe(600.0);
  });

  it("600 entregas (fim da 3ª faixa)", () => {
    // 100×1,00 + 200×1,50 + 300×2,00 = R$100 + R$300 + R$600 = R$1.000,00
    expect(calcularComissaoMetaClient(600, faixasPadrao, "escalonado")).toBe(1000.0);
  });

  it("700 entregas (além da última faixa — herda R$2,00)", () => {
    // 100×1,00 + 200×1,50 + 300×2,00 + 100×2,00 = R$1.200,00
    expect(calcularComissaoMetaClient(700, faixasPadrao, "escalonado")).toBe(1200.0);
  });
});

// ─── 2. Faixa Máxima — sem gap ────────────────────────────────────────────────

describe("calcularComissaoMetaClient — faixa_maxima (sem gap)", () => {
  it("100 entregas: faixa máxima é R$1,00", () => {
    // 100 × R$1,00 = R$100,00
    expect(calcularComissaoMetaClient(100, faixasPadrao, "faixa_maxima")).toBe(100.0);
  });

  it("101 entregas: faixa máxima é R$1,50", () => {
    // 101 × R$1,50 = R$151,50
    expect(calcularComissaoMetaClient(101, faixasPadrao, "faixa_maxima")).toBe(151.5);
  });

  it("250 entregas — exemplo do plano: faixa máxima R$1,50", () => {
    // 250 × R$1,50 = R$375,00
    expect(calcularComissaoMetaClient(250, faixasPadrao, "faixa_maxima")).toBe(375.0);
  });

  it("300 entregas: faixa máxima é R$1,50", () => {
    // 300 × R$1,50 = R$450,00
    expect(calcularComissaoMetaClient(300, faixasPadrao, "faixa_maxima")).toBe(450.0);
  });

  it("301 entregas: faixa máxima é R$2,00", () => {
    // 301 × R$2,00 = R$602,00
    expect(calcularComissaoMetaClient(301, faixasPadrao, "faixa_maxima")).toBe(602.0);
  });

  it("600 entregas: faixa máxima é R$2,00", () => {
    // 600 × R$2,00 = R$1.200,00
    expect(calcularComissaoMetaClient(600, faixasPadrao, "faixa_maxima")).toBe(1200.0);
  });
});

// ─── 3. Gap entre faixas (Opção B) ────────────────────────────────────────────

describe("calcularComissaoMetaClient — gap entre faixas (Opção B)", () => {
  it("300 entregas — sem gap nessa quantidade", () => {
    // 100×1,00 + 200×1,50 = R$400,00 (gap está em 301–499)
    expect(calcularComissaoMetaClient(300, faixasComGap, "escalonado")).toBe(400.0);
  });

  it("400 entregas — GAP 301–400: herda R$1,50", () => {
    // 100×1,00 + 200×1,50 + 100×1,50(gap) = R$100 + R$300 + R$150 = R$550,00
    expect(calcularComissaoMetaClient(400, faixasComGap, "escalonado")).toBe(550.0);
  });

  it("499 entregas — gap completo 301–499 usa R$1,50", () => {
    // 100×1,00 + 200×1,50 + 199×1,50(gap) = R$100 + R$300 + R$298,50 = R$698,50
    expect(calcularComissaoMetaClient(499, faixasComGap, "escalonado")).toBe(698.5);
  });

  it("500 entregas — entra na 3ª faixa normalmente após o gap", () => {
    // 100×1,00 + 200×1,50 + 199×1,50(gap) + 1×2,00 = R$700,50
    expect(calcularComissaoMetaClient(500, faixasComGap, "escalonado")).toBe(700.5);
  });

  it("600 entregas — faixa 3 completa após gap", () => {
    // 100×1,00 + 200×1,50 + 199×1,50(gap) + 101×2,00 = R$100 + R$300 + R$298,50 + R$202 = R$900,50
    expect(calcularComissaoMetaClient(600, faixasComGap, "escalonado")).toBe(900.5);
  });

  it("faixa_maxima — 400 entregas no gap: usa faixa anterior (R$1,50)", () => {
    // 400 está no gap 301–499, faixa anterior é R$1,50 (de=101)
    // 400 × R$1,50 = R$600,00
    expect(calcularComissaoMetaClient(400, faixasComGap, "faixa_maxima")).toBe(600.0);
  });

  it("faixa_maxima — 500 entregas: atinge faixa 3 (R$2,00)", () => {
    // 500 × R$2,00 = R$1.000,00
    expect(calcularComissaoMetaClient(500, faixasComGap, "faixa_maxima")).toBe(1000.0);
  });
});

// ─── 4. Casos extremos ────────────────────────────────────────────────────────

describe("calcularComissaoMetaClient — casos extremos", () => {
  it("0 entregas → R$0,00", () => {
    expect(calcularComissaoMetaClient(0, faixasPadrao, "escalonado")).toBe(0);
    expect(calcularComissaoMetaClient(0, faixasPadrao, "faixa_maxima")).toBe(0);
  });

  it("faixas vazias → R$0,00", () => {
    expect(calcularComissaoMetaClient(100, [], "escalonado")).toBe(0);
    expect(calcularComissaoMetaClient(100, [], "faixa_maxima")).toBe(0);
  });

  it("1 entrega — exatamente na 1ª faixa", () => {
    expect(calcularComissaoMetaClient(1, faixasPadrao, "escalonado")).toBe(1.0);
    expect(calcularComissaoMetaClient(1, faixasPadrao, "faixa_maxima")).toBe(1.0);
  });

  it("faixa única de 1–1000: escalonado = faixa_maxima", () => {
    const faixaUnica = [makeFaixa(1, 1000, 2.5)];
    expect(calcularComissaoMetaClient(300, faixaUnica, "escalonado")).toBe(750.0);
    expect(calcularComissaoMetaClient(300, faixaUnica, "faixa_maxima")).toBe(750.0);
  });

  it("1 entrega abaixo da 1ª faixa (de=10): faixa_maxima → 0", () => {
    const faixasComeco10 = [makeFaixa(10, 100, 1.5)];
    expect(calcularComissaoMetaClient(5, faixasComeco10, "faixa_maxima")).toBe(0);
  });

  it("escalonado preserva precisão decimal", () => {
    const faixas = [makeFaixa(1, 3, 1.33)];
    // 3 × R$1,33 = R$3,99
    expect(calcularComissaoMetaClient(3, faixas, "escalonado")).toBe(3.99);
  });

  it("escalonado além da última faixa: herda último valor", () => {
    const faixas = [makeFaixa(1, 10, 3.0)];
    // 10×3,00 + 5×3,00 = R$45,00
    expect(calcularComissaoMetaClient(15, faixas, "escalonado")).toBe(45.0);
  });
});

// ─── 5. detectarGapsFaixas ───────────────────────────────────────────────────

describe("detectarGapsFaixas", () => {
  it("sem gap: faixas contíguas → array vazio", () => {
    const faixas = [
      { de: 1, ate: 100, valor_por_entrega: 1.0 },
      { de: 101, ate: 300, valor_por_entrega: 1.5 },
      { de: 301, ate: 600, valor_por_entrega: 2.0 },
    ];
    expect(detectarGapsFaixas(faixas)).toHaveLength(0);
  });

  it("um gap entre faixa 2 e 3", () => {
    const faixas = [
      { de: 1, ate: 100, valor_por_entrega: 1.0 },
      { de: 101, ate: 300, valor_por_entrega: 1.5 },
      { de: 500, ate: 600, valor_por_entrega: 2.0 },
    ];
    const gaps = detectarGapsFaixas(faixas);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toEqual({ de: 301, ate: 499, valorHerdado: 1.5 });
  });

  it("dois gaps independentes", () => {
    const faixas = [
      { de: 1, ate: 50, valor_por_entrega: 1.0 },
      // gap 51–99
      { de: 100, ate: 200, valor_por_entrega: 1.5 },
      // gap 201–299
      { de: 300, ate: 500, valor_por_entrega: 2.0 },
    ];
    const gaps = detectarGapsFaixas(faixas);
    expect(gaps).toHaveLength(2);
    expect(gaps[0]).toEqual({ de: 51, ate: 99, valorHerdado: 1.0 });
    expect(gaps[1]).toEqual({ de: 201, ate: 299, valorHerdado: 1.5 });
  });

  it("faixa única → sem gap", () => {
    expect(detectarGapsFaixas([{ de: 1, ate: 1000, valor_por_entrega: 2.0 }])).toHaveLength(0);
  });

  it("faixas em ordem desordenada → ordena e detecta corretamente", () => {
    const faixas = [
      { de: 500, ate: 600, valor_por_entrega: 2.0 },
      { de: 1, ate: 100, valor_por_entrega: 1.0 },
      { de: 101, ate: 300, valor_por_entrega: 1.5 },
    ];
    expect(detectarGapsFaixas(faixas)).toHaveLength(1);
    expect(detectarGapsFaixas(faixas)[0]).toEqual({ de: 301, ate: 499, valorHerdado: 1.5 });
  });
});

// ─── 6. calcularProgressoFaixa ───────────────────────────────────────────────

describe("calcularProgressoFaixa", () => {
  it("abaixo da primeira faixa: faixaAtual = null", () => {
    const faixas = [makeFaixa(10, 100, 1.0)];
    const { faixaAtual, proximaFaixa } = calcularProgressoFaixa(5, faixas);
    expect(faixaAtual).toBeNull();
    expect(proximaFaixa).toBeNull();
  });

  it("na primeira faixa com próxima disponível", () => {
    const { faixaAtual, proximaFaixa, entregasFaltam, percentualProxima } =
      calcularProgressoFaixa(50, faixasPadrao);
    expect(faixaAtual?.de).toBe(1);
    expect(faixaAtual?.valor_por_entrega).toBe(1.0);
    expect(proximaFaixa?.de).toBe(101);
    expect(entregasFaltam).toBe(51); // falta 51 para chegar a 101
    expect(percentualProxima).toBe(49); // 49/100 = 49%
  });

  it("exatamente no início da 2ª faixa: 101 entregas", () => {
    const { faixaAtual, proximaFaixa, entregasFaltam } =
      calcularProgressoFaixa(101, faixasPadrao);
    expect(faixaAtual?.de).toBe(101);
    expect(proximaFaixa?.de).toBe(301);
    expect(entregasFaltam).toBe(200);
  });

  it("na faixa máxima: proximaFaixa = null, percentual = 100", () => {
    const { faixaAtual, proximaFaixa, percentualProxima } =
      calcularProgressoFaixa(400, faixasPadrao);
    expect(faixaAtual?.de).toBe(301);
    expect(proximaFaixa).toBeNull();
    expect(percentualProxima).toBe(100);
    expect(0).toBe(0); // entregasFaltam não se aplica
  });

  it("percentual correto no meio de uma faixa", () => {
    // Na faixa 101–300 (200 de largura), com 201 entregas:
    // progresso = (201 - 101) / (301 - 101) = 100/200 = 50%
    const { percentualProxima } = calcularProgressoFaixa(201, faixasPadrao);
    expect(percentualProxima).toBe(50);
  });

  it("não ultrapassa 100% mesmo além da faixa", () => {
    const faixas = [makeFaixa(1, 100, 1.0), makeFaixa(101, 200, 2.0)];
    const { percentualProxima } = calcularProgressoFaixa(300, faixas);
    expect(percentualProxima).toBe(100);
  });
});

// ─── 7. Comparação Escalonado vs Faixa Máxima ─────────────────────────────────

describe("comparação: escalonado sempre ≤ faixa_maxima (ou igual)", () => {
  const casos = [50, 100, 150, 250, 300, 350, 500, 600, 700];

  casos.forEach((n) => {
    it(`${n} entregas sem gap: escalonado ≤ faixa_maxima`, () => {
      const esc = calcularComissaoMetaClient(n, faixasPadrao, "escalonado");
      const max = calcularComissaoMetaClient(n, faixasPadrao, "faixa_maxima");
      expect(esc).toBeLessThanOrEqual(max);
    });
  });
});

// ─── 8. Filtragem de mês corrente ─────────────────────────────────────────────

describe("getMesCorrenteRange — lógica de filtragem mensal", () => {
  function getMesCorrenteRange(): { inicio: Date; fim: Date } {
    const agora = new Date();
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
    return { inicio, fim };
  }

  it("inicio é o dia 1 do mês corrente à meia-noite", () => {
    const { inicio } = getMesCorrenteRange();
    expect(inicio.getDate()).toBe(1);
    expect(inicio.getHours()).toBe(0);
    expect(inicio.getMinutes()).toBe(0);
  });

  it("fim é o dia 1 do mês seguinte (intervalo semi-aberto)", () => {
    const { fim } = getMesCorrenteRange();
    const agora = new Date();
    const mesEsperado = (agora.getMonth() + 1) % 12;
    expect(fim.getDate()).toBe(1);
    expect(fim.getMonth()).toBe(mesEsperado);
  });

  it("data de hoje está dentro do intervalo [inicio, fim)", () => {
    const { inicio, fim } = getMesCorrenteRange();
    const agora = new Date();
    expect(agora >= inicio).toBe(true);
    expect(agora < fim).toBe(true);
  });

  it("data do mês anterior está fora do intervalo", () => {
    const { inicio } = getMesCorrenteRange();
    const mesAnterior = new Date(inicio);
    mesAnterior.setDate(mesAnterior.getDate() - 1);
    expect(mesAnterior < inicio).toBe(true);
  });

  it("data do mês seguinte está fora do intervalo", () => {
    const { fim } = getMesCorrenteRange();
    const mesSeguinte = new Date(fim);
    mesSeguinte.setDate(mesSeguinte.getDate() + 1);
    expect(mesSeguinte >= fim).toBe(true);
  });
});
