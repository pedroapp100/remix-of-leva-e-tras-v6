import { create } from "zustand";
import { supabase } from "@/lib/supabase";

interface SystemSettings {
  limite_saldo_pre_pago: number;
  cliente_pages_enabled: string[];
}

interface SettingsStore extends SystemSettings {
  _loaded: boolean;
  updateSetting: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  limite_saldo_pre_pago: 600,
  cliente_pages_enabled: ["simulador"],
  _loaded: false,
  updateSetting: (key, value) => {
    set({ [key]: value });
    void supabase
      .from("system_settings")
      .upsert({ key, value: String(value) }, { onConflict: "key" });
  },
}));

// Hydrate settings from DB once on app load
void supabase
  .from("system_settings")
  .select("key, value")
  .then(({ data }) => {
    if (!data) return;
    const patch: Partial<SystemSettings> = {};
    for (const row of data) {
      if (row.key === "limite_saldo_pre_pago") {
        const n = Number(row.value);
        if (!isNaN(n)) patch.limite_saldo_pre_pago = n;
      }
      if (row.key === "cliente_pages_enabled") {
        patch.cliente_pages_enabled = row.value
          ? row.value.split(",").filter(Boolean)
          : ["simulador"];
      }
    }
    useSettingsStore.setState({ ...patch, _loaded: true });
  });
