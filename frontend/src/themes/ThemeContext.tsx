import React, { createContext, useContext, useMemo, useState } from "react";
import { MantineProvider } from "@mantine/core";
import { AppPalette, AppTheme, ThemeName } from "./types.ts";
import { buildMantineTheme, isThemeName, themeList, themes } from "./registry.ts";

const STORAGE_KEY = "yatl-theme";

type ThemeContextValue = {
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
  theme: AppTheme;
  colors: AppPalette;
  themeList: AppTheme[];
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function loadStoredThemeName(): ThemeName {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isThemeName(stored)) return stored;
  } catch {
    // localStorage unavailable (e.g. private browsing) — fall back below.
  }
  return "dreamland";
}

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeName, setThemeNameState] = useState<ThemeName>(loadStoredThemeName);

  const setThemeName = (name: ThemeName) => {
    setThemeNameState(name);
    try {
      localStorage.setItem(STORAGE_KEY, name);
    } catch {
      // ignore persistence failures, theme still applies for this session
    }
  };

  const theme = themes[themeName];
  const mantineTheme = useMemo(() => buildMantineTheme(theme), [theme]);

  const value = useMemo<ThemeContextValue>(() => ({
    themeName,
    setThemeName,
    theme,
    colors: theme.colors,
    themeList,
  }), [themeName, theme]);

  return (
    <ThemeContext.Provider value={value}>
      <MantineProvider defaultColorScheme="dark" theme={mantineTheme}>
        {children}
      </MantineProvider>
    </ThemeContext.Provider>
  );
};

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within an AppThemeProvider");
  }
  return ctx;
}
