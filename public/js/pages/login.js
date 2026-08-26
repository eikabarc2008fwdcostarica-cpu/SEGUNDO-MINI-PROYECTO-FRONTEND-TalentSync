"use strict";

import { login, saveSession } from "../services/api.js";
import { redirectIfAuthenticated } from "../common/auth.js";
import { $ } from "../common/ui.js";

const STATIC_SERVER_PORTS = new Set(["5500", "5501"]);
const THEME_KEY = "talentsync_theme";
const COLOR_MODE_KEY = "talentsync_color_mode";
const FONT_SCALE_KEY = "talentsync_font_scale";
const VOICE_KEY = "talentsync_login_voice";

const visualModes = Object.freeze({
  base: {
    theme: "light",
    colorMode: "none",
    label: "Tema base",
  },
  dark: {
    theme: "dark",
    colorMode: "none",
    label: "Modo oscuro",
  },
  "high-contrast": {
    theme: "light",
    colorMode: "high-contrast",
    label: "Alto contraste",
  },
  protanopia: {
    theme: "light",
    colorMode: "protanopia",
    label: "Modo protanopia",
  },
  deuteranopia: {
    theme: "light",
    colorMode: "deuteranopia",
    label: "Modo deuteranopia",
  },
  tritanopia: {
    theme: "light",
    colorMode: "tritanopia",
    label: "Modo tritanopia",
  },
  monochrome: {
    theme: "light",
    colorMode: "monochrome",
    label: "Modo monocromático",
  },
});

const validFontScales = new Set([
  "small",
  "normal",
  "large",
  "xlarge",
]);

const root = document.documentElement;
const form = $("#login-form");
const usernameInput = $("#username");
const passwordInput = $("#password");
const humanCheck = $("#human-check");
const loginButton = $("#login-button");
const loginButtonText = $("span", loginButton);
const errorElement = $("#login-error");
const accessibilityButton = $("#login-accessibility-button");
const accessibilityPanel = $("#login-accessibility-panel");
const closeAccessibilityButton = $("#close-login-accessibility");
const voiceToggle = $("#login-voice-toggle");
const voiceStatus = $("#login-voice-status");
const themeStatus = $("#login-theme-status");
const offlineBanner = $("#offline");

const preferences = loadPreferences();

if (
  location.protocol === "file:" ||
  STATIC_SERVER_PORTS.has(location.port)
) {
  location.replace(
    "http://localhost:5173/pages/index.html",
  );

  await new Promise(() => {});
}

applyPreferences();
updateConnectionStatus();

await redirectIfAuthenticated();

usernameInput.focus();

function readStoredObject(key) {
  try {
    return JSON.parse(
      localStorage.getItem(key) || "null",
    );
  } catch {
    return null;
  }
}

function loadPreferences() {
  const legacy =
    readStoredObject("talentsync_accessibility") || {};

  const savedTheme =
    localStorage.getItem(THEME_KEY) ||
    legacy.theme;

  const savedColorMode =
    localStorage.getItem(COLOR_MODE_KEY) ||
    legacy.colorMode;

  const savedFontScale =
    localStorage.getItem(FONT_SCALE_KEY) ||
    legacy.fontScale;

  const savedVoice =
    localStorage.getItem(VOICE_KEY);

  return {
    theme:
      savedTheme === "dark"
        ? "dark"
        : "light",

    colorMode:
      Object.hasOwn(
        visualModes,
        savedColorMode,
      )
        ? savedColorMode
        : "none",

    fontScale:
      validFontScales.has(savedFontScale)
        ? savedFontScale
        : "normal",

    voiceEnabled:
      savedVoice === null
        ? Boolean(legacy.voiceEnabled)
        : savedVoice === "true",
  };
}

function savePreferences() {
  localStorage.setItem(
    THEME_KEY,
    preferences.theme,
  );

  localStorage.setItem(
    COLOR_MODE_KEY,
    preferences.colorMode,
  );

  localStorage.setItem(
    FONT_SCALE_KEY,
    preferences.fontScale,
  );

  localStorage.setItem(
    VOICE_KEY,
    String(preferences.voiceEnabled),
  );
}

function getCurrentVisualMode() {
  if (preferences.colorMode !== "none") {
    return preferences.colorMode;
  }

  return preferences.theme === "dark"
    ? "dark"
    : "base";
}

