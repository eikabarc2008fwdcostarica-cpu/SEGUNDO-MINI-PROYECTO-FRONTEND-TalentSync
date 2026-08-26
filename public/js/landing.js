(() => {
  "use strict";

  /* =======================================================
     CONFIGURACIÓN GENERAL
     ======================================================= */

  const STORAGE_KEY = "talentsync_landing_accessibility";
  const LANGUAGE_STORAGE_KEY = "talentsync_landing_language";
  const SUPPORTED_LANGUAGES = ["es", "fr", "en", "zh", "ru"];
  const LANGUAGE_TAGS = Object.freeze({
    es: "es",
    fr: "fr",
    en: "en",
    zh: "zh-CN",
    ru: "ru",
  });
  const originalTextByNode = new WeakMap();
  const originalAttributesByElement = new WeakMap();

  const VALID_OPTIONS = Object.freeze({
    theme: ["light", "dark", "high-contrast"],
    colorMode: ["none", "protanopia", "deuteranopia", "tritanopia", "monochrome"],
    fontScale: ["small", "normal", "large", "xlarge"],
  });

  const getSystemReduceMotion = () =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  const DEFAULT_PREFERENCES = Object.freeze({
    theme: "light",
    colorMode: "none",
    fontScale: "normal",
    reduceMotion: getSystemReduceMotion(),
  });

  const root = document.documentElement;
  const liveRegion = document.querySelector("#live-region");

  const state = {
    initialized: false,
    language: "es",
    preferences: { ...DEFAULT_PREFERENCES },
    activeSectionId: "inicio",
    previousFocus: new WeakMap(),
    speech: {
      supported: false,
      synthesizer: null,
      voices: [],
      queue: [],
      currentIndex: 0,
      currentUtterance: null,
      isReading: false,
      isPaused: false,
      runId: 0,
    },
  };

  /* =======================================================
     INICIO DE LA INTERFAZ
     ======================================================= */

  const initialize = () => {
    if (state.initialized) return;

    state.initialized = true;
    state.preferences = loadPreferences();

    initializeLanguageSelector();
    applyPreferences({ persist: false, announce: false });
    initializeMobileNavigation();
    initializeDialogs();
    initializeAccessibilitySettings();
    initializeRegistrationDemo();
    initializeNavigationTracking();
    initializeFaqBehavior();
    initializeSpeechReader();
    initializeKeyboardShortcuts();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

  /* =======================================================
     UTILIDADES
     ======================================================= */

  function announce(message) {
    if (!liveRegion || !message) return;

    liveRegion.textContent = "";

    window.setTimeout(() => {
      liveRegion.textContent = translateText(message);
    }, 40);
  }

  function translateText(text, language = state.language) {
    return window.TalentSyncI18n?.translate(text, language) ?? text;
  }

  function loadLanguage() {
    try {
      const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return SUPPORTED_LANGUAGES.includes(storedLanguage) ? storedLanguage : "es";
    } catch (error) {
      console.warn("No fue posible leer el idioma guardado.", error);
      return "es";
    }
  }

  function preserveWhitespace(originalText, translatedText) {
    const leading = originalText.match(/^\s*/)?.[0] ?? "";
    const trailing = originalText.match(/\s*$/)?.[0] ?? "";
    return `${leading}${translatedText}${trailing}`;
  }

  function applyLanguage(language, { persist = true, announceChange = true } = {}) {
    const nextLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : "es";
    state.language = nextLanguage;
    root.lang = LANGUAGE_TAGS[nextLanguage];

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!node.textContent.trim() || !parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest("script, style, [data-no-translate]")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((node) => {
      if (!originalTextByNode.has(node)) originalTextByNode.set(node, node.textContent);
      const original = originalTextByNode.get(node);
      node.textContent = preserveWhitespace(original, translateText(original.trim(), nextLanguage));
    });

    document.querySelectorAll("[aria-label], [placeholder], [title]").forEach((element) => {
      if (!originalAttributesByElement.has(element)) {
        const originals = {};
        ["aria-label", "placeholder", "title"].forEach((attribute) => {
          if (element.hasAttribute(attribute)) originals[attribute] = element.getAttribute(attribute);
        });
        originalAttributesByElement.set(element, originals);
      }

      const originals = originalAttributesByElement.get(element);
      Object.entries(originals).forEach(([attribute, original]) => {
        element.setAttribute(attribute, translateText(original, nextLanguage));
      });
    });

    document.title = translateText("TalentSync | Gestión de talento y reclutamiento", nextLanguage);
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.content = translateText(
        "TalentSync conecta a personas que buscan empleo con empresas y facilita la gestión organizada de los procesos de reclutamiento.",
        nextLanguage,
      );
    }

    const selector = document.querySelector("#language-selector");
    if (selector) selector.value = nextLanguage;

    if (persist) {
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      } catch (error) {
        console.warn("No fue posible guardar el idioma seleccionado.", error);
      }
    }

    if (announceChange) announce("Idioma actualizado.");
  }

  function initializeLanguageSelector() {
    const selector = document.querySelector("#language-selector");
    const initialLanguage = loadLanguage();
    applyLanguage(initialLanguage, { persist: false, announceChange: false });

    selector?.addEventListener("change", () => {
      applyLanguage(selector.value);
    });
  }

  function safeReadStorage() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.warn("No fue posible leer las preferencias locales.", error);
      return null;
    }
  }

  function safeWriteStorage(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
      return true;
    } catch (error) {
      console.warn("No fue posible guardar las preferencias locales.", error);
      return false;
    }
  }

  function isValidOption(property, value) {
    return VALID_OPTIONS[property]?.includes(value) ?? false;
  }

  function getFocusableElements(container) {
    if (!container) return [];

    return [...container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
  }

  /* =======================================================
     PREFERENCIAS DE ACCESIBILIDAD
     ======================================================= */

  function loadPreferences() {
    const storedValue = safeReadStorage();

    if (!storedValue) {
      return { ...DEFAULT_PREFERENCES };
    }

    try {
      const parsedValue = JSON.parse(storedValue);

      return {
        theme: isValidOption("theme", parsedValue.theme)
          ? parsedValue.theme
          : DEFAULT_PREFERENCES.theme,
        colorMode: isValidOption("colorMode", parsedValue.colorMode)
          ? parsedValue.colorMode
          : DEFAULT_PREFERENCES.colorMode,
        fontScale: isValidOption("fontScale", parsedValue.fontScale)
          ? parsedValue.fontScale
          : DEFAULT_PREFERENCES.fontScale,
        reduceMotion:
          typeof parsedValue.reduceMotion === "boolean"
            ? parsedValue.reduceMotion
            : DEFAULT_PREFERENCES.reduceMotion,
      };
    } catch (error) {
      console.warn("Las preferencias guardadas no tenían un formato válido.", error);
      return { ...DEFAULT_PREFERENCES };
    }
  }

  function applyPreferences({ persist = true, announce: shouldAnnounce = true } = {}) {
    const { theme, colorMode, fontScale, reduceMotion } = state.preferences;

    root.dataset.theme = theme;
    root.dataset.colorMode = colorMode;
    root.dataset.fontScale = fontScale;
    root.dataset.reduceMotion = String(reduceMotion);

    updatePressedSettings("theme", theme);
    updatePressedSettings("color-mode", colorMode);
    updatePressedSettings("font-scale", fontScale);

    const reduceMotionInput = document.querySelector("#reduce-motion");
    if (reduceMotionInput) {
      reduceMotionInput.checked = reduceMotion;
    }

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      if (theme === "dark") themeColor.content = "#102224";
      else if (theme === "high-contrast") themeColor.content = "#000000";
      else themeColor.content = "#087f72";
    }

    if (persist) {
      safeWriteStorage(JSON.stringify(state.preferences));
    }

    if (shouldAnnounce) {
      announce("Preferencias de accesibilidad actualizadas.");
    }
  }

  function updatePressedSettings(settingName, activeValue) {
    const settingGroup = document.querySelector(`[data-setting="${settingName}"]`);
    if (!settingGroup) return;

    settingGroup.querySelectorAll("button[data-value]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.value === activeValue));
    });
  }

  function initializeAccessibilitySettings() {
    document.querySelectorAll("[data-setting]").forEach((settingGroup) => {
      settingGroup.addEventListener("click", (event) => {
        const selectedButton = event.target.closest("button[data-value]");
        if (!selectedButton || !settingGroup.contains(selectedButton)) return;

        const settingName = settingGroup.dataset.setting;
        const selectedValue = selectedButton.dataset.value;

        if (settingName === "theme" && isValidOption("theme", selectedValue)) {
          state.preferences.theme = selectedValue;
        }

        if (settingName === "color-mode" && isValidOption("colorMode", selectedValue)) {
          state.preferences.colorMode = selectedValue;
        }

        if (settingName === "font-scale" && isValidOption("fontScale", selectedValue)) {
          state.preferences.fontScale = selectedValue;
        }

        applyPreferences();
      });
    });

    const reduceMotionInput = document.querySelector("#reduce-motion");

    reduceMotionInput?.addEventListener("change", () => {
      state.preferences.reduceMotion = reduceMotionInput.checked;
      applyPreferences();
    });

    document.querySelector("#reset-accessibility")?.addEventListener("click", () => {
      state.preferences = {
        ...DEFAULT_PREFERENCES,
        reduceMotion: getSystemReduceMotion(),
      };

      applyPreferences({ persist: true, announce: false });
      announce("Las preferencias de accesibilidad fueron restablecidas.");
    });
  }

  /* =======================================================
     MENÚ RESPONSIVO
     ======================================================= */

  function initializeMobileNavigation() {
    const menuToggle = document.querySelector("#menu-toggle");
    const navigation = document.querySelector("#main-navigation");

    if (!menuToggle || !navigation) return;

    const setMenuState = (isOpen) => {
      navigation.classList.toggle("is-open", isOpen);
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute(
        "aria-label",
        isOpen ? "Cerrar menú principal" : "Abrir menú principal",
      );
    };

    menuToggle.addEventListener("click", () => {
      setMenuState(menuToggle.getAttribute("aria-expanded") !== "true");
    });

    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        setMenuState(false);
      }
    });

    document.addEventListener("click", (event) => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      const clickedInsideNavigation = navigation.contains(event.target);
      const clickedToggle = menuToggle.contains(event.target);

      if (isOpen && !clickedInsideNavigation && !clickedToggle) {
        setMenuState(false);
      }
    });

    window.matchMedia("(min-width: 769px)").addEventListener?.("change", (event) => {
      if (event.matches) setMenuState(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        setMenuState(false);
        menuToggle.focus();
      }
    });
  }

  /* =======================================================
     VENTANAS DE DIÁLOGO
     ======================================================= */

  function initializeDialogs() {
    const accessibilityDialog = document.querySelector("#accessibility-dialog");
    const registerDialog = document.querySelector("#register-dialog");

    const accessibilityTriggers = [
      "#open-accessibility",
      "#open-accessibility-section",
      "#footer-accessibility",
      "#floating-accessibility",
    ];

    accessibilityTriggers.forEach((selector) => {
      document.querySelector(selector)?.addEventListener("click", (event) => {
        openDialog(accessibilityDialog, event.currentTarget);
      });
    });

    document.querySelectorAll(".register-trigger").forEach((trigger) => {
      trigger.addEventListener("click", () => {
        openDialog(registerDialog, trigger);
      });
    });

    document.querySelectorAll("dialog").forEach((dialog) => {
      dialog.querySelectorAll(".dialog-close, .dialog-cancel").forEach((button) => {
        button.addEventListener("click", () => closeDialog(dialog));
      });

      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeDialog(dialog);
      });

      dialog.addEventListener("close", () => restoreDialogFocus(dialog));

      dialog.addEventListener("cancel", () => {
        window.setTimeout(() => restoreDialogFocus(dialog), 0);
      });

      dialog.addEventListener("keydown", (event) => keepFocusInsideDialog(event, dialog));
    });
  }

  function openDialog(dialog, trigger) {
    if (!dialog) return;

    document.querySelectorAll("dialog[open]").forEach((openDialogElement) => {
      if (openDialogElement !== dialog) closeDialog(openDialogElement, { restoreFocus: false });
    });

    state.previousFocus.set(dialog, trigger ?? document.activeElement);

    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }

    const firstFocusable = getFocusableElements(dialog)[0];
    window.setTimeout(() => firstFocusable?.focus(), 0);
  }

  function closeDialog(dialog, { restoreFocus = true } = {}) {
    if (!dialog?.open) return;

    if (!restoreFocus) {
      state.previousFocus.delete(dialog);
    }

    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
      if (restoreFocus) restoreDialogFocus(dialog);
    }
  }

  function restoreDialogFocus(dialog) {
    const previousElement = state.previousFocus.get(dialog);
    state.previousFocus.delete(dialog);

    if (previousElement instanceof HTMLElement && document.contains(previousElement)) {
      previousElement.focus();
    }
  }

  function keepFocusInsideDialog(event, dialog) {
    if (event.key !== "Tab") return;

    const focusableElements = getFocusableElements(dialog);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  /* =======================================================
     REGISTRO ACADÉMICO DEMOSTRATIVO
     ======================================================= */

  function initializeRegistrationDemo() {
    const form = document.querySelector("#register-form");
    const status = document.querySelector("#register-status");
    const dialog = document.querySelector("#register-dialog");

    if (!form || !status) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        status.textContent = translateText("Revisa los campos requeridos antes de continuar.");
        status.classList.add("is-error");
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;

      status.classList.remove("is-error");
      status.textContent = translateText(
        "Solicitud demostrativa completada. No se creó una cuenta ni se almacenaron los datos.",
      );

      announce(
        "Solicitud demostrativa completada. No se creó una cuenta ni se almacenaron los datos.",
      );

      form.reset();

      window.setTimeout(() => {
        if (submitButton) submitButton.disabled = false;
      }, 700);
    });

    dialog?.addEventListener("close", () => {
      form.reset();
      status.textContent = "";
      status.classList.remove("is-error");
    });
  }

  /* =======================================================
     SEGUIMIENTO DE LA NAVEGACIÓN
     ======================================================= */

  function initializeNavigationTracking() {
    const navigationLinks = [...document.querySelectorAll('#main-navigation a[href^="#"]')];
    const observedSections = navigationLinks
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    if (!("IntersectionObserver" in window) || observedSections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];

        if (!visibleEntry) return;

        state.activeSectionId = visibleEntry.target.id;

        navigationLinks.forEach((link) => {
          const isActive = link.getAttribute("href") === `#${state.activeSectionId}`;

          if (isActive) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      },
      {
        rootMargin: "-25% 0px -58% 0px",
        threshold: [0.05, 0.2, 0.45, 0.7],
      },
    );

    observedSections.forEach((section) => observer.observe(section));
  }

  /* =======================================================
     PREGUNTAS FRECUENTES
     ======================================================= */

  function initializeFaqBehavior() {
    const faqItems = [...document.querySelectorAll(".faq-list details")];

    faqItems.forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;

        faqItems.forEach((otherItem) => {
          if (otherItem !== item) otherItem.open = false;
        });
      });
    });
  }

  /* =======================================================
     LECTURA POR VOZ
     ======================================================= */

  function initializeSpeechReader() {
    const speechSupported =
      "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

    state.speech.supported = speechSupported;

    const readPageButton = document.querySelector("#read-page");
    const pauseButton = document.querySelector("#pause-reading");
    const resumeButton = document.querySelector("#resume-reading");
    const stopButton = document.querySelector("#stop-reading");
    const status = document.querySelector("#voice-status");

    if (!speechSupported) {
      [readPageButton, pauseButton, resumeButton, stopButton].forEach((button) => {
        if (button) button.disabled = true;
      });

      if (status) {
        status.textContent = "La lectura por voz no está disponible en este navegador.";
      }

      return;
    }

    state.speech.synthesizer = window.speechSynthesis;
    refreshVoices();

    window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);

    const readSectionButton = createReadSectionButton(readPageButton);

    readPageButton?.addEventListener("click", () => {
      const text = getFullPageText();
      startReading(text, "toda la página");
    });

    readSectionButton?.addEventListener("click", () => {
      const section = findCurrentSection();

      if (!section) {
        updateSpeechStatus("No se pudo identificar una sección para leer.");
        return;
      }

      const heading = section.querySelector("h1, h2, h3")?.textContent?.trim();
      const text = extractReadableText(section);
      const description = heading ? `la sección ${heading}` : "la sección visible";

      startReading(text, description);
    });

    pauseButton?.addEventListener("click", pauseReading);
    resumeButton?.addEventListener("click", resumeReading);
    stopButton?.addEventListener("click", () => stopReading());

    window.addEventListener("pagehide", () => stopReading({ announceStop: false }));
  }

  function createReadSectionButton(readPageButton) {
    if (!readPageButton || document.querySelector("#read-current-section")) {
      return document.querySelector("#read-current-section");
    }

    const button = document.createElement("button");
    button.id = "read-current-section";
    button.className = "button button--ghost";
    button.type = "button";
    button.textContent = "Leer sección visible";

    readPageButton.insertAdjacentElement("afterend", button);
    return button;
  }

  function refreshVoices() {
    state.speech.voices = state.speech.synthesizer?.getVoices?.() ?? [];
  }

  function getPreferredSpanishVoice() {
    const voices = state.speech.voices;

    return (
      voices.find((voice) => voice.lang.toLowerCase() === "es-cr") ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith("es-")) ??
      voices.find((voice) => voice.lang.toLowerCase() === "es") ??
      null
    );
  }

  function getFullPageText() {
    const readableContainers = [
      document.querySelector("header"),
      document.querySelector("main"),
      document.querySelector("footer"),
    ].filter(Boolean);

    return readableContainers
      .map((container) => extractReadableText(container))
      .filter(Boolean)
      .join(". ");
  }

  function extractReadableText(sourceElement) {
    if (!sourceElement) return "";

    const clone = sourceElement.cloneNode(true);

    clone
      .querySelectorAll(
        'script, style, svg, dialog, [aria-hidden="true"], .page-background, .live-region, .floating-accessibility',
      )
      .forEach((element) => element.remove());

    return clone.textContent
      .replace(/\s+/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .trim();
  }

  function findCurrentSection() {
    const sections = [...document.querySelectorAll("main section")];
    if (sections.length === 0) return null;

    const viewportCenter = window.innerHeight / 2;
    const visibleSections = sections.filter((section) => {
      const rectangle = section.getBoundingClientRect();
      return rectangle.bottom > 0 && rectangle.top < window.innerHeight;
    });

    const candidates = visibleSections.length > 0 ? visibleSections : sections;

    return candidates.sort((first, second) => {
      const firstRectangle = first.getBoundingClientRect();
      const secondRectangle = second.getBoundingClientRect();
      const firstCenter = firstRectangle.top + firstRectangle.height / 2;
      const secondCenter = secondRectangle.top + secondRectangle.height / 2;

      return (
        Math.abs(firstCenter - viewportCenter) - Math.abs(secondCenter - viewportCenter)
      );
    })[0];
  }

  function splitTextIntoSpeechChunks(text, maximumLength = 240) {
    const cleanText = text.replace(/\s+/g, " ").trim();
    if (!cleanText) return [];

    let sentences;

    if ("Segmenter" in Intl) {
      const segmenter = new Intl.Segmenter("es", { granularity: "sentence" });
      sentences = [...segmenter.segment(cleanText)].map((segment) => segment.segment.trim());
    } else {
      sentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()) ?? [
        cleanText,
      ];
    }

    const chunks = [];
    let currentChunk = "";

    const pushCurrentChunk = () => {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = "";
    };

    sentences.forEach((sentence) => {
      if (sentence.length > maximumLength) {
        pushCurrentChunk();

        const words = sentence.split(" ");
        let longSentenceChunk = "";

        words.forEach((word) => {
          const candidate = `${longSentenceChunk} ${word}`.trim();

          if (candidate.length > maximumLength && longSentenceChunk) {
            chunks.push(longSentenceChunk.trim());
            longSentenceChunk = word;
          } else {
            longSentenceChunk = candidate;
          }
        });

        if (longSentenceChunk) chunks.push(longSentenceChunk.trim());
        return;
      }

      const candidate = `${currentChunk} ${sentence}`.trim();

      if (candidate.length > maximumLength && currentChunk) {
        pushCurrentChunk();
        currentChunk = sentence;
      } else {
        currentChunk = candidate;
      }
    });

    pushCurrentChunk();
    return chunks;
  }

  function startReading(text, description) {
    if (!state.speech.supported || !state.speech.synthesizer) return;

    const chunks = splitTextIntoSpeechChunks(text);

    if (chunks.length === 0) {
      updateSpeechStatus("No hay contenido disponible para leer.");
      return;
    }

    stopReading({ announceStop: false });

    state.speech.runId += 1;
    state.speech.queue = chunks;
    state.speech.currentIndex = 0;
    state.speech.isReading = true;
    state.speech.isPaused = false;

    updateSpeechButtons();
    updateSpeechStatus(`Leyendo ${description}.`);
    announce(`Comenzó la lectura de ${description}.`);
    speakNextChunk(state.speech.runId);
  }

  function speakNextChunk(runId) {
    if (
      runId !== state.speech.runId ||
      !state.speech.isReading ||
      state.speech.isPaused ||
      !state.speech.synthesizer
    ) {
      return;
    }

    if (state.speech.currentIndex >= state.speech.queue.length) {
      finishReading(runId);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(
      state.speech.queue[state.speech.currentIndex],
    );
    const preferredVoice = getPreferredSpanishVoice();

    utterance.lang = preferredVoice?.lang ?? "es-CR";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.addEventListener("end", () => {
      if (runId !== state.speech.runId || !state.speech.isReading) return;

      state.speech.currentIndex += 1;
      state.speech.currentUtterance = null;
      speakNextChunk(runId);
    });

    utterance.addEventListener("error", (event) => {
      if (runId !== state.speech.runId) return;
      if (["canceled", "interrupted"].includes(event.error)) return;

      stopReading({ announceStop: false });
      updateSpeechStatus("La lectura se detuvo debido a un error del navegador.");
      announce("No fue posible continuar con la lectura por voz.");
    });

    state.speech.currentUtterance = utterance;
    state.speech.synthesizer.speak(utterance);
  }

  function pauseReading() {
    if (!state.speech.isReading || state.speech.isPaused || !state.speech.synthesizer) {
      return;
    }

    state.speech.synthesizer.pause();
    state.speech.isPaused = true;
    updateSpeechButtons();
    updateSpeechStatus("Lectura pausada.");
    announce("Lectura por voz pausada.");
  }

  function resumeReading() {
    if (!state.speech.isReading || !state.speech.isPaused || !state.speech.synthesizer) {
      return;
    }

    state.speech.synthesizer.resume();
    state.speech.isPaused = false;
    updateSpeechButtons();
    updateSpeechStatus("Lectura reanudada.");
    announce("Lectura por voz reanudada.");
  }

  function stopReading({ announceStop = true } = {}) {
    if (!state.speech.synthesizer) return;

    const wasActive = state.speech.isReading || state.speech.isPaused;

    state.speech.runId += 1;
    state.speech.synthesizer.cancel();
    state.speech.queue = [];
    state.speech.currentIndex = 0;
    state.speech.currentUtterance = null;
    state.speech.isReading = false;
    state.speech.isPaused = false;

    updateSpeechButtons();

    if (wasActive) {
      updateSpeechStatus("Lectura por voz detenida.");
      if (announceStop) announce("Lectura por voz detenida.");
    }
  }

  function finishReading(runId) {
    if (runId !== state.speech.runId) return;

    state.speech.queue = [];
    state.speech.currentIndex = 0;
    state.speech.currentUtterance = null;
    state.speech.isReading = false;
    state.speech.isPaused = false;

    updateSpeechButtons();
    updateSpeechStatus("Lectura finalizada.");
    announce("La lectura por voz ha finalizado.");
  }

  function updateSpeechButtons() {
    const pauseButton = document.querySelector("#pause-reading");
    const resumeButton = document.querySelector("#resume-reading");
    const stopButton = document.querySelector("#stop-reading");

    if (pauseButton) {
      pauseButton.disabled = !state.speech.isReading || state.speech.isPaused;
    }

    if (resumeButton) {
      resumeButton.disabled = !state.speech.isReading || !state.speech.isPaused;
    }

    if (stopButton) {
      stopButton.disabled = !state.speech.isReading;
    }
  }

  function updateSpeechStatus(message) {
    const status = document.querySelector("#voice-status");
    if (status) status.textContent = message;
  }

  /* =======================================================
     ATAJOS DE TECLADO
     ======================================================= */

  function initializeKeyboardShortcuts() {
    document.addEventListener("keydown", (event) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;

      const activeElement = document.activeElement;
      const isWriting =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        activeElement?.isContentEditable;

      if (isWriting) return;

      if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        const trigger = document.querySelector("#floating-accessibility");
        openDialog(document.querySelector("#accessibility-dialog"), trigger);
      }

      if (event.key.toLowerCase() === "r" && state.speech.supported) {
        event.preventDefault();
        const section = findCurrentSection();

        if (section) {
          const heading = section.querySelector("h1, h2, h3")?.textContent?.trim();
          startReading(
            extractReadableText(section),
            heading ? `la sección ${heading}` : "la sección visible",
          );
        }
      }
    });
  }
})();
