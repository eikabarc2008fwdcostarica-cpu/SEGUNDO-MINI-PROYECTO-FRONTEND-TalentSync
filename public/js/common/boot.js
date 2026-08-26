"use strict";

(() => {
  const root = document.documentElement;
  const validThemes = new Set(["light", "dark", "high-contrast"]);
  const validColorModes = new Set(["none", "deuteranopia", "protanopia", "tritanopia"]);
  const validFontScales = new Set(["normal", "large", "xlarge"]);

  const readPreference = (key, validValues, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return validValues.has(value) ? value : fallback;
    } catch {
      return fallback;
    }
  };

  const theme = readPreference("talentsync_theme", validThemes, "light");

  root.dataset.theme = theme;
  root.dataset.colorMode = readPreference(
    "talentsync_color_mode",
    validColorModes,
    "none",
  );
  root.dataset.fontScale = readPreference(
    "talentsync_font_scale",
    validFontScales,
    "normal",
  );
  root.style.backgroundColor = theme === "dark" ? "#0f172a" : "#f5f7fb";
  root.style.colorScheme = theme === "dark" ? "dark" : "light";
  root.classList.add("ts-booting");
})();
