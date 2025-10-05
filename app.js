const { useState, useEffect, useRef } = React;

function SmartTeleprompter() {
  const [text, setText] =
    useState(`Welcome to Smart Teleprompter the free, open-source teleprompter application that uses real-time speech recognition to automatically follow your voice as you read.

⚠️ IMPORTANT COMPATIBILITY NOTES:
• For BEST EXPERIENCE: Use Desktop/Laptop with Chrome browser
• iPhone/iPad: Only Auto-scroll mode works (no voice recognition)
• Android: Voice recognition may work but performance varies
• Mobile browsers have limited Web Speech API support

QUICK START
Press the microphone button (or V) to start voice tracking. The app will highlight words as you speak them and smoothly scroll to keep your current position centered on screen.

KEYBOARD SHORTCUTS
V - Start/Stop microphone
P - Play/Pause auto-scroll
H - Toggle word highlighting
R - Reset to beginning
L - Language selection
E - Settings menu
S - Script editor
F - Fullscreen mode
M - Mirror text horizontally

KEY FEATURES
- Voice-controlled scrolling with 20+ language support
- Adjustable font size, colors, and spacing
- Customizable scroll speed and text positioning
- Camera aim indicator for perfect alignment
- Import scripts from .txt, .md, or .pdf files
- Horizontal mirroring for teleprompter hardware
- Paragraph and word highlighting modes

SUPPORTED LANGUAGES
🇺🇸 English (US) • 🇬🇧 English (UK) • 🇪🇸 Spanish (Spain) • 🇲🇽 Spanish (Mexico) • 🇫🇷 French • 🇩🇪 German • 🇮🇹 Italian • 🇧🇷 Portuguese (Brazil) • 🇵🇹 Portuguese (Portugal) • 🇷🇺 Russian • 🇨🇳 Chinese • 🇯🇵 Japanese • 🇰🇷 Korean • 🇸🇦 Arabic • 🇮🇳 Hindi • 🇹🇷 Turkish • 🇳🇱 Dutch • 🇬🇷 Greek • 🇵🇱 Polish • 🇸🇪 Swedish

TIPS FOR BEST RESULTS
- Use Chrome browser on Desktop/Laptop for optimal performance
- iPhone/iPad users: Use Auto-scroll mode (P key) - voice recognition not supported
- Android users: Voice recognition may work but desktop recommended
- External microphones provide better accuracy than built-in mics
- Minimize background noise for improved tracking
- Stable internet connection required (5+ Mbps recommended)
- Speak at natural pace with clear pronunciation

This project is completely free and open source. If you find it useful, consider supporting development at smartteleprompter.com

Happy recording!`);

  const [fontSize, setFontSize] = useState(32);
  const [margin, setMargin] = useState(20);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [scrollSpeed, setScrollSpeed] = useState(88);
  const [bgColor, setBgColor] = useState("#000000");
  const [textColor, setTextColor] = useState("#ffffff");
  const [highlightColor, setHighlightColor] = useState("#ffeb3b");

  const [isListening, setIsListening] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [followEnabled, setFollowEnabled] = useState(false);
  const [lookaheadWindow, setLookaheadWindow] = useState(10);
  const [userIsInteracting, setUserIsInteracting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [centerPaddingVh, setCenterPaddingVh] = useState(45);
  const [showAim, setShowAim] = useState(true);
  const [showHighlight, setShowHighlight] = useState(true);
  const [aimOffsetX, setAimOffsetX] = useState(0);
  const [aimOffsetY, setAimOffsetY] = useState(0);
  const [textOpacity, setTextOpacity] = useState(0.8);
  const [aimOpacity, setAimOpacity] = useState(1);
  const [uiOpacity, setUiOpacity] = useState(0.9);
  const [sidePaddingVw, setSidePaddingVw] = useState(10);
  const [textAlignStyle, setTextAlignStyle] = useState("left");
  const [mirrorX, setMirrorX] = useState(false);
  const [language, setLanguage] = useState(() => {
    // Start with browser language, then load from localStorage after mount
    return typeof navigator !== "undefined" && navigator.language
      ? navigator.language
      : "en-US";
  });
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const languageBtnRef = useRef(null);
  const [languageMenuPos, setLanguageMenuPos] = useState({ top: 0, left: 0 });
  const [showSupportMessage, setShowSupportMessage] = useState(true);
  const [isIOSChrome, setIsIOSChrome] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const languagesList = [
    { code: "en-US", label: "🇺🇸 English (US)" },
    { code: "en-GB", label: "🇬🇧 English (UK)" },
    { code: "es-ES", label: "🇪🇸 Español (España)" },
    { code: "es-MX", label: "🇲🇽 Español (México)" },
    { code: "fr-FR", label: "🇫🇷 Français" },
    { code: "de-DE", label: "🇩🇪 Deutsch" },
    { code: "it-IT", label: "🇮🇹 Italiano" },
    { code: "pt-BR", label: "🇧🇷 Português (Brasil)" },
    { code: "pt-PT", label: "🇵🇹 Português (Portugal)" },
    { code: "ru-RU", label: "🇷🇺 Русский" },
    { code: "zh-CN", label: "🇨🇳 中文 (简体)" },
    { code: "ja-JP", label: "🇯🇵 日本語" },
    { code: "ko-KR", label: "🇰🇷 한국어" },
    { code: "ar-SA", label: "🇸🇦 العربية" },
    { code: "hi-IN", label: "🇮🇳 हिन्दी" },
    { code: "tr-TR", label: "🇹🇷 Türkçe" },
    { code: "nl-NL", label: "🇳🇱 Nederlands" },
    { code: "el-GR", label: "🇬🇷 Ελληνικά" },
    { code: "pl-PL", label: "🇵🇱 Polski" },
    { code: "sv-SE", label: "🇸🇪 Svenska" },
  ];
  const [paragraphHighlightOpacity, setParagraphHighlightOpacity] =
    useState(0.12);
  const [linesWords, setLinesWords] = useState([]);
  const [lineStartIndex, setLineStartIndex] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [renderMarkdown, setRenderMarkdown] = useState(false);
  const [paragraphSpacingPx, setParagraphSpacingPx] = useState(12);
  const [extraBottomSpacePx, setExtraBottomSpacePx] = useState(0);

  const recognitionRef = useRef(null);
  const wordsRef = useRef([]);
  const normalizedWordsRef = useRef([]);
  const linesRawRef = useRef([]);
  const linesWordsRef = useRef([]);
  const lineStartIndexRef = useRef([]);
  const isListeningRef = useRef(false);
  const currentWordIndexRef = useRef(-1);
  const textContainerRef = useRef(null);
  const autoScrollInterval = useRef(null);
  const autoRafIdRef = useRef(null);
  const autoLastTsRef = useRef(0);
  const scrollAnimTokenRef = useRef(0);
  const userInteractTimeoutRef = useRef(null);
  const speakingTimeoutRef = useRef(null);
  const hasInitialCenterRef = useRef(false);
  const programmaticScrollRef = useRef(false);
  const prevLineIdxRef = useRef(-1);
  const prevVisualLineIdxRef = useRef(-1);
  const lastScrollTopRef = useRef(0);
  const stagnantStepsRef = useRef(0);
  const recognizingRef = useRef(false);
  const lastMicResultTsRef = useRef(performance.now());
  const micForceStoppedRef = useRef(false);
  const micRestartTimeoutRef = useRef(null);

  function hardStopRecognition() {
    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
        } catch (_) {}
        try {
          recognitionRef.current.onresult = null;
        } catch (_) {}
        try {
          recognitionRef.current.onerror = null;
        } catch (_) {}
        try {
          recognitionRef.current.onend = null;
        } catch (_) {}
        try {
          recognitionRef.current.abort?.();
        } catch (_) {}
        try {
          recognitionRef.current.stop?.();
        } catch (_) {}
      }
    } catch (_) {}
    recognizingRef.current = false;
    micForceStoppedRef.current = true;
    if (micRestartTimeoutRef.current) {
      clearTimeout(micRestartTimeoutRef.current);
      micRestartTimeoutRef.current = null;
    }
    recognitionRef.current = null;
  }

  function attachRecognitionHandlers(rec) {
    try {
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang =
        language ||
        (typeof navigator !== "undefined" && navigator.language
          ? navigator.language
          : "en-US");
      rec.maxAlternatives = 1;
    } catch (_) {}

    rec.onstart = () => {
      recognizingRef.current = true;
      micForceStoppedRef && (micForceStoppedRef.current = false);
    };

    rec.onresult = (event) => {
      // Αν έχουμε ήδη transcript που τρέχει, μην περιμένεις final
      const hasInterim =
        event.results.length > 0 &&
        !event.results[event.results.length - 1].isFinal;

      // Πάρε πρώτα το πιο πρόσφατο interim (πιο γρήγορο)
      let idx = event.results.length - 1;
      const latestResult = event.results[idx];

      // Χρησιμοποίησε interim αν υπάρχει, αλλιώς ψάξε για final
      const chosen = latestResult;

      const transcript =
        chosen && chosen[0] && chosen[0].transcript ? chosen[0].transcript : "";

      // Split σε tokens ΑΜΑ υπάρχει τουλάχιστον μία λέξη
      const tokens = transcript.split(/\s+/).map(normalizeWord).filter(Boolean);
      if (tokens.length === 0) return;

      const isFinal = !!(chosen && chosen.isFinal);

      // ΝΕΟΣ ΚΩΔΙΚΑΣ: Για interim results, χρησιμοποίησε μόνο την τελευταία λέξη
      const tokensToUse =
        !isFinal && tokens.length > 1 ? tokens.slice(-1) : tokens;

      // mic activity indicator
      setIsSpeaking(true);
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = setTimeout(() => setIsSpeaking(false), 1000);
      try {
        window.__lastMicResultTs = performance.now();
      } catch (_) {}
      lastMicResultTsRef.current = performance.now();

      const startIndex = Math.max(currentWordIndexRef.current + 1, 0);
      const currentLine = getLineIdxForWord(currentWordIndexRef.current);

      // Χρησιμοποίησε τα tokens που έχουμε υπολογίσει
      let nextIndex = findNextInLine(
        tokensToUse,
        startIndex,
        currentLine,
        6,
        2, // Always allow soft match για πιο aggressive matching
        true
      );
      if (nextIndex === -1)
        nextIndex = findNextInLine(
          tokensToUse,
          startIndex,
          currentLine,
          undefined,
          2,
          true // Always allow soft match
        );
      if (nextIndex === -1) {
        const { index } = tryAdvanceByTokens(tokensToUse, startIndex, {
          maxWindow: lookaheadWindow,
          maxSoftSkip: 2, // Πιο aggressive για αγγλικά
        });
        nextIndex = index;
      }
      if (nextIndex !== -1) setCurrentWordIndex(nextIndex);
    };

    rec.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (
        event.error === "no-speech" ||
        event.error === "audio-capture" ||
        event.error === "network" ||
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        if (isListeningRef.current && !micForceStoppedRef.current) {
          if (micRestartTimeoutRef.current)
            clearTimeout(micRestartTimeoutRef.current);
          micRestartTimeoutRef.current = setTimeout(() => {
            if (isListeningRef.current && !micForceStoppedRef.current)
              safeRestartRecognition(300);
          }, 0);
        }
      }
    };

    rec.onend = () => {
      recognizingRef.current = false;
      if (isListeningRef.current && !micForceStoppedRef.current) {
        if (micRestartTimeoutRef.current)
          clearTimeout(micRestartTimeoutRef.current);
        micRestartTimeoutRef.current = setTimeout(() => {
          if (isListeningRef.current && !micForceStoppedRef.current)
            safeRestartRecognition(150);
        }, 0);
      }
    };

    return rec;
  }

  function safeRestartRecognition(delayMs = 150) {
    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
        } catch (_) {}
        try {
          recognitionRef.current.onerror = null;
        } catch (_) {}
        try {
          recognitionRef.current.onend = null;
        } catch (_) {}
        try {
          recognitionRef.current.abort?.();
        } catch (_) {}
        try {
          recognitionRef.current.stop?.();
        } catch (_) {}
      }
    } catch (_) {}
    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      const rec = new SpeechRecognition();
      recognitionRef.current = attachRecognitionHandlers(rec);
      setTimeout(() => {
        try {
          recognitionRef.current && recognitionRef.current.start();
        } catch (_) {}
      }, Math.max(0, delayMs));
    } catch (_) {}
  }

  const computeAutoIntervalMs = (speedSetting) => {
    const s = Math.max(1, Math.min(100, Number(speedSetting) || 1));
    return Math.max(150, Math.round(2200 - s * 20));
  };

  const SETTINGS_KEY = "tp_settings_v1";
  const defaultSettings = {
    fontSize: 32,
    margin: 20,
    lineHeight: 1.5,
    scrollSpeed: 94,
    bgColor: "#000000",
    textColor: "#ffffff",
    highlightColor: "#ffeb3b",
    followEnabled: false,
    lookaheadWindow: 10,
    centerPaddingVh: 45,
    showAim: true,
    aimOffsetX: 0,
    aimOffsetY: 0,
    textOpacity: 0.8,
    aimOpacity: 1,
    uiOpacity: 0.9,
    renderMarkdown: false,
    paragraphSpacingPx: 4,
    sidePaddingVw: 20,
    textAlignStyle: "left",
    paragraphHighlightOpacity: 0.2,
    language:
      typeof navigator !== "undefined" && navigator.language
        ? navigator.language
        : "en-US",
    mirrorX: false,
  };

  const resetSettingsToDefault = () => {
    setFontSize(defaultSettings.fontSize);
    setMargin(defaultSettings.margin);
    setLineHeight(defaultSettings.lineHeight);
    setScrollSpeed(defaultSettings.scrollSpeed);
    setBgColor(defaultSettings.bgColor);
    setTextColor(defaultSettings.textColor);
    setHighlightColor(defaultSettings.highlightColor);
    setFollowEnabled(defaultSettings.followEnabled);
    setLookaheadWindow(defaultSettings.lookaheadWindow);
    setCenterPaddingVh(defaultSettings.centerPaddingVh);
    setShowAim(defaultSettings.showAim);
    setAimOffsetX(defaultSettings.aimOffsetX);
    setAimOffsetY(defaultSettings.aimOffsetY);
    setTextOpacity(defaultSettings.textOpacity);
    setAimOpacity(defaultSettings.aimOpacity);
    setUiOpacity(defaultSettings.uiOpacity);
    setRenderMarkdown(defaultSettings.renderMarkdown);
    setParagraphSpacingPx(defaultSettings.paragraphSpacingPx);
    setSidePaddingVw(defaultSettings.sidePaddingVw);
    setTextAlignStyle(defaultSettings.textAlignStyle);
    setParagraphHighlightOpacity(defaultSettings.paragraphHighlightOpacity);
    setLanguage(defaultSettings.language);
    setMirrorX(defaultSettings.mirrorX);
    try {
      localStorage.removeItem(SETTINGS_KEY);
    } catch (_) {}
  };

  // Load settings on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.fontSize != null) setFontSize(s.fontSize);
      if (s.margin != null) setMargin(s.margin);
      if (s.lineHeight != null) setLineHeight(s.lineHeight);
      if (s.scrollSpeed != null) setScrollSpeed(s.scrollSpeed);
      if (s.bgColor) setBgColor(s.bgColor);
      if (s.textColor) setTextColor(s.textColor);
      if (s.highlightColor) setHighlightColor(s.highlightColor);
      if (typeof s.text === "string") setText(s.text);
      if (s.followEnabled != null) setFollowEnabled(s.followEnabled);
      if (s.lookaheadWindow != null) setLookaheadWindow(s.lookaheadWindow);
      if (s.centerPaddingVh != null) setCenterPaddingVh(s.centerPaddingVh);
      if (s.showAim != null) setShowAim(s.showAim);
      if (s.aimOffsetX != null) setAimOffsetX(s.aimOffsetX);
      if (s.aimOffsetY != null) setAimOffsetY(s.aimOffsetY);
      if (s.textOpacity != null) setTextOpacity(s.textOpacity);
      if (s.aimOpacity != null) setAimOpacity(s.aimOpacity);
      if (s.uiOpacity != null) setUiOpacity(s.uiOpacity);
      if (s.renderMarkdown != null) setRenderMarkdown(s.renderMarkdown);
      if (s.paragraphSpacingPx != null)
        setParagraphSpacingPx(s.paragraphSpacingPx);
      if (s.sidePaddingVw != null) setSidePaddingVw(s.sidePaddingVw);
      if (s.textAlignStyle) setTextAlignStyle(s.textAlignStyle);
      if (s.paragraphHighlightOpacity != null)
        setParagraphHighlightOpacity(s.paragraphHighlightOpacity);
      if (s.language) setLanguage(s.language);
      if (s.mirrorX != null) setMirrorX(!!s.mirrorX);
    } catch (_) {}
  }, []);

  // Persist settings on change
  useEffect(() => {
    const s = {
      fontSize,
      margin,
      lineHeight,
      scrollSpeed,
      bgColor,
      textColor,
      highlightColor,
      followEnabled,
      lookaheadWindow,
      centerPaddingVh,
      showAim,
      aimOffsetX,
      aimOffsetY,
      textOpacity,
      aimOpacity,
      uiOpacity,
      renderMarkdown,
      paragraphSpacingPx,
      sidePaddingVw,
      textAlignStyle,
      paragraphHighlightOpacity,
      language,
      mirrorX,

      text,
    };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch (_) {}
  }, [
    fontSize,
    margin,
    lineHeight,
    scrollSpeed,
    bgColor,
    textColor,
    highlightColor,
    followEnabled,
    lookaheadWindow,
    centerPaddingVh,
    showAim,
    aimOffsetX,
    aimOffsetY,
    textOpacity,
    aimOpacity,
    uiOpacity,
    renderMarkdown,
    paragraphSpacingPx,
    sidePaddingVw,
    textAlignStyle,
    paragraphHighlightOpacity,
    text,
  ]);

  // Sync body background with setting
  useEffect(() => {
    try {
      if (typeof document !== "undefined" && document.body) {
        document.body.style.backgroundColor = bgColor;
        document.body.style.background = bgColor;
      }
    } catch (_) {}
  }, [bgColor]);

  // Setup pdf.js worker if available
  useEffect(() => {
    try {
      if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
      }
    } catch (_) {}
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    try {
      if (ext === "txt" || ext === "md" || ext === "markdown") {
        const txt = await file.text();
        setText(txt);
        // Always use plain text rendering for stability
        setRenderMarkdown(false);
        setShowEditor(true);
      } else if (ext === "pdf") {
        const ab = await file.arrayBuffer();
        await parsePdfArrayBuffer(ab);
      } else {
        alert("Υποστηρίζονται μόνο αρχεία .txt, .md και .pdf");
      }
    } catch (e) {
      console.error(e);
      alert("Αποτυχία φόρτωσης αρχείου");
    } finally {
      // reset input so same file can be reselected
      event.target.value = "";
    }
  };

  const parsePdfArrayBuffer = async (arrayBuffer) => {
    const lib = window.pdfjsLib;
    if (!lib) {
      alert("Το PDF parser δεν φορτώθηκε");
      return;
    }
    try {
      if (lib.GlobalWorkerOptions) {
        lib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
      }
      const task = lib.getDocument({ data: arrayBuffer });
      const pdf = await task.promise;
      let merged = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strs = content.items.map((it) => it.str);
        merged += strs.join(" ") + "\n\n";
      }
      setText(merged.trim());
      setShowEditor(true);
    } catch (err) {
      console.error("PDF parse error", err);
      alert("Δεν ήταν δυνατή η ανάγνωση του PDF");
    }
  };

  const Icon = ({ name }) => (
    <img
      src={`https://unpkg.com/heroicons@2.1.1/24/outline/${name}.svg`}
      width="22"
      height="22"
      style={{ filter: "invert(1) brightness(2)" }}
      alt=""
      aria-hidden="true"
    />
  );

  const IconButton = ({
    onClick,
    ariaLabel,
    tooltipTitle,
    tooltipDesc,
    children,
    style,
    disabled,
  }) => {
    const [showTip, setShowTip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const tipTimer = useRef(null);
    const buttonRef = useRef(null);

    const openWithDelay = () => {
      if (tipTimer.current) clearTimeout(tipTimer.current);
      tipTimer.current = setTimeout(() => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setTooltipPosition({
            top: rect.bottom + window.scrollY + 8,
            left: rect.left + window.scrollX + rect.width / 2,
          });
        }
        setShowTip(true);
      }, 200);
    };

    const closeTip = () => {
      if (tipTimer.current) clearTimeout(tipTimer.current);
      setShowTip(false);
    };

    return (
      <div
        onMouseEnter={openWithDelay}
        onMouseLeave={closeTip}
        onFocus={openWithDelay}
        onBlur={closeTip}
        style={{ position: "relative", display: "inline-block", zIndex: 1 }}
      >
        <button
          ref={buttonRef}
          onClick={onClick}
          aria-label={ariaLabel}
          disabled={disabled}
          style={{
            width: 44,
            height: 44,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            borderRadius: 8,
            background: "#0f0f0f",
            color: "white",
            cursor: "pointer",
            opacity: uiOpacity,
            ...style,
          }}
        >
          {children}
        </button>
        {showTip && (
          <div
            style={{
              position: "fixed",
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.9)",
              color: "white",
              padding: "8px 12px",
              borderRadius: 8,
              whiteSpace: "nowrap",
              boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
              zIndex: 99999,
              pointerEvents: "none",
              fontSize: "13px",
              border: "1px solid rgba(255,255,255,0.1)",
              maxWidth: "300px",
              wordWrap: "break-word",
            }}
            role="tooltip"
          >
            <div style={{ fontWeight: "bold", marginBottom: 4, fontSize: 13 }}>
              {tooltipTitle}
            </div>
            {tooltipDesc && (
              <div style={{ fontSize: 12, opacity: 0.8 }}>{tooltipDesc}</div>
            )}
          </div>
        )}
      </div>
    );
  };

  const FileButton = ({ onFile }) => {
    const inputRef = useRef(null);
    return (
      <IconButton
        onClick={() => inputRef.current && inputRef.current.click()}
        ariaLabel="Open File"
        tooltipTitle="Open File"
        tooltipDesc="Import .txt/.md/.pdf"
      >
        <Icon name={"arrow-up-tray"} />
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,.markdown,.pdf,text/plain,text/markdown,application/pdf"
          onChange={onFile}
          style={{ display: "none" }}
        />
      </IconButton>
    );
  };

  const tokensEqual = (a, b) => a && b && a === b;
  const tokensSoftMatch = (target, token) => {
    if (!target || !token) return false;
    if (target === token) return true;
    if (
      token.length >= 3 &&
      (target.startsWith(token) || token.startsWith(target))
    )
      return true;
    if (token.length >= 4 && (target.includes(token) || token.includes(target)))
      return true;
    return false;
  };

  const normalizeWord = (input) => {
    if (!input) return "";
    return input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ς/g, "σ")
      .replace(/[^a-zA-Zα-ω0-9]+/g, "")
      .trim();
  };

  useEffect(() => {
    const lines = text.split(/\r?\n/);
    linesRawRef.current = lines;
    const linesWords = lines.map((ln) =>
      ln.split(/\s+/).filter((w) => w.trim().length > 0)
    );
    linesWordsRef.current = linesWords;

    const flatWords = [];
    const starts = [];
    for (let i = 0; i < linesWords.length; i++) {
      starts.push(flatWords.length);
      for (const w of linesWords[i]) flatWords.push(w);
    }
    lineStartIndexRef.current = starts;
    wordsRef.current = flatWords;
    normalizedWordsRef.current = flatWords.map(normalizeWord);
    setLinesWords(linesWords);
    setLineStartIndex(starts);
  }, [text]);

  useEffect(() => {
    if (!hasInitialCenterRef.current && linesWords && linesWords.length > 0) {
      setTimeout(() => {
        if (textContainerRef.current) {
          centerOnWordIndex(0, "auto");
          requestAnimationFrame(() => centerOnWordIndex(0, "smooth"));
          hasInitialCenterRef.current = true;
        }
      }, 0);
    }
  }, [linesWords]);

  const centerOnWordIndex = (wIdx, behavior = "smooth") => {
    if (wIdx == null || wIdx < 0) return;
    const container = textContainerRef.current;
    const wordElement = document.getElementById(`word-${wIdx}`);
    if (!container || !wordElement) return;
    const containerRect = container.getBoundingClientRect();
    const wordRect = wordElement.getBoundingClientRect();
    const delta = wordRect.top - containerRect.top; // position of word within container viewport
    const anchorY = window.innerHeight * (centerPaddingVh / 100); // anchor by settings relative to window
    const targetWithinContainer = anchorY - containerRect.top;
    const newTop = container.scrollTop + delta - targetWithinContainer;
    const topVal = Math.max(0, newTop);
    // Also compute window scroll fallback
    const winTop =
      (window.scrollY || window.pageYOffset || 0) + (wordRect.top - anchorY);
    programmaticScrollRef.current = true;
    if (typeof container.scrollTo === "function") {
      container.scrollTo({ top: topVal, behavior });
    } else {
      container.scrollTop = topVal;
    }
    setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 0);
  };

  const centerOnLineStart = (lineIdx, behavior = "smooth") => {
    if (lineIdx == null || lineIdx < 0) return;
    const container = textContainerRef.current;
    const lineElement = document.getElementById(`line-${lineIdx}`);
    if (!container || !lineElement) return;
    const containerRect = container.getBoundingClientRect();
    const lineRect = lineElement.getBoundingClientRect();
    const delta = lineRect.top - containerRect.top;
    const anchorY = window.innerHeight * (centerPaddingVh / 100);
    const targetWithinContainer = anchorY - containerRect.top;
    const newTop = container.scrollTop + delta - targetWithinContainer;
    const topVal = Math.max(0, newTop);
    const winTop =
      (window.scrollY || window.pageYOffset || 0) + (lineRect.top - anchorY);
    programmaticScrollRef.current = true;
    if (typeof container.scrollTo === "function") {
      container.scrollTo({ top: topVal, behavior });
    } else {
      container.scrollTop = topVal;
    }
    setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 0);
  };

  const getTargetTopForLine = (lineIdx) => {
    const container = textContainerRef.current;
    const lineElement = document.getElementById(`line-${lineIdx}`);
    if (!container || !lineElement) return null;
    const containerRect = container.getBoundingClientRect();
    const lineRect = lineElement.getBoundingClientRect();
    const delta = lineRect.top - containerRect.top;
    const anchorY = window.innerHeight * (centerPaddingVh / 100);
    const targetWithinContainer = anchorY - containerRect.top;
    const newTop = container.scrollTop + delta - targetWithinContainer;
    const topVal = Math.max(0, newTop);
    return { useWindow: false, topVal, winTop: 0 };
  };

  const smoothScrollTo = (useWindow, toTop, durationMs = 900) => {
    // Cancel any previous animation by advancing the token
    const myToken = ++scrollAnimTokenRef.current;
    const containerEl = textContainerRef.current;
    const start = useWindow
      ? window.scrollY || window.pageYOffset || 0
      : containerEl.scrollTop;
    // Clamp target within scrollable range to avoid bottom plateaus
    const maxPos = useWindow
      ? Math.max(
          0,
          (document.scrollingElement || document.documentElement).scrollHeight -
            window.innerHeight
        )
      : Math.max(0, containerEl.scrollHeight - containerEl.clientHeight);
    const target = Math.max(0, Math.min(toTop, maxPos));
    const change = target - start;
    const startTime = performance.now();
    const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
    const step = (now) => {
      // Abort if a new animation started
      if (myToken !== scrollAnimTokenRef.current) {
        // ensure we never leave the flag stuck to true
        programmaticScrollRef.current = false;
        return;
      }
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const val = start + change * easeInOutQuad(t);
      programmaticScrollRef.current = true;
      if (useWindow) {
        window.scrollTo(0, Math.max(0, val));
      } else {
        containerEl.scrollTop = Math.max(0, val);
      }
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        programmaticScrollRef.current = false;
      }
    };
    requestAnimationFrame(step);
  };

  const centerOnLineStartSmooth = (lineIdx) => {
    const target = getTargetTopForLine(lineIdx);
    if (!target) return;
    smoothScrollTo(
      target.useWindow,
      target.useWindow ? target.winTop : target.topVal,
      900
    );
  };

  const getTargetTopForWord = (wIdx) => {
    const container = textContainerRef.current;
    const wordElement = document.getElementById(`word-${wIdx}`);
    if (!container || !wordElement) return null;
    const containerRect = container.getBoundingClientRect();
    const wordRect = wordElement.getBoundingClientRect();
    const delta = wordRect.top - containerRect.top;
    const anchorY = window.innerHeight * (centerPaddingVh / 100);
    const targetWithinContainer = anchorY - containerRect.top;
    const newTop = container.scrollTop + delta - targetWithinContainer;
    const topVal = Math.max(0, newTop);
    return { useWindow: false, topVal, winTop: 0 };
  };

  const centerOnWordSmooth = (wIdx, durationMs = 900) => {
    const container = textContainerRef.current;
    const target = getTargetTopForWord(wIdx);
    if (!target || !container) return;
    const maxPos = Math.max(0, container.scrollHeight - container.clientHeight);
    if (target.topVal > maxPos - 4) {
      // Not enough room to reach anchor; add spacer then retry next tick
      setExtraBottomSpacePx((prev) => Math.min(4000, Math.max(prev, 1600)));
      setTimeout(() => centerOnWordSmooth(wIdx, durationMs), 0);
      return;
    }
    smoothScrollTo(false, target.topVal, durationMs);
  };

  const getVisualLineIdxForWord = (wIdx) => {
    const container = textContainerRef.current;
    const wordElement = document.getElementById(`word-${wIdx}`);
    if (!container || !wordElement) return -1;
    const containerRect = container.getBoundingClientRect();
    const wordRect = wordElement.getBoundingClientRect();
    const contentY = container.scrollTop + (wordRect.top - containerRect.top);
    const approxLinePx = Math.max(1, fontSize * lineHeight * 1.0);
    return Math.floor(contentY / approxLinePx);
  };

  const getWordAnchorDelta = (wIdx) => {
    const el = document.getElementById(`word-${wIdx}`);
    if (!el) return 0;
    const wordRect = el.getBoundingClientRect();
    const anchorY = window.innerHeight * (centerPaddingVh / 100);
    return wordRect.top - anchorY;
  };

  useEffect(() => {
    const loop = (ts) => {
      if (!isPlaying || isListening) {
        autoRafIdRef.current = null;
        return;
      }
      const stepMs = computeAutoIntervalMs(scrollSpeed);
      if (!autoLastTsRef.current) autoLastTsRef.current = ts;
      if (ts - autoLastTsRef.current >= stepMs) {
        const curNow =
          currentWordIndexRef.current < 0 ? 0 : currentWordIndexRef.current;
        let next = Math.min(curNow + 1, wordsRef.current.length - 1);
        // If we're already at the end of the text, stop; otherwise always advance
        if (curNow >= wordsRef.current.length - 1) {
          if (autoRafIdRef.current) {
            cancelAnimationFrame(autoRafIdRef.current);
            autoRafIdRef.current = null;
          }
          setIsPlaying(false);
          return;
        }
        setCurrentWordIndex(next);
        // cancel ongoing scroll and start a fresh center to word
        scrollAnimTokenRef.current++;
        // Use our smooth scroller; it writes to container scrollTop
        centerOnWordSmooth(next, Math.max(600, stepMs - 50));
        autoLastTsRef.current = ts;

        // Detect stagnation: if scrollTop hasn't changed for several steps, force a small nudge
        const el = textContainerRef.current;
        if (el) {
          const nowTop = el.scrollTop;
          if (Math.abs(nowTop - lastScrollTopRef.current) < 0.5) {
            stagnantStepsRef.current += 1;
          } else {
            stagnantStepsRef.current = 0;
          }
          lastScrollTopRef.current = nowTop;
          if (stagnantStepsRef.current >= 4) {
            // force 1px nudge to break out of rounding plateaus
            el.scrollTop = Math.min(el.scrollHeight, nowTop + 1);
            stagnantStepsRef.current = 0;
          }
        }
      }
      autoRafIdRef.current = requestAnimationFrame(loop);
    };

    if (isPlaying && !isListening) {
      autoLastTsRef.current = 0;
      if (!autoRafIdRef.current) {
        autoRafIdRef.current = requestAnimationFrame(loop);
      }
    } else {
      if (autoRafIdRef.current) {
        cancelAnimationFrame(autoRafIdRef.current);
        autoRafIdRef.current = null;
        autoLastTsRef.current = 0;
      }
    }
    return () => {
      if (autoRafIdRef.current) {
        cancelAnimationFrame(autoRafIdRef.current);
        autoRafIdRef.current = null;
        autoLastTsRef.current = 0;
      }
    };
  }, [isPlaying, isListening, scrollSpeed]);

  useEffect(() => {
    const active = isListening || isPlaying;
    if (!active && !followEnabled) return;
    if (currentWordIndex < 0 || !textContainerRef.current) return;

    const logicalLineIdx = getLineIdxForWord(currentWordIndex);
    const visualLineIdx = getVisualLineIdxForWord(currentWordIndex);

    const logicalChanged = logicalLineIdx !== prevLineIdxRef.current;
    const visualChanged = visualLineIdx !== prevVisualLineIdxRef.current;

    prevLineIdxRef.current = logicalLineIdx;
    prevVisualLineIdxRef.current = visualLineIdx;

    if (logicalChanged || visualChanged) {
      scrollAnimTokenRef.current++;
      centerOnWordSmooth(currentWordIndex);
    }
  }, [
    currentWordIndex,
    followEnabled,
    isListening,
    isPlaying,
    fontSize,
    lineHeight,
    centerPaddingVh,
  ]);

  // Watchdog: if active and the anchor drifts far from the current word, force re-center
  useEffect(() => {
    let rafId = null;
    let lastResultTs = performance.now();
    try {
      if (typeof window.__lastMicResultTs === "number")
        lastResultTs = window.__lastMicResultTs;
      else window.__lastMicResultTs = lastResultTs;
    } catch (_) {}
    const tick = () => {
      const active = isListening || isPlaying;
      if (active && !programmaticScrollRef.current) {
        const idx = currentWordIndexRef.current;
        if (idx >= 0) {
          const approxLinePx = Math.max(1, fontSize * lineHeight * 1.0);
          const delta = Math.abs(getWordAnchorDelta(idx));
          if (delta > approxLinePx * 0.9) {
            scrollAnimTokenRef.current++;
            centerOnWordSmooth(idx, 650);
          }
        }
      }
      // Microphone watchdog: if listening but no result for a while, pause or restart
      if (isListeningRef.current) {
        const now = performance.now();
        try {
          if (typeof window.__lastMicResultTs === "number")
            lastResultTs = window.__lastMicResultTs;
        } catch (_) {}
        if (now - lastResultTs > 4000 && recognizingRef.current) {
          // if no audio detected for 4s, stop gracefully to release mic
          try {
            recognitionRef.current.stop?.();
          } catch (_) {}
        } else if (now - lastResultTs > 5000 && !recognizingRef.current) {
          // if stopped due to silence, restart cleanly
          safeRestartRecognition(200);
          lastResultTs = performance.now();
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isListening, isPlaying, fontSize, lineHeight, centerPaddingVh]);

  useEffect(() => {
    const el = textContainerRef.current;
    if (!el) return;
    let isTouching = false;
    let isWheelScrolling = false;
    const markInteract = () => {
      if (isListening || isPlaying) return;

      setUserIsInteracting(true);
      if (userInteractTimeoutRef.current)
        clearTimeout(userInteractTimeoutRef.current);
      userInteractTimeoutRef.current = setTimeout(
        () => setUserIsInteracting(false),
        1200
      );
    };
    const onScroll = () => {
      if (programmaticScrollRef.current) return;
      // If active modes are on, ignore manual scroll so it never stalls
      if (isListening || isPlaying) return;
      markInteract();
    };
    const onWheel = () => {
      isWheelScrolling = true;
      markInteract();
    };
    const onTouchStart = () => {
      isTouching = true;
      markInteract();
    };
    const onTouchMove = () => {
      if (isTouching) markInteract();
    };
    const onTouchEnd = () => {
      isTouching = false;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      if (userInteractTimeoutRef.current)
        clearTimeout(userInteractTimeoutRef.current);
    };
  }, [isPlaying, isListening]);

  const tryAdvanceByTokens = (
    tokens,
    startIndex,
    { maxWindow = lookaheadWindow, maxSoftSkip = 1 } = {}
  ) => {
    const candidates = tokens.filter(Boolean).slice(-3);
    if (candidates.length === 0) return { index: -1, nUsed: 0 };

    const windowEnd = Math.min(
      normalizedWordsRef.current.length,
      startIndex + Math.max(1, maxWindow)
    );

    // Strict 3-gram then 2-gram equality (can jump further)
    for (let n = Math.min(3, candidates.length); n >= 2; n--) {
      const seq = candidates.slice(-n);
      for (let i = startIndex; i < windowEnd; i++) {
        let ok = true;
        for (let k = 0; k < n; k++) {
          const target = normalizedWordsRef.current[i + k];
          const token = seq[k];
          if (!target || !tokensEqual(target, token)) {
            ok = false;
            break;
          }
        }
        if (ok) return { index: i + (n - 1), nUsed: n };
      }
    }

    // 1-token equality but restrict jump
    const softLimit = Math.min(
      windowEnd,
      startIndex + Math.max(1, maxSoftSkip + 1)
    );
    for (let i = startIndex; i < softLimit; i++) {
      const target = normalizedWordsRef.current[i];
      const t1 = candidates[candidates.length - 1];
      if (tokensEqual(target, t1)) return { index: i, nUsed: 1 };
    }

    // soft matches (prefix/contains) within soft limit
    for (let i = startIndex; i < softLimit; i++) {
      const target = normalizedWordsRef.current[i];
      const t1 = candidates[candidates.length - 1];
      if (tokensSoftMatch(target, t1)) return { index: i, nUsed: 1 };
    }

    return { index: -1, nUsed: 0 };
  };

  const getLineIdxForWord = (wIdx) => {
    if (wIdx < 0) return 0;
    const starts = lineStartIndexRef.current;
    let lineIdx = 0;
    for (let i = 0; i < starts.length; i++) {
      if (starts[i] <= wIdx) lineIdx = i;
      else break;
    }
    return lineIdx;
  };

  const getLineBounds = (lineIdx) => {
    const starts = lineStartIndexRef.current;
    const start = starts[lineIdx] ?? 0;
    const end = (starts[lineIdx + 1] ?? wordsRef.current.length) - 1;
    return { start, end };
  };

  const findNextInLine = (
    tokens,
    startIndex,
    lineIdx,
    headLimit,
    maxSoftSkip = 1,
    allowSoft = true
  ) => {
    const { start: ls, end: leFull } = getLineBounds(lineIdx);
    const le = headLimit ? Math.min(ls + headLimit - 1, leFull) : leFull;
    const localStart = Math.max(startIndex, ls);
    const seq2 = tokens.slice(-2);
    if (seq2.length === 2) {
      for (let i = localStart; i <= le - 1; i++) {
        const a = normalizedWordsRef.current[i];
        const b = normalizedWordsRef.current[i + 1];
        if (a === seq2[0] && b === seq2[1]) {
          return i + 1;
        }
      }
    }
    const t = tokens[tokens.length - 1];
    if (t) {
      const softLimit = Math.min(le, localStart + Math.max(1, maxSoftSkip));
      for (let i = localStart; i <= softLimit; i++) {
        const w = normalizedWordsRef.current[i];
        if (w === t) return i;
      }
      if (allowSoft) {
        for (let i = localStart; i <= softLimit; i++) {
          const w = normalizedWordsRef.current[i];
          if (w && tokensSoftMatch(w, t)) return i;
        }
      }
    }
    return -1;
  };

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);
  useEffect(() => {
    currentWordIndexRef.current = currentWordIndex;
  }, [currentWordIndex]);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      try {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        const rec = new SpeechRecognition();
        recognitionRef.current = attachRecognitionHandlers(rec);
      } catch (_) {}
    }

    return () => {
      try {
        recognitionRef.current && recognitionRef.current.stop();
      } catch (_) {}
    };
  }, []);

  const toggleListening = () => {
    // Prevent speech recognition on iOS devices
    if (isIOSChrome) {
      alert(
        "Speech recognition doesn't work on iOS devices. Only Auto Play mode is available."
      );
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Η αναγνώριση φωνής δεν υποστηρίζεται στον browser σας");
      return;
    }

    if (isListening) {
      // Fully tear down immediately and release mic permissions
      setIsListening(false);
      setIsPlaying(false);
      hardStopRecognition();
    } else {
      try {
        // Recreate a fresh instance and start
        if (typeof micForceStoppedRef !== "undefined" && micForceStoppedRef) {
          try {
            micForceStoppedRef.current = false;
          } catch (_) {}
        }
        safeRestartRecognition(150);
        setIsListening(true);
        setIsPlaying(false);

        // Reset user interaction flag
        setUserIsInteracting(false);
        if (userInteractTimeoutRef.current) {
          clearTimeout(userInteractTimeoutRef.current);
        }

        setTimeout(() => {
          prevLineIdxRef.current = -1; // force first-centering
          prevVisualLineIdxRef.current = -1;
          const currentIdx =
            currentWordIndexRef.current >= 0 ? currentWordIndexRef.current : 0;
          scrollAnimTokenRef.current++;
          centerOnWordSmooth(currentIdx);
        }, 50);
      } catch (e) {
        console.error("Error starting recognition:", e);
      }
    }
  };

  const toggleAutoPlay = () => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    if (nextPlaying && wordsRef.current.length > 0) {
      // Reset user interaction flag
      setUserIsInteracting(false);
      if (userInteractTimeoutRef.current) {
        clearTimeout(userInteractTimeoutRef.current);
      }

      if (currentWordIndex < 0) {
        setCurrentWordIndex(0);
        setTimeout(() => {
          prevLineIdxRef.current = -1; // force first-centering
          prevVisualLineIdxRef.current = -1;
          scrollAnimTokenRef.current++;
          centerOnWordSmooth(0);
          // init stagnation trackers
          const el = textContainerRef.current;
          if (el) lastScrollTopRef.current = el.scrollTop;
          stagnantStepsRef.current = 0;
        }, 50);
      } else {
        setTimeout(() => {
          prevVisualLineIdxRef.current = -1;
          scrollAnimTokenRef.current++;
          centerOnWordSmooth(currentWordIndexRef.current);
          const el = textContainerRef.current;
          if (el) lastScrollTopRef.current = el.scrollTop;
          stagnantStepsRef.current = 0;
        }, 50);
      }
    }
    if (!nextPlaying && autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
    if (!nextPlaying) setIsSpeaking(false);
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch((err) => {
          console.error("Error attempting to enable fullscreen:", err);
        });
    } else {
      document
        .exitFullscreen()
        .then(() => {
          setIsFullscreen(false);
        })
        .catch((err) => {
          console.error("Error attempting to exit fullscreen:", err);
        });
    }
  };

  // Global keyboard shortcuts (after handlers are defined)
  // Detect iOS Chrome
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent);
    setIsIOSChrome(isIOS && isChrome);
  }, []);

  // Load language from localStorage after component mounts
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const savedLanguage = localStorage.getItem("smartTeleprompterLanguage");
        if (savedLanguage && savedLanguage.trim()) {
          console.log("Language loaded from localStorage:", savedLanguage);
          setLanguage(savedLanguage);
        }
      } catch (error) {
        console.error("Failed to load language from localStorage:", error);
      }
    }
  }, []); // Run only once after mount

  // Track fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Save language to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage && language) {
      try {
        localStorage.setItem("smartTeleprompterLanguage", language);
        console.log("Language saved to localStorage:", language);
      } catch (error) {
        console.error("Failed to save language to localStorage:", error);
      }
    }
  }, [language]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close language selector if clicking outside (but not on language options)
      if (
        showLanguageSelector &&
        languageBtnRef.current &&
        !languageBtnRef.current.contains(event.target) &&
        !event.target.closest("[data-language-dropdown]")
      ) {
        setShowLanguageSelector(false);
      }

      // Close settings/editor panels if clicking outside
      if (
        (showSettings || showEditor) &&
        !event.target.closest('[data-panel="settings"]')
      ) {
        setShowSettings(false);
        setShowEditor(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLanguageSelector, showSettings, showEditor]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag =
        e.target && e.target.tagName ? e.target.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || e.isComposing) return;
      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        toggleListening();
        return;
      }
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        toggleAutoPlay();
        return;
      }
      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        setShowHighlight((v) => !v);
        return;
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        resetPosition();
        return;
      }
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        setShowLanguageSelector((v) => !v);
        // recompute anchor position
        if (languageBtnRef.current) {
          const rect = languageBtnRef.current.getBoundingClientRect();
          setLanguageMenuPos({ top: rect.bottom + 8, left: rect.left });
        }
        return;
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        setShowEditor((v) => !v);
        return;
      }
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        setShowSettings((v) => !v);
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setMirrorX((v) => !v);
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isListening, isPlaying, showHighlight]);

  // Recompute language menu position when opened
  useEffect(() => {
    if (showLanguageSelector && languageBtnRef.current) {
      const rect = languageBtnRef.current.getBoundingClientRect();
      setLanguageMenuPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [showLanguageSelector]);

  const resetPosition = () => {
    // Stop autoplay loops
    if (autoRafIdRef.current) {
      cancelAnimationFrame(autoRafIdRef.current);
      autoRafIdRef.current = null;
    }
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
    autoLastTsRef.current = 0;

    // Stop listening
    try {
      if (recognitionRef.current) recognitionRef.current.stop();
    } catch (_) {}
    setIsListening(false);
    setIsPlaying(false);

    // Reset indices and trackers
    prevLineIdxRef.current = -1;
    prevVisualLineIdxRef.current = -1;
    currentWordIndexRef.current = -1;
    setCurrentWordIndex(-1);

    // Hard scroll to top (container and window)
    programmaticScrollRef.current = true;
    if (textContainerRef.current) {
      textContainerRef.current.scrollTop = 0;
    }
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
    setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 0);
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: bgColor,
        position: "relative",
        overflow: "visible",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          background: `rgba(0,0,0,${Math.min(1, uiOpacity)})`,
          padding: "15px",
          zIndex: 1,
          borderBottom: "2px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          className="toolbar-buttons"
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            overflowX: "auto",
            overflowY: "hidden",
            paddingBottom: "5px",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.3) transparent",
            justifyContent: "flex-start",
          }}
        >
          <IconButton
            onClick={toggleListening}
            ariaLabel="Microphone"
            tooltipTitle="Microphone (V)"
            tooltipDesc="Start/Stop speech recognition"
            style={{ background: isListening ? "#d32f2f" : "#0f0f0f" }}
          >
            {isListening ? (
              // Stop square icon (record/stop style)
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  x="7"
                  y="7"
                  width="10"
                  height="10"
                  rx="2"
                  ry="2"
                  fill="white"
                />
              </svg>
            ) : (
              <Icon name={"microphone"} />
            )}
          </IconButton>

          {/* Language selector toggle */}
          <span ref={languageBtnRef}>
            <IconButton
              onClick={() => {
                setShowLanguageSelector((v) => !v);
                if (languageBtnRef.current) {
                  const rect = languageBtnRef.current.getBoundingClientRect();
                  setLanguageMenuPos({ top: rect.bottom + 8, left: rect.left });
                }
              }}
              ariaLabel="Language"
              tooltipTitle="Language Selection (L)"
              tooltipDesc="Select speech recognition language"
              style={{ background: "#0f0f0f", width: "auto", padding: "0 8px" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 0 20" />
                  <path d="M12 2a15.3 15.3 0 0 0 0 20" />
                </svg>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "white",
                  }}
                >
                  {language.split("-")[0].toUpperCase()}
                </span>
              </div>
            </IconButton>
          </span>

          {/* Mirror X */}
          <IconButton
            onClick={() => setMirrorX((v) => !v)}
            ariaLabel="Mirror X"
            tooltipTitle="Mirror horizontally (M)"
            tooltipDesc="Flip text horizontally"
            style={{ background: mirrorX ? "#2e7d32" : "#0f0f0f" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 40 40"
              fill="white"
            >
              <path d="M15.875 35H7.792q-1.125 0-1.959-.833Q5 33.333 5 32.208V7.792q0-1.125.833-1.959Q6.667 5 7.792 5h8.083v2.792H7.792v24.416h8.083Zm2.792 3.333V1.667h2.791v36.666ZM32.208 7.792h-.375V5h.375q1.125 0 1.959.833.833.834.833 1.959v.375h-2.792Zm0 14.291v-4.166H35v4.166Zm0 12.917h-.375v-2.792h.375v-.375H35v.375q0 1.125-.833 1.959-.834.833-1.959.833Zm0-19.875v-4.167H35v4.167Zm0 13.917v-4.167H35v4.167Zm-8 5.958v-2.792h4.834V35Zm0-27.208V5h4.834v2.792Z"></path>
            </svg>
          </IconButton>

          {/* Language dropdown */}
          {showLanguageSelector && (
            <div
              data-language-dropdown
              style={{
                position: "fixed",
                top: languageMenuPos.top,
                left: languageMenuPos.left,
                background: "rgba(0,0,0,0.95)",
                color: "white",
                border: "1px solid #555",
                borderRadius: 8,
                padding: 10,
                zIndex: 1500,
                maxHeight: 400,
                overflowY: "auto",
                minWidth: 220,
                maxWidth: "calc(100vw - 40px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}
            >
              {languagesList.map((lng) => (
                <button
                  key={lng.code}
                  onClick={() => {
                    setLanguage(lng.code);
                    setShowLanguageSelector(false);
                    try {
                      if (recognitionRef.current)
                        recognitionRef.current.lang = lng.code;
                    } catch (_) {}
                    if (isListeningRef.current) {
                      // restart with new language
                      safeRestartRecognition(150);
                    }
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "1px solid #444",
                    background: language === lng.code ? "#2e7d32" : "#222",
                    color: "white",
                    padding: "8px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {language === lng.code ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <span style={{ width: 16, display: "inline-block" }} />
                  )}
                  <span>
                    {lng.label} — {lng.code}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Upload button hidden per request */}

          {/* Editor button will be placed right before Settings */}

          <IconButton
            onClick={toggleAutoPlay}
            ariaLabel="Auto Scroll"
            tooltipTitle="Auto Scroll (P)"
            tooltipDesc="Play/Pause"
            style={{ background: isPlaying ? "#ff9800" : "#0f0f0f" }}
          >
            <Icon name={isPlaying ? "pause" : "play"} />
          </IconButton>

          {/* Follow Mode button removed per request */}

          {/* Toggle highlight button */}
          <IconButton
            onClick={() => setShowHighlight((v) => !v)}
            ariaLabel="Toggle highlight"
            tooltipTitle="Word highlight (H)"
            tooltipDesc={showHighlight ? "Hide highlight" : "Show highlight"}
            style={{ background: showHighlight ? "#0f0f0f" : "#0f0f0f" }}
          >
            {showHighlight ? (
              // eye icon
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              // eye-off icon
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a20.29 20.29 0 0 1 5.11-5.11" />
                <path d="M22.11 12.89S20 9 17 7.05" />
                <path d="M9.9 9.9a3 3 0 1 0 4.24 4.24" />
                <path d="M1 1l22 22" />
              </svg>
            )}
          </IconButton>

          <IconButton
            onClick={resetPosition}
            ariaLabel="Reset"
            tooltipTitle="Reset (R)"
            tooltipDesc="Go to start and stop modes"
            style={{ background: "#0f0f0f" }}
          >
            <Icon name={"arrow-path"} />
          </IconButton>

          <IconButton
            onClick={() => setShowEditor(!showEditor)}
            ariaLabel="Script Editor"
            tooltipTitle="Script Editor (S)"
            tooltipDesc="Toggle script editor"
            style={{ background: "#0f0f0f" }}
          >
            <Icon name={"pencil-square"} />
          </IconButton>

          <IconButton
            onClick={() => setShowSettings(!showSettings)}
            ariaLabel="Settings"
            tooltipTitle="Settings (E)"
            tooltipDesc="Open configuration"
            style={{ background: "#0f0f0f" }}
          >
            <Icon name={"adjustments-horizontal"} />
          </IconButton>

          <IconButton
            onClick={toggleFullscreen}
            ariaLabel="Fullscreen"
            tooltipTitle="Fullscreen (F)"
            tooltipDesc={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            style={{ background: "#0f0f0f" }}
          >
            <Icon
              name={isFullscreen ? "arrows-pointing-in" : "arrows-pointing-out"}
            />
          </IconButton>

          <IconButton
            onClick={() =>
              window.open("https://buymeacoffee.com/nrjsoeq61", "_blank")
            }
            ariaLabel="Buy Me a Coffee"
            tooltipTitle="Buy Me a Coffee"
            tooltipDesc="Support development with a coffee"
            style={{ background: "#0f0f0f" }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
          </IconButton>

          <IconButton
            onClick={() => (window.location.href = "./index.html")}
            ariaLabel="Back to Homepage"
            tooltipTitle="Back to Homepage"
            tooltipDesc="Return to the main website"
            style={{ background: "#0f0f0f" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </IconButton>
        </div>
      </div>

      {/* Settings Panel */}
      {(showSettings || showEditor) && (
        <div
          data-panel="settings"
          style={{
            position: "fixed",
            top: "80px",
            right: "16px",
            background: "rgba(0,0,0,0.95)",
            padding: "25px",
            borderRadius: "12px",
            zIndex: 1000,
            minwidth: "300px",
            maxWidth: "calc(95vw - 40px)",
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            border: "2px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h3 style={{ color: "white", margin: 0 }}>
              {showEditor ? "Script Editor" : "Settings"}
            </h3>
            <div style={{ marginLeft: "auto" }}>
              <button
                onClick={() => {
                  setShowEditor(false);
                  setShowSettings(false);
                }}
                style={{
                  background: "transparent",
                  border: "1px solid #555",
                  color: "white",
                  padding: "6px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
          {showEditor ? (
            <div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{
                  width: "94%",
                  minHeight: "50vh",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #555",
                  background: "#222",
                  color: "white",
                  fontSize: "14px",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(text);
                    alert("Text copied to clipboard!");
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #555",
                    background: "#2e7d32",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  📋 Copy All Text
                </button>
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to clear all text?")) {
                      setText("");
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #555",
                    background: "#d32f2f",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  🗑️ Clear All
                </button>
              </div>
              <div style={{ height: 8 }} />
            </div>
          ) : (
            <>
              <button
                onClick={resetSettingsToDefault}
                style={{
                  width: "100%",
                  marginBottom: "12px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #555",
                  background: "#b71c1c",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Reset Settings
              </button>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Font size: {fontSize}px
                </label>
                <input
                  type="range"
                  min="16"
                  max="80"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Side padding: {sidePaddingVw}vw
                </label>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={sidePaddingVw}
                  onChange={(e) => setSidePaddingVw(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Text align controls removed per request */}

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Text align
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setTextAlignStyle("left")}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 6,
                      border: "1px solid #555",
                      background:
                        textAlignStyle === "left" ? "#2e7d32" : "#0f0f0f",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="15" y2="12" />
                        <line x1="3" y1="18" x2="18" y2="18" />
                      </svg>
                      Left
                    </span>
                  </button>
                  <button
                    onClick={() => setTextAlignStyle("center")}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 6,
                      border: "1px solid #555",
                      background:
                        textAlignStyle === "center" ? "#2e7d32" : "#0f0f0f",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="6" y1="6" x2="18" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="6" y1="18" x2="18" y2="18" />
                      </svg>
                      Center
                    </span>
                  </button>
                  <button
                    onClick={() => setTextAlignStyle("right")}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 6,
                      border: "1px solid #555",
                      background:
                        textAlignStyle === "right" ? "#2e7d32" : "#0f0f0f",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="9" y1="12" x2="21" y2="12" />
                        <line x1="6" y1="18" x2="21" y2="18" />
                      </svg>
                      Right
                    </span>
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Line height: {lineHeight.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Paragraph spacing: {paragraphSpacingPx}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={paragraphSpacingPx}
                  onChange={(e) =>
                    setParagraphSpacingPx(Number(e.target.value))
                  }
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Auto-scroll speed: {scrollSpeed}
                </label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Lookahead window: {lookaheadWindow} words
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={lookaheadWindow}
                  onChange={(e) => setLookaheadWindow(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <div
                  style={{ color: "#aaa", fontSize: "12px", marginTop: "4px" }}
                >
                  Increase if voice tracking feels slow (recommended: 12-15 for
                  English, 8-10 for Greek)
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Text opacity: {Math.round(textOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="1"
                  step="0.05"
                  value={textOpacity}
                  onChange={(e) => setTextOpacity(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Aim opacity: {Math.round(aimOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={aimOpacity}
                  onChange={(e) => setAimOpacity(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Paragraph highlight opacity:{" "}
                  {Math.round(paragraphHighlightOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.6"
                  step="0.02"
                  value={paragraphHighlightOpacity}
                  onChange={(e) =>
                    setParagraphHighlightOpacity(Number(e.target.value))
                  }
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Operation buttons opacity: {Math.round(uiOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="1"
                  step="0.05"
                  value={uiOpacity}
                  onChange={(e) => setUiOpacity(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Aim indicator: {showAim ? "On" : "Off"}
                </label>
                <button
                  onClick={() => setShowAim(!showAim)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #555",
                    background: showAim ? "#2e7d32" : "#37474f",
                    color: "white",
                    cursor: "pointer",
                    marginBottom: "10px",
                  }}
                  title="Open File — Import .txt/.md/.pdf"
                  aria-label="Toggle Aim Indicator"
                >
                  {showAim ? "Disable" : "Enable"}
                </button>
                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        color: "white",
                        display: "block",
                        marginBottom: "8px",
                      }}
                    >
                      Horizontal offset: {aimOffsetX}px
                    </label>
                    <input
                      type="range"
                      min="-400"
                      max="400"
                      value={aimOffsetX}
                      onChange={(e) => setAimOffsetX(Number(e.target.value))}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        color: "white",
                        display: "block",
                        marginBottom: "8px",
                      }}
                    >
                      Vertical offset: {aimOffsetY}px
                    </label>
                    <input
                      type="range"
                      min="-300"
                      max="300"
                      value={aimOffsetY}
                      onChange={(e) => setAimOffsetY(Number(e.target.value))}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Text centering offset (top/bottom): {centerPaddingVh}vh
                </label>
                <input
                  type="range"
                  min="20"
                  max="60"
                  value={centerPaddingVh}
                  onChange={(e) => setCenterPaddingVh(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Background color
                </label>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  style={{ width: "100%", height: "40px", cursor: "pointer" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Text color
                </label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  style={{ width: "100%", height: "40px", cursor: "pointer" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Highlight color
                </label>
                <input
                  type="color"
                  value={highlightColor}
                  onChange={(e) => setHighlightColor(e.target.value)}
                  style={{ width: "100%", height: "40px", cursor: "pointer" }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Teleprompter Text */}
      <div
        ref={textContainerRef}
        tabIndex={0}
        style={{
          paddingTop: `${centerPaddingVh}vh`,
          // Ensure end-of-text can reach the center: large safety buffer
          paddingBottom: `calc(max(35vh, ${100 - centerPaddingVh}vh) + 120vh)`,
          paddingLeft: `${sidePaddingVw}vw`,
          paddingRight: `${sidePaddingVw}vw`,
          height: "calc(100vh - 70px)",
          overflowY: "auto",
          fontSize: `${fontSize}px`,
          lineHeight: lineHeight,
          color: textColor,
          opacity: textOpacity,
          textAlign: textAlignStyle,
          // avoid CSS smooth scroll; we manage smoothness via JS
          scrollBehavior: "auto",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
          whiteSpace: "pre-wrap",
        }}
        aria-label="Editor"
      >
        {showAim && (
          <div
            style={{
              position: "fixed",
              top: `calc(50% + ${aimOffsetY}px)`,
              left: `calc(50% + ${aimOffsetX}px)`,
              transform: "translate(-50%, -50%)",
              zIndex: 1200,
              pointerEvents: "none",
              opacity: 0.8,
            }}
            aria-hidden="true"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffeb3b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: aimOpacity }}
            >
              <circle cx="12" cy="12" r="2" />
              <path d="M12 1v4" />
              <path d="M12 19v4" />
              <path d="M1 12h4" />
              <path d="M19 12h4" />
            </svg>
          </div>
        )}
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            textAlign: textAlignStyle,
            transform: `${mirrorX ? "scaleX(-1)" : "scaleX(1)"} `,
          }}
        >
          {linesWords.map((lineWordsLocal, lineIdx) => {
            const lineStart = lineStartIndex[lineIdx] || 0;
            const lineEnd = lineStart + lineWordsLocal.length - 1;
            const isCurrentLine =
              currentWordIndex >= lineStart && currentWordIndex <= lineEnd;
            return (
              <div
                key={lineIdx}
                id={`line-${lineIdx}`}
                style={{
                  padding: "4px 8px",
                  margin: `${Math.max(0, paragraphSpacingPx / 4)}px 0`,
                  borderRadius: "6px",
                  backgroundColor: isCurrentLine
                    ? `rgba(255, 235, 59, ${paragraphHighlightOpacity})`
                    : "transparent",
                  outline: isCurrentLine
                    ? `1px dashed ${highlightColor}33`
                    : "none",
                }}
              >
                {lineWordsLocal.map((word, i) => {
                  const index = lineStart + i;
                  const isCurrent = index === currentWordIndex;
                  return (
                    <span
                      key={index}
                      id={`word-${index}`}
                      style={{
                        backgroundColor:
                          isCurrent && showHighlight
                            ? highlightColor
                            : "transparent",
                        color: isCurrent && showHighlight ? "#000" : textColor,
                        borderRadius: "2px",
                        transition:
                          "background-color 0.2s ease, color 0.2s ease",
                        fontWeight:
                          isCurrent && showHighlight ? "normal" : "normal",
                        cursor: "pointer",
                      }}
                      onClick={() => setCurrentWordIndex(index)}
                    >
                      {word}{" "}
                    </span>
                  );
                })}
              </div>
            );
          })}
          {/* dynamic spacer to guarantee room to center near the end */}
          <div style={{ height: `${extraBottomSpacePx}px` }} />
        </div>
      </div>

      {/* iOS Chrome Warning */}
      {isIOSChrome && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255, 152, 0, 0.95)",
            color: "white",
            padding: "15px 20px",
            borderRadius: "8px",
            maxWidth: "90%",
            textAlign: "center",
            zIndex: 2000,
            border: "2px solid #ff9800",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
            ⚠️ iOS Limitation
          </div>
          <div style={{ fontSize: "14px" }}>
            Speech recognition doesn't work on iOS devices.
            <br />
            Only <strong>Auto Play</strong> mode is available.
          </div>
        </div>
      )}

      {/* Status Indicator */}
      {isListening && (
        <div
          style={{
            position: "fixed",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(244, 67, 54, 0.9)",
            color: "white",
            padding: "15px 30px",
            borderRadius: "50px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: "bold",
            animation: "pulse 1.5s infinite",
          }}
        >
          <span aria-hidden="true">🎙️</span>
          Listening...
        </div>
      )}

      {/* Support Message */}
      {showSupportMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "12px 16px",
            borderRadius: "8px",
            fontSize: "12px",
            maxWidth: "calc(100vw - 40px)",
            textAlign: "center",
            border: "1px solid rgba(255,255,255,0.1)",
            opacity: 0.7,
          }}
        >
          <button
            onClick={() => setShowSupportMessage(false)}
            style={{
              position: "absolute",
              top: "4px",
              right: "6px",
              background: "transparent",
              border: "none",
              color: "white",
              fontSize: "14px",
              cursor: "pointer",
              padding: "2px",
              borderRadius: "2px",
              width: "16px",
              height: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Close support message"
          >
            ×
          </button>
          <div style={{ marginBottom: "8px", fontWeight: "bold" }}>
            Enjoying Smart Teleprompter?
          </div>
          <div style={{ marginBottom: "8px" }}>
            Support development with a coffee ☕
          </div>
          <button
            onClick={() =>
              window.open("https://buymeacoffee.com/nrjsoeq61", "_blank")
            }
            style={{
              background: "#ff6b35",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: "bold",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Buy Me a Coffee
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        /* Custom scrollbar for toolbar */
        div[style*="overflowX: auto"]::-webkit-scrollbar {
          height: 6px;
        }
        
        div[style*="overflowX: auto"]::-webkit-scrollbar-track {
          background: transparent;
        }
        
        div[style*="overflowX: auto"]::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        
        div[style*="overflowX: auto"]::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        
        /* Responsive toolbar alignment */
        .toolbar-buttons {
          justify-content: flex-start;
        }
        
        @media (min-width: 768px) {
          .toolbar-buttons {
            justify-content: center !important;
          }
        }
      `}</style>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SmartTeleprompter />);
