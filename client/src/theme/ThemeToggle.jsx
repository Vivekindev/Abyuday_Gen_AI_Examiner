import { FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "./context";

export default function ThemeToggle() {
  const { resolvedTheme, setPreference } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <button
      className="icon-button theme-toggle"
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark theme"
      title={`Switch to ${dark ? "light" : "dark"} theme`}
      onClick={() => setPreference(dark ? "light" : "dark")}
    >
      {dark ? <FiSun /> : <FiMoon />}
    </button>
  );
}
