"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "dark" | "light";
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "light",
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = () => {
      const isDark =
        theme === "dark" ||
        (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

      root.classList.toggle("dark", isDark);
      setResolvedTheme(isDark ? "dark" : "light");
    };

    applyTheme();
    localStorage.setItem("theme", theme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") applyTheme();
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
