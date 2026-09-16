import { createTheme, MantineColorsTuple, MantineThemeOverride } from "@mantine/core";
import { AppPalette, AppTheme, ThemeName } from "./types.ts";
import dreamland from "./dreamland.ts";
import brrrgh from "./brrrgh.ts";

export const themes: Record<ThemeName, AppTheme> = {
  dreamland,
  brrrgh,
};

export const themeList: AppTheme[] = Object.values(themes);

export function isThemeName(value: string): value is ThemeName {
  return value in themes;
}

// Mantine's dark colour scale runs light (0) to dark (9). This picks the
// same 10 roles out of the palette that the original hand-built Dreamland
// scale used, so every theme's UI chrome (panels, borders, inputs) shades
// the same way.
function toMantineDarkScale(colors: AppPalette): MantineColorsTuple {
  return [
    colors.Text,
    colors.Subtext1,
    colors.Subtext0,
    colors.Overlay1,
    colors.Surface2,
    colors.Surface1,
    colors.Surface0,
    colors.Base,
    colors.Mantle,
    colors.Crust,
  ];
}

export function buildMantineTheme(theme: AppTheme): MantineThemeOverride {
  return createTheme({
    primaryColor: theme.primaryColor,
    colors: {
      dark: toMantineDarkScale(theme.colors),
    },
  });
}
