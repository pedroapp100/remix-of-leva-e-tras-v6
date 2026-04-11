import { useState } from "react";
import { DataTable, SearchInput } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import {
  useDespesasRecorrentes,
  useCreateDespesaRecorrente,
  useUpdateDespesaRecorrente,
  useDeleteDespesaRecorrente,
} from "@/hooks/useFinanceiro";
import type { DespesaRecorrenteRow, DespesaRecorrenteInsert } from "@/services/financeiro";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

// ── Formulário (create / edit) ────────────────────────────────────────────────

interface FormState {
  descricao: string;
  categoria: string;
  valor_mensal: string;
  proximo_vencimento: string;
  ativo: boolean;
}

const EMPTY_FORM: FormState = {
  descricao: "",
  categoria: "",
  valor_mensal: "",
  proximo_vencimento: "",
  ativo: true,
};

function toFormState(row: DespesaRecorrenteRow): FormState {
  return {
    descricao: row.descricao,
    categoria: row.categoria,
    valor_mensal: String(row.valor_mensal),
    proximo_vencimento: row.proximo_vencimento,
    ativo: row.ativo,
  };
}

interface DespesaRecorrenteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: DespesaRecorrenteRow | null;
  onSave: (form: FormState) => void;
  isLoading: boolean;
}

function DespesaRecorrenteDialog({
  open,
  onOpenChange,
  editing,
  onSave,
  isLoading,
}: DespesaRecorrenteDialogProps) {
  const [form, setForm] = useState<FormState>(editing ? toFormState(editing) : EMPTY_FORM);

  // Reset form when dialog opens/editing changes
  const handleOpenChange = (v: boolean) => {
    if (v) setForm(editing ? toFormState(editing) : EMPTY_FORM);
    onOpenChange(v);
  };

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descricao.trim() || !form.valor_mensal || !form.proximo_vencimento) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar Despesa Recorrente" : "Nova Despesa Recorrente"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              value={form.descricao}
              onChange={(e) => set("descricao", e.target.value)}
              placeholder="Ex: Aluguel do escritório"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="categoria">Categoria</Label>
            <Input
              id="categoria"
              value={form.categoria}
              onChange={(e) => set("categoria", e.target.value)}
              placeholder="Ex: Infraestrutura"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="valor_mensal">Valor Mensal (R$) *</Label>
              <Input
                id="valor_mensal"
                type="number"
                min="0"
                step="0.01"
                value={form.valor_mensal}
                onChange={(e) => set("valor_mensal", e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proximo_vencimento">Próximo Vencimento *</Label>
              <Input
                id="proximo_vencimento"
                type="date"
                value={form.proximo_vencimento}
                onChange={(e) => set("proximo_vencimento", e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Ativo</Label>
              <p className="text-xs text-muted-foreground">
                Inclui esta despesa nos relatórios de previsão
              </p>
            </div>
            <Switch
              checked={form.ativo}
              onCheckedChange={(v) => set("ativo", v)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function DespesasRecorrentesTab() {
  const { data: despesas = [] } = useDespesasRecorrentes();
  const createMutation = useCreateDespesaRecorrente();
  const updateMutation = useUpdateDespesaRecorrente();
  const deleteMutation = useDeleteDespesaRecorrente();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DespesaRecorrenteRow | null>(null);

  const filtered = despesas.filter((d) =>
    d.descricao.toLowerCase().includes(search.toLowerCase()) ||
    d.categoria.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (row: DespesaRecorrenteRow) => {
    setEditing(row);
    setDialogOpen(true);
  };

  const handleToggleAtivo = (row: DespesaRecorrenteRow) => {
    updateMutation.mutate(
      { id: row.id, patch: { ativo: !row.ativo } },
      {
        onSuccess: () =>
          toast.success(
            `Despesa "${row.descricao}" ${!row.ativo ? "ativada" : "desativada"}.`
          ),
      }
    );
  };

  const handleDelete = (row: DespesaRecorrenteRow) => {
    if (!confirm(`Excluir a despesa recorrente "${row.descricao}"? Esta ação não pode ser desfeita.`)) return;
    deleteMutation.mutate(row.id, {
      onSuccess: () => toast.success(`Despesa "${row.descricao}" excluída.`),
    });
  };

  const handleSave = (form: FormState) => {
    const valor = parseFloat(form.valor_mensal);
    if (editing) {
      updateMutation.mutate(
        {
          id: editing.id,
          patch: {
            descricao: form.descricao.trim(),
            categoria: form.categoria.trim(),
            valor_mensal: valor,
            proximo_vencimento: form.proximo_vencimento,
            ativo: form.ativo,
          },
        },
        {
          onSuccess: () => {
            setDialogOpen(false);
            toast.success("Despesa recorrente atualizada.");
          },
        }
      );
    } else {
      const insert: DespesaRecorrenteInsert = {
        descricao: form.descricao.trim(),
        categoria: form.categoria.trim(),
        valor_mensal: valor,
        proximo_vencimento: form.proximo_vencimento,
        ativo: form.ativo,
      };
      createMutation.mutate(insert, {
        onSuccess: () => {
          setDialogOpen(false);
          toast.success("Despesa recorrente criada.");
        },
      });
    }
  };

  const columns: Column<DespesaRecorrenteRow>[] = [
    {
      key: "descricao",
      header: "Descrição",
      sortable: true,
      cell: (d) => <span className="font-medium">{d.descricao}</span>,
    },
    {
      key: "categoria",
      header: "Categoria",
      sortable: true,
      cell: (d) =>
        d.categoria ? (
          <Badge variant="outline" className="text-xs">
            {d.categoria}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "valor_mensal",
      header: "Valor/Mês",
      sortable: true,
      cell: (d) => (
        <span className="font-semibold tabular-nums">
          {formatCurrency(d.valor_mensal)}
        </span>
      ),
    },
    {
      key: "proximo_vencimento",
      header: "Próx. Vencimento",
      sortable: true,
      cell: (d) => (
        <span className="text-sm">{formatDateBR(d.proximo_vencimento)}</span>
      ),
    },
    {
      key: "ativo",
      header: "Status",
      cell: (d) => (
        <Badge
          variant={d.ativo ? "default" : "secondary"}
          className="cursor-pointer select-none"
          onClick={(e) => { e.stopPropagation(); handleToggleAtivo(d); }}
        >
          {d.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "acoes",
      header: "Ações",
      className: "text-center",
      cell: (d) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => { e.stopPropagation(); handleEdit(d); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); handleDelete(d); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const renderMobileCard = (d: DespesaRecorrenteRow) => (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{d.descricao}</span>
        <Badge
          variant={d.ativo ? "default" : "secondary"}
          className="cursor-pointer text-xs"
          onClick={() => handleToggleAtivo(d)}
        >
          {d.ativo ? "Ativo" : "Inativo"}
        </Badge>
      </div>
      {d.categoria && (
        <Badge variant="outline" className="text-xs w-fit">{d.categoria}</Badge>
      )}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          Venc.: {formatDateBR(d.proximo_vencimento)}
        </span>
        <span className="font-semibold tabular-nums">
          {formatCurrency(d.valor_mensal)}/mês
        </span>
      </div>
      <div className="flex gap-2 mt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => handleEdit(d)}
        >
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive"
          onClick={() => handleDelete(d)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );

  const isMutating =
    createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por descrição ou categoria..."
          className="flex-1 min-w-[200px]"
        />
        <Button size="sm" className="gap-1.5" onClick={handleCreate}>
          <Plus className="h-4 w-4" /> Nova Despesa Recorrente
        </Button>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        pageSize={10}
        renderMobileCard={renderMobileCard}
        emptyTitle="Nenhuma despesa recorrente"
        emptySubtitle="Cadastre despesas fixas mensais para acompanhar no relatório de previsão."
      />

      <DespesaRecorrenteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSave={handleSave}
        isLoading={isMutating}
      />
    </div>
  );
}
