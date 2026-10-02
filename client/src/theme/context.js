import { createContext, useContext } from "react";

export const ThemeContext = createContext(null);
export const THEME_KEY = "abyuday.theme";
export const getPreference = () => {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return ["light", "dark", "system"].includes(stored) ? stored : "system";
  } catch {
    return "system";
  }
};
export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("Theme controls require ThemeProvider");
  return value;
}
