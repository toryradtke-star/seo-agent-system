import { baseTokens } from "./tokens.js";

export const themes = {
  clinic: baseTheme({
    primary: "#146C78",
    secondary: "#8FD3D8",
    accent: "#1F3C58",
    surface: "#F5FBFC"
  }),
  corporate: baseTheme({
    primary: "#1D3557",
    secondary: "#457B9D",
    accent: "#0B132B",
    surface: "#F8FAFC"
  }),
  startup: baseTheme({
    primary: "#EF476F",
    secondary: "#FFD166",
    accent: "#073B4C",
    surface: "#FFF8EF"
  }),
  gym: baseTheme({
    primary: "#D62828",
    secondary: "#F77F00",
    accent: "#252422",
    surface: "#FCF7F0"
  }),
  "local-service": baseTheme({
    primary: "#2A9D8F",
    secondary: "#E9C46A",
    accent: "#264653",
    surface: "#FCFBF7"
  })
};

export function resolveThemeTokens(themeName, colorOverrides) {
  const baseThemeTokens = themes[themeName] || themes.clinic;
  if (!colorOverrides) {
    return baseThemeTokens;
  }

  return {
    ...baseThemeTokens,
    colors: {
      ...baseThemeTokens.colors,
      ...colorOverrides,
      secondary: colorOverrides.secondary || colorOverrides.primary || baseThemeTokens.colors.secondary,
      text: colorOverrides.text || colorOverrides.accent || baseThemeTokens.colors.text
    }
  };
}

function baseTheme(colors) {
  return {
    ...baseTokens,
    colors: {
      ...baseTokens.colors,
      ...colors
    }
  };
}
