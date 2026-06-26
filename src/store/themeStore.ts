import { create } from "zustand";

type Theme = "blue" | "pink";

interface ThemeStore {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: (localStorage.getItem("ros-theme") as Theme | null) ?? "blue",
  setTheme: (theme) => {
    localStorage.setItem("ros-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },
}));