function applyPreferences() {
  const currentMode =
    getCurrentVisualMode();

  root.dataset.theme =
    preferences.theme;

  root.dataset.colorMode =
    preferences.colorMode;

  root.dataset.fontScale =
    preferences.fontScale;

  document
    .querySelectorAll("[data-login-theme]")
    .forEach((button) => {
      const selected =
        button.dataset.loginTheme ===
        currentMode;

      button.classList.toggle(
        "is-active",
        selected,
      );

      button.setAttribute(
        "aria-pressed",
        String(selected),
      );
    });

  document
    .querySelectorAll(
      "[data-login-font-scale]",
    )
    .forEach((button) => {
      const selected =
        button.dataset.loginFontScale ===
        preferences.fontScale;

      button.classList.toggle(
        "is-active",
        selected,
      );

      button.setAttribute(
        "aria-pressed",
        String(selected),
      );
    });

  const selectedMode =
    visualModes[currentMode] ||
    visualModes.base;

  themeStatus.textContent =
    `Tema seleccionado: ${selectedMode.label}.`;

  voiceToggle.classList.toggle(
    "is-active",
    preferences.voiceEnabled,
  );

  voiceToggle.setAttribute(
    "aria-pressed",
    String(preferences.voiceEnabled),
  );

  voiceStatus.textContent =
    preferences.voiceEnabled
      ? "Activada"
      : "Desactivada";

  savePreferences();
}

function speak(text, force = false) {
  if (
    (!preferences.voiceEnabled && !force) ||
    !("speechSynthesis" in window) ||
    !text
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const message =
    new SpeechSynthesisUtterance(
      String(text),
    );

  message.lang = "es-CR";
  message.rate = 0.95;
  message.pitch = 1;

  window.speechSynthesis.speak(message);
}

function setVisualMode(mode) {
  const selectedMode =
    visualModes[mode] ||
    visualModes.base;

  preferences.theme =
    selectedMode.theme;

  preferences.colorMode =
    selectedMode.colorMode;

  applyPreferences();

  speak(
    `${selectedMode.label} activado.`,
  );
}

function setFontScale(fontScale) {
  if (!validFontScales.has(fontScale)) {
    return;
  }

  const messages = {
    small:
      "Texto reducido al noventa por ciento.",

    normal:
      "Tamaño de texto normal.",

    large:
      "Texto aumentado al ciento quince por ciento.",

    xlarge:
      "Texto aumentado al ciento treinta por ciento.",
  };

  preferences.fontScale = fontScale;

  applyPreferences();
  speak(messages[fontScale]);
}

function toggleVoice() {
  if (!("speechSynthesis" in window)) {
    showLoginError(
      "La asistencia por voz no está disponible en este navegador.",
    );

    return;
  }

  preferences.voiceEnabled =
    !preferences.voiceEnabled;

  applyPreferences();

  if (preferences.voiceEnabled) {
    speak(
      "Asistencia por voz activada.",
      true,
    );
  } else {
    window.speechSynthesis.cancel();
  }
}

function openAccessibilityPanel() {
  accessibilityPanel.hidden = false;

  accessibilityButton.setAttribute(
    "aria-expanded",
    "true",
  );

  closeAccessibilityButton.focus();

  speak(
    "Panel de accesibilidad abierto.",
  );
}

function closeAccessibilityPanel(
  returnFocus = true,
) {
  accessibilityPanel.hidden = true;

  accessibilityButton.setAttribute(
    "aria-expanded",
    "false",
  );

  if (returnFocus) {
    accessibilityButton.focus();
  }
}

function toggleAccessibilityPanel() {
  if (accessibilityPanel.hidden) {
    openAccessibilityPanel();
  } else {
    closeAccessibilityPanel();
  }
}

function clearLoginError() {
  errorElement.textContent = "";
  errorElement.hidden = true;
}

function showLoginError(message) {
  errorElement.textContent = message;
  errorElement.hidden = false;

  speak(message);
}

function getFriendlyLoginError(error) {
  const message = String(
    error?.message || "",
  ).toLowerCase();

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("conexión")
  ) {
    return "No se pudo conectar con el servicio. Revisa tu conexión.";
  }

  if (
    message.includes("timeout") ||
    message.includes("tiempo") ||
    message.includes("abort")
  ) {
    return "El servicio tardó demasiado en responder. Inténtalo nuevamente.";
  }

  if (
    message.includes(
      "invalid credentials",
    ) ||
    message.includes(
      "username or password",
    ) ||
    message.includes("401")
  ) {
    return "El usuario o la contraseña son incorrectos.";
  }

  return (
    error?.message ||
    "No fue posible iniciar sesión. Inténtalo nuevamente."
  );
}

