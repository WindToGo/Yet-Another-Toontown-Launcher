export interface AppPalette {
  Rosewater: string;
  Flamingo: string;
  Pink: string;
  Mauve: string;
  Red: string;
  Maroon: string;
  Peach: string;
  Yellow: string;
  Green: string;
  Teal: string;
  Sky: string;
  Sapphire: string;
  Blue: string;
  Lavender: string;
  Text: string;
  Subtext1: string;
  Subtext0: string;
  Overlay2: string;
  Overlay1: string;
  Overlay0: string;
  Surface2: string;
  Surface1: string;
  Surface0: string;
  Base: string;
  Mantle: string;
  Crust: string;
}

export type ThemeName = "dreamland" | "brrrgh";

export interface AppTheme {
  name: ThemeName;
  label: string;
  primaryColor: string;
  colors: AppPalette;
}
