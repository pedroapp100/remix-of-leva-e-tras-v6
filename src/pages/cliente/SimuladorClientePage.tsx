import { PageContainer } from "@/components/shared/PageContainer";
import { SimuladorOperacoes } from "@/components/shared/SimuladorOperacoes";
import { useClienteId } from "@/hooks/useClienteId";

export default function SimuladorClientePage() {
  const { clienteId } = useClienteId();
  return (
    <PageContainer
      title="Simulador de Operações"
      subtitle="Simule o custo das suas entregas antes de solicitar."
    >
      <SimuladorOperacoes clienteId={clienteId} />
    </PageContainer>
  );
}