function setLoading(loading) {
  loginButton.disabled =
    loading || !navigator.onLine;

  loginButton.setAttribute(
    "aria-busy",
    String(loading),
  );

  loginButtonText.textContent =
    loading
      ? "Verificando..."
      : "Iniciar sesión";
}

function updateConnectionStatus() {
  const offline = !navigator.onLine;

  offlineBanner.hidden = !offline;
  loginButton.disabled = offline;

  if (offline) {
    showLoginError(
      "Sin conexión. Revisa tu conexión antes de iniciar sesión.",
    );
  } else if (
    errorElement.textContent.startsWith(
      "Sin conexión",
    )
  ) {
    clearLoginError();
  }
}

accessibilityButton.addEventListener(
  "click",
  toggleAccessibilityPanel,
);

closeAccessibilityButton.addEventListener(
  "click",
  () => closeAccessibilityPanel(),
);

accessibilityPanel.addEventListener(
  "click",
  (event) => event.stopPropagation(),
);

document
  .querySelectorAll("[data-login-theme]")
  .forEach((button) => {
    button.addEventListener(
      "click",
      () =>
        setVisualMode(
          button.dataset.loginTheme,
        ),
    );
  });

document
  .querySelectorAll(
    "[data-login-font-scale]",
  )
  .forEach((button) => {
    button.addEventListener(
      "click",
      () =>
        setFontScale(
          button.dataset.loginFontScale,
        ),
    );
  });

voiceToggle.addEventListener(
  "click",
  toggleVoice,
);

usernameInput.addEventListener(
  "focus",
  () =>
    speak(
      "Campo de nombre de usuario.",
    ),
);

passwordInput.addEventListener(
  "focus",
  () =>
    speak("Campo de contraseña."),
);

humanCheck.addEventListener(
  "focus",
  () =>
    speak(
      "Casilla para confirmar que eres una persona.",
    ),
);

usernameInput.addEventListener(
  "input",
  clearLoginError,
);

passwordInput.addEventListener(
  "input",
  clearLoginError,
);

humanCheck.addEventListener(
  "change",
  clearLoginError,
);

$("#toggle-password").addEventListener(
  "click",
  (event) => {
    const button = event.currentTarget;

    const showPassword =
      passwordInput.type === "password";

    passwordInput.type =
      showPassword
        ? "text"
        : "password";

    button.setAttribute(
      "aria-pressed",
      String(showPassword),
    );

    button.setAttribute(
      "aria-label",
      showPassword
        ? "Ocultar contraseña"
        : "Mostrar contraseña",
    );

    button.title = showPassword
      ? "Ocultar contraseña"
      : "Mostrar contraseña";

    speak(
      showPassword
        ? "Contraseña visible."
        : "Contraseña oculta.",
    );
  },
);

form.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();
    clearLoginError();

    const username =
      usernameInput.value.trim();

    const password =
      passwordInput.value;

    if (!username && !password) {
      showLoginError(
        "Debes ingresar el usuario y la contraseña.",
      );

      usernameInput.focus();
      return;
    }

    if (!username) {
      showLoginError(
        "Debes ingresar el nombre de usuario.",
      );

      usernameInput.focus();
      return;
    }

    if (!password) {
      showLoginError(
        "Debes ingresar la contraseña.",
      );

      passwordInput.focus();
      return;
    }

    if (!humanCheck.checked) {
      showLoginError(
        "Confirma que eres una persona antes de continuar.",
      );

      humanCheck.focus();
      return;
    }

    setLoading(true);

    try {
      const session = await login(
        username,
        password,
      );

      if (!session?.accessToken) {
        throw new Error(
          "La autenticación no devolvió un token válido.",
        );
      }

      saveSession(session);

      speak(
        "Sesión iniciada correctamente.",
      );

      location.assign(
        "/pages/dashboard.html",
      );
    } catch (error) {
      console.error(
        "Error técnico durante el inicio de sesión:",
        error,
      );

      showLoginError(
        getFriendlyLoginError(error),
      );
    } finally {
      setLoading(false);
    }
  },
);

document.addEventListener(
  "click",
  (event) => {
    if (
      !event.target.closest(
        "#login-accessibility-panel",
      ) &&
      !event.target.closest(
        "#login-accessibility-button",
      )
    ) {
      closeAccessibilityPanel(false);
    }
  },
);

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape" &&
      !accessibilityPanel.hidden
    ) {
      closeAccessibilityPanel();
    }
  },
);

window.addEventListener(
  "online",
  updateConnectionStatus,
);

window.addEventListener(
  "offline",
  updateConnectionStatus,
);