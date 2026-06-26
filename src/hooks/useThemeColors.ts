import { useThemeStore } from "../store/themeStore";

const BLUE = { brand: "#3d8bff", brandDeep: "#1f5fe0", brandCyan: "#00d4ff" } as const;
const PINK = { brand: "#ff5d8f", brandDeep: "#d43a6a", brandCyan: "#ff8fb3" } as const;

/** Returns actual hex color values for Recharts SVG attributes (which cannot use CSS vars). */
export function useThemeColors() {
  const theme = useThemeStore((s) => s.theme);
  return theme === "pink" ? PINK : BLUE;
}
