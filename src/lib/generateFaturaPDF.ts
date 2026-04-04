import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Fatura } from "@/types/database";
import { getLancamentosByFatura, getAjustesByFatura, getEntregasByFatura, TIPO_FATURAMENTO_LABELS } from "@/data/mockFaturas";
import type { EntregaFatura } from "@/data/mockFaturas";
import { formatCurrency, formatDateBR, formatDateTimeBR } from "@/lib/formatters";

export function generateFaturaPDF(
  fatura: Fatura,
  entregasExtras: Record<string, EntregaFatura[]> = {},
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = margin;

  // ── Header ──
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Leva e Traz", margin, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Gerado em ${formatDateTimeBR(new Date())}`, pageW - margin, y, { align: "right" });
  y += 10;

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Fatura info ──
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Fatura ${fatura.numero}`, margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const info = [
    ["Cliente", fatura.cliente_nome],
    ["Tipo", TIPO_FATURAMENTO_LABELS[fatura.tipo_faturamento] ?? fatura.tipo_faturamento],
    ["Emissão", formatDateBR(fatura.data_emissao)],
    ["Vencimento", formatDateBR(fatura.data_vencimento)],
    ["Status", fatura.status_geral],
    ["Entregas", String(fatura.total_entregas)],
  ];
  for (const [label, value] of info) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 28, y);
    y += 5;
  }
  y += 4;

  // ── Resumo Financeiro ──
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Financeiro", margin, y);
  y += 6;

  const ajustes = getAjustesByFatura(fatura.id);
  const totalAjustes = ajustes.reduce((sum, a) => sum + (a.tipo === "credito" ? a.valor : -a.valor), 0);
  const saldo = fatura.saldo_liquido ?? 0;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Item", "Valor"]],
    body: [
      ["Créditos Loja", formatCurrency(fatura.total_creditos_loja ?? 0)],
      ["Débitos Loja", formatCurrency(fatura.total_debitos_loja ?? 0)],
      ["Ajustes", formatCurrency(totalAjustes)],
      ["Saldo Líquido", formatCurrency(saldo)],
    ],
    theme: "grid",
    headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Entregas ──
  const entregas = [...getEntregasByFatura(fatura.id), ...(entregasExtras[fatura.id] || [])];
  if (entregas.length > 0) {
    if (y > 240) { doc.addPage(); y = margin; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Entregas Incluídas", margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Código", "Data", "Rotas", "Taxas", "Recebido Cliente"]],
      body: entregas.map((e) => [
        e.codigo,
        formatDateBR(e.data_conclusao),
        String(e.total_rotas),
        formatCurrency(e.valor_taxas),
        formatCurrency(e.valor_recebido_cliente),
      ]),
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
      foot: [[
        "", "", String(entregas.reduce((s, e) => s + e.total_rotas, 0)),
        formatCurrency(entregas.reduce((s, e) => s + e.valor_taxas, 0)),
        formatCurrency(entregas.reduce((s, e) => s + e.valor_recebido_cliente, 0)),
      ]],
      footStyles: { fillColor: [241, 245, 249], fontStyle: "bold", fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Lançamentos ──
  const lancamentos = getLancamentosByFatura(fatura.id);
  if (lancamentos.length > 0) {
    if (y > 240) { doc.addPage(); y = margin; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Lançamentos Financeiros", margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Descrição", "Tipo", "Valor", "Status"]],
      body: lancamentos.map((l) => [
        l.descricao,
        l.tipo === "credito_loja" ? "Crédito Loja" : l.tipo === "receita_operacao" ? "Receita Op." : l.tipo === "debito_loja" ? "Débito Loja" : "Ajuste",
        `${l.sinal === "debito" ? "- " : ""}${formatCurrency(l.valor)}`,
        l.status_liquidacao === "liquidado" ? "Liquidado" : l.status_liquidacao === "estornado" ? "Estornado" : "Pendente",
      ]),
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 2: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Ajustes ──
  if (ajustes.length > 0) {
    if (y > 240) { doc.addPage(); y = margin; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Ajustes Manuais", margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Motivo", "Tipo", "Valor", "Data"]],
      body: ajustes.map((a) => [
        a.motivo,
        a.tipo === "credito" ? "Crédito" : "Débito",
        `${a.tipo === "debito" ? "- " : "+ "}${formatCurrency(a.valor)}`,
        formatDateTimeBR(a.created_at),
      ]),
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 2: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Histórico ──
  if (fatura.historico.length > 0) {
    if (y > 250) { doc.addPage(); y = margin; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Histórico", margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Data/Hora", "Descrição"]],
      body: fatura.historico.map((h) => [
        formatDateTimeBR(h.timestamp),
        h.descricao,
      ]),
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
    });
  }

  // ── Footer on each page ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Leva e Traz — Fatura ${fatura.numero} — Página ${i}/${totalPages}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" },
    );
  }

  doc.save(`fatura-${fatura.numero}.pdf`);
}
