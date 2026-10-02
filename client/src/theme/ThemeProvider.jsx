import { useEffect, useMemo, useState } from "react";
import { getPreference, THEME_KEY, ThemeContext } from "./context";

export default function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(getPreference);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const resolvedTheme =
    preference === "system" ? (systemDark ? "dark" : "light") : preference;
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystem = (event) => setSystemDark(event.matches);
    const updateStorage = (event) => {
      if (event.key === THEME_KEY || event.key === null)
        setPreference(getPreference());
    };
    media.addEventListener("change", updateSystem);
    window.addEventListener("storage", updateStorage);
    return () => {
      media.removeEventListener("change", updateSystem);
      window.removeEventListener("storage", updateStorage);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        resolvedTheme === "dark" ? "#111318" : "#ffffff",
      );
    try {
      localStorage.setItem(THEME_KEY, preference);
    } catch {
      /* Theme remains available when storage is blocked. */
    }
  }, [resolvedTheme, preference]);
  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
