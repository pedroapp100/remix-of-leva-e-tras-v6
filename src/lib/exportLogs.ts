import type { LogEntry } from "@/types/database";
import { formatDateTimeBR } from "@/lib/formatters";

const CATEGORIA_LABELS: Record<string, string> = {
  solicitacao: "Solicitação",
  fatura: "Fatura",
  financeiro: "Financeiro",
  cliente: "Cliente",
  entregador: "Entregador",
  configuracao: "Configuração",
  autenticacao: "Autenticação",
};

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function exportLogsCSV(logs: LogEntry[]) {
  const header = ["Data/Hora", "Usuário", "Categoria", "Ação", "Entidade", "Descrição", "Detalhes"];
  const rows = logs.map((l) => [
    formatDateTimeBR(l.timestamp),
    l.usuario_nome,
    CATEGORIA_LABELS[l.categoria] ?? l.categoria,
    l.acao.replace(/_/g, " "),
    l.entidade_id,
    l.descricao,
    l.detalhes ? JSON.stringify(l.detalhes) : "",
  ]);

  const csv = [header, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
  downloadFile(csv, "logs-auditoria.csv", "text/csv;charset=utf-8;");
}

export function exportLogsPDF(logs: LogEntry[]) {
  const rows = logs.map((l) => [
    formatDateTimeBR(l.timestamp),
    l.usuario_nome,
    CATEGORIA_LABELS[l.categoria] ?? l.categoria,
    l.acao.replace(/_/g, " "),
    l.entidade_id,
    l.descricao,
  ]);

  // Build a simple HTML table and print to PDF via browser
  const html = `
<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Logs de Auditoria</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  p.sub { color: #666; margin-top: 0; margin-bottom: 16px; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e293b; color: #fff; text-align: left; padding: 6px 8px; font-size: 10px; }
  td { border-bottom: 1px solid #e2e8f0; padding: 5px 8px; font-size: 10px; }
  tr:nth-child(even) { background: #f8fafc; }
  @media print { body { margin: 0; } }
</style>
</head><body>
<h1>Logs de Auditoria — Leva e Traz</h1>
<p class="sub">Gerado em ${formatDateTimeBR(new Date())} · ${logs.length} registros</p>
<table>
<thead><tr>
  <th>Data/Hora</th><th>Usuário</th><th>Categoria</th><th>Ação</th><th>Entidade</th><th>Descrição</th>
</tr></thead>
<tbody>
${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("\n")}
</tbody></table>
</body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) {
    w.onload = () => {
      w.print();
      URL.revokeObjectURL(url);
    };
  }
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob(["\uFEFF" + content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
