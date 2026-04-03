import { create } from "zustand";

interface SystemSettings {
  limite_saldo_pre_pago: number;
}

interface SettingsStore extends SystemSettings {
  updateSetting: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  limite_saldo_pre_pago: 600,
  updateSetting: (key, value) => set({ [key]: value }),
}));
