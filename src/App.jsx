import { useState, useEffect, useLayoutEffect, useRef, memo } from "react";
import { splitWords, normalizeWord } from "./words";

// Inline SVG icons (Heroicons v2.1.1 outline, MIT). Inlined instead of
// loading from unpkg.com so the UI has zero external requests, renders
// instantly, and keeps working offline / if the CDN is down.
const ICON_PATHS = {
  "arrow-up-tray":
    "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5",
  microphone:
    "M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z",
  pause: "M15.75 5.25v13.5m-7.5-13.5v13.5",
  play: "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z",
  "arrow-path":
    "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99",
  "pencil-square":
    "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10",
  "adjustments-horizontal":
    "M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75",
  "arrows-pointing-in":
    "M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25",
  "arrows-pointing-out":
    "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15",
};

function Icon({ name }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

// Co-host speaker markers (GitHub #2): a line starting with ">>" or "@Name:"
// belongs to another speaker. It renders dimmed and voice tracking skips it,
// so shared scripts auto-jump to the presenter's next line no matter how long
// the co-host's part is.
const CO_HOST_LINE_RE = /^\s*(>>|@[^\s:]{1,30}:)/;

// One rendered line of the script, memoized.
// Why: speech recognition fires a result every ~100-300ms and each one updates
// currentWordIndex. Before, that re-rendered EVERY word span in the script
// (thousands of spans for long scripts). With memo + an `activeIndex` that is
// -1 for lines not containing the current word, only the line losing the
// highlight and the line gaining it re-render. Large scripts stay smooth.
const TeleprompterLine = memo(function TeleprompterLine({
  words,
  glue, // glue[i] true = no space after word i (unspaced CJK/Thai segments)
  lineIdx,
  lineStart,
  activeIndex, // global index of the current word if it is in this line, else -1
  isCoHost, // dimmed, skipped by voice tracking
  showHighlight,
  highlightColor,
  textColor,
  paragraphSpacingPx,
  paragraphHighlightOpacity,
  onWordClick,
}) {
  const isCurrentLine = activeIndex >= 0;
  return (
    <div
      id={`line-${lineIdx}`}
      style={{
        padding: "4px 8px",
        margin: `${Math.max(0, paragraphSpacingPx / 4)}px 0`,
        borderRadius: "6px",
        backgroundColor: isCurrentLine
          ? `rgba(255, 235, 59, ${paragraphHighlightOpacity})`
          : "transparent",
        outline: isCurrentLine ? `1px dashed ${highlightColor}33` : "none",
        opacity: isCoHost ? 0.45 : 1,
        fontStyle: isCoHost ? "italic" : "normal",
      }}
    >
      {words.map((word, i) => {
        const index = lineStart + i;
        const isCurrent = index === activeIndex;
        return (
          <span
            key={index}
            id={`word-${index}`}
            style={{
              backgroundColor:
                isCurrent && showHighlight ? highlightColor : "transparent",
              color: isCurrent && showHighlight ? "#000" : textColor,
              borderRadius: "2px",
              // 0.1s (was 0.2s): user feedback said the word marking felt
              // sluggish — most of that was this transition, not recognition
              transition: "background-color 0.1s ease, color 0.1s ease",
              fontWeight: "normal",
              cursor: "pointer",
            }}
            onClick={() => onWordClick(index)}
          >
            {word}
            {glue && glue[i] ? "" : " "}
          </span>
        );
      })}
    </div>
  );
});

function IconButton({
  onClick,
  ariaLabel,
  tooltipTitle,
  tooltipDesc,
  children,
  style,
  disabled,
  uiOpacity = 0.9,
}) {
  const [showTip, setShowTip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tipTimer = useRef(null);
  const buttonRef = useRef(null);
  const tipRef = useRef(null);

  const openWithDelay = () => {
    // No tooltips on touch devices: they'd only appear together with the tap
    // (after the action already fired) and they advertise keyboard shortcuts
    // that don't exist there. aria-labels still cover accessibility.
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(hover: none)").matches
    )
      return;
    if (tipTimer.current) clearTimeout(tipTimer.current);
    tipTimer.current = setTimeout(() => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        // The tooltip uses position:fixed, which is viewport-relative —
        // getBoundingClientRect() is already viewport-relative, so adding
        // window.scrollY here pushed the tooltip down by the scroll amount
        // (it appeared mid-screen once the script had scrolled).
        setTooltipPosition({
          top: rect.bottom + 8,
          left: rect.left + rect.width / 2,
        });
      }
      setShowTip(true);
    }, 200);
  };

  // After the tooltip renders, nudge it back inside the viewport if it
  // overflows an edge (e.g. the leftmost toolbar buttons).
  useLayoutEffect(() => {
    if (!showTip || !tipRef.current) return;
    const r = tipRef.current.getBoundingClientRect();
    let dx = 0;
    if (r.left < 8) dx = 8 - r.left;
    else if (r.right > window.innerWidth - 8)
      dx = window.innerWidth - 8 - r.right;
    if (dx !== 0)
      setTooltipPosition((p) => ({ ...p, left: p.left + dx }));
  }, [showTip]);

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
          ref={tipRef}
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
}

export default function SmartTeleprompter() {
  const [text, setText] =
    useState(`Welcome to Smart Teleprompter the free, open-source teleprompter application that uses real-time speech recognition to automatically follow your voice as you read.

⚠️ IMPORTANT COMPATIBILITY NOTES:
• For BEST EXPERIENCE: Use Desktop/Laptop with Chrome browser
• iPhone/iPad: Only Auto-scroll mode works (no voice recognition)
• Android: Voice recognition may work but performance varies
• Mobile browsers have limited Web Speech API support

QUICK START
Press the microphone button (or V) to start voice tracking. The app will highlight words as you speak them and smoothly scroll to keep your current position centered on screen.

💾 DATA STORAGE
Your settings and script content are automatically saved to your browser's localStorage. This means:
• Your preferences persist between sessions
• Your script is preserved when you reload the page
• Data is stored locally on your device (no cloud storage)

KEYBOARD SHORTCUTS
V - Start/Stop microphone
P - Play/Pause auto-scroll
H - Toggle word highlighting
R - Reset to beginning
L - Language selection
E - Settings menu
S - Script editor
B - My Scripts library
F - Fullscreen mode
M - Mirror text horizontally
? - Show keyboard shortcuts

KEY FEATURES
- Voice-controlled scrolling with 20+ language support
- Script library — save, edit, and load up to 50 scripts with per-script language
- Adjustable font size, colors, and spacing
- Customizable scroll speed and text positioning
- Camera aim indicator for perfect alignment
- Import scripts from .txt or .md files
- Horizontal mirroring for teleprompter hardware
- Paragraph and word highlighting modes

SUPPORTED LANGUAGES
🇺🇸 English (US) • 🇬🇧 English (UK) • 🇪🇸 Spanish (Spain) • 🇲🇽 Spanish (Mexico) • 🇫🇷 French • 🇩🇪 German • 🇮🇹 Italian • 🇧🇷 Portuguese (Brazil) • 🇵🇹 Portuguese (Portugal) • 🇷🇺 Russian • 🇨🇳 Chinese • 🇯🇵 Japanese • 🇰🇷 Korean • 🇸🇦 Arabic • 🇮🇳 Hindi • 🇹🇷 Turkish • 🇳🇱 Dutch • 🇬🇷 Greek • 🇵🇱 Polish • 🇸🇪 Swedish • 🇳🇴 Norwegian • 🇩🇰 Danish • 🇫🇮 Finnish • 🇮🇩 Indonesian

TIPS FOR BEST RESULTS
- Use Chrome browser on Desktop/Laptop for optimal performance
- iPhone/iPad users: Use Auto-scroll mode (P key) - voice recognition not supported
- Android users: Voice recognition may work but desktop recommended
- External microphones provide better accuracy than built-in mics
- Minimize background noise for improved tracking
- Stable internet connection required (5+ Mbps recommended)
- Speak at natural pace with clear pronunciation

This project is completely free and open source. If you find it useful, consider supporting development at smarttelepromter.com

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
  const [showCenterLine, setShowCenterLine] = useState(false);
  const [showAim, setShowAim] = useState(true);
  const [showHighlight, setShowHighlight] = useState(true);
  const [aimOffsetX, setAimOffsetX] = useState(0);
  const [aimOffsetY, setAimOffsetY] = useState(0);
  // Aim marker style/color + hideable "Listening" pill — added after user
  // feedback (Reddit r/elgato): the red pill can distract during recording,
  // and users asked for marker variants (e.g. Elgato-style frame, blue color).
  const [aimStyle, setAimStyle] = useState("crosshair"); // crosshair | dot | frame
  const [aimColor, setAimColor] = useState("#ffeb3b");
  const [showListeningIndicator, setShowListeningIndicator] = useState(true);
  // Co-host lines (">>" / "@Name:") — dim them and let voice tracking skip them
  const [skipCoHostLines, setSkipCoHostLines] = useState(true);
  const [lineIsCoHost, setLineIsCoHost] = useState([]);
  // Toolbar overflow hints (mobile): which directions have hidden icons
  const [toolbarHints, setToolbarHints] = useState({
    left: false,
    right: false,
  });
  const [textOpacity, setTextOpacity] = useState(0.8);
  const [aimOpacity, setAimOpacity] = useState(1);
  const [uiOpacity, setUiOpacity] = useState(0.9);
  const [sidePaddingVw, setSidePaddingVw] = useState(10);
  const [textAlignStyle, setTextAlignStyle] = useState("left");
  const [mirrorX, setMirrorX] = useState(false);
  const [language, setLanguage] = useState("en-US");
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const languageBtnRef = useRef(null);
  const [languageMenuPos, setLanguageMenuPos] = useState({ top: 0, left: 0 });
  const [showSupportMessage, setShowSupportMessage] = useState(() => {
    try {
      const saved = localStorage.getItem(
        "smartTeleprompterSupportMessageDismissed"
      );
      return saved !== "true";
    } catch (error) {
      console.error("Failed to load support message state:", error);
      return true;
    }
  });
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
    { code: "nb-NO", label: "🇳🇴 Norsk" },
    { code: "da-DK", label: "🇩🇰 Dansk" },
    { code: "fi-FI", label: "🇫🇮 Suomi" },
    { code: "id-ID", label: "🇮🇩 Bahasa Indonesia" },
  ];
  const [paragraphHighlightOpacity, setParagraphHighlightOpacity] =
    useState(0.12);
  const [linesWords, setLinesWords] = useState([]);
  const [linesGlue, setLinesGlue] = useState([]);
  const [lineStartIndex, setLineStartIndex] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showScriptList, setShowScriptList] = useState(false);
  const [savedScripts, setSavedScripts] = useState([]);
  const [showAddScript, setShowAddScript] = useState(false);
  const [editScriptId, setEditScriptId] = useState(null);
  const [addScriptName, setAddScriptName] = useState("");
  const [addScriptText, setAddScriptText] = useState("");
  const [addScriptLanguage, setAddScriptLanguage] = useState("en-US");
  const [scriptFormTouched, setScriptFormTouched] = useState(false);
  const [deleteScriptConfirm, setDeleteScriptConfirm] = useState(null);
  const [shareBusyId, setShareBusyId] = useState(null);
  const [paragraphSpacingPx, setParagraphSpacingPx] = useState(12);
  const [extraBottomSpacePx, setExtraBottomSpacePx] = useState(0);

  const recognitionRef = useRef(null);
  const wordsRef = useRef([]);
  const normalizedWordsRef = useRef([]);
  const linesRawRef = useRef([]);
  const linesWordsRef = useRef([]);
  const lineStartIndexRef = useRef([]);
  const toolbarScrollRef = useRef(null);
  // Co-host markers: per-line + per-word skip flags, and a live ref for the
  // setting (refs so the speech-recognition closures always see fresh values)
  const lineIsCoHostRef = useRef([]);
  const skippableWordsRef = useRef([]);
  const skipCoHostRef = useRef(true);
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
      // Same splitter as the script (segments Chinese/Japanese transcripts,
      // which Chrome returns without spaces)
      const tokens = splitWords(transcript)
        .words.map(normalizeWord)
        .filter(Boolean);
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
    aimStyle: "crosshair",
    aimColor: "#ffeb3b",
    showListeningIndicator: true,
    skipCoHostLines: true,
    textOpacity: 0.8,
    aimOpacity: 1,
    uiOpacity: 0.9,
    paragraphSpacingPx: 4,
    sidePaddingVw: 20,
    textAlignStyle: "left",
    paragraphHighlightOpacity: 0.2,
    language: "en-US",
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
    setAimStyle(defaultSettings.aimStyle);
    setAimColor(defaultSettings.aimColor);
    setShowListeningIndicator(defaultSettings.showListeningIndicator);
    setSkipCoHostLines(defaultSettings.skipCoHostLines);
    setTextOpacity(defaultSettings.textOpacity);
    setAimOpacity(defaultSettings.aimOpacity);
    setUiOpacity(defaultSettings.uiOpacity);
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

  // Script Library
  const SCRIPTS_KEY = "tp_scripts_v1";
  const MAX_SCRIPTS = 50;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCRIPTS_KEY);
      if (raw) {
        setSavedScripts(JSON.parse(raw));
      } else {
        // Migrate existing script from settings if present
        const seeds = [];
        try {
          const settingsRaw = localStorage.getItem(SETTINGS_KEY);
          if (settingsRaw) {
            const s = JSON.parse(settingsRaw);
            if (s.text && s.text.trim()) {
              seeds.push({
                id: "migrated",
                name: "My Script",
                text: s.text,
                language: s.language || "en-US",
                savedAt: new Date().toISOString(),
              });
            }
          }
        } catch (_) {}
        // Always include the demo script
        seeds.push({
          id: "demo",
          name: "Demo Script",
          text,
          language: "en-US",
          savedAt: new Date().toISOString(),
        });
        setSavedScripts(seeds);
        localStorage.setItem(SCRIPTS_KEY, JSON.stringify(seeds));
      }
    } catch (_) {}
  }, []);

  const saveScriptsToStorage = (scripts) => {
    setSavedScripts(scripts);
    try {
      localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts));
    } catch (_) {}
  };

  const openAddScriptModal = () => {
    setEditScriptId(null);
    setAddScriptName("");
    setAddScriptText("");
    setAddScriptLanguage("en-US");
    setScriptFormTouched(false);
    setShowAddScript(true);
  };

  const openEditScriptModal = (script) => {
    setEditScriptId(script.id);
    setAddScriptName(script.name);
    setAddScriptText(script.text);
    setAddScriptLanguage(script.language || "en-US");
    setScriptFormTouched(false);
    setShowAddScript(true);
  };

  const saveScript = (andLoad) => {
    setScriptFormTouched(true);
    const trimmed = (addScriptName || "").trim();
    if (!trimmed || !addScriptText.trim() || !addScriptLanguage) return;

    let updated;
    if (editScriptId) {
      updated = savedScripts.map((s) =>
        s.id === editScriptId
          ? { ...s, name: trimmed, text: addScriptText, language: addScriptLanguage, savedAt: new Date().toISOString() }
          : s
      );
    } else {
      const newScript = {
        id: Date.now().toString(),
        name: trimmed,
        text: addScriptText,
        language: addScriptLanguage,
        savedAt: new Date().toISOString(),
      };
      updated = [newScript, ...savedScripts].slice(0, MAX_SCRIPTS);
    }
    saveScriptsToStorage(updated);
    setShowAddScript(false);
    setEditScriptId(null);
    if (andLoad) {
      setText(addScriptText);
      setLanguage(addScriptLanguage);
    }
  };

  const loadScript = (script) => {
    setText(script.text);
    if (script.language) setLanguage(script.language);
  };

  // --- Share a script via link (Cloudflare Pages Function + KV) ---
  // POST /api/share stores the script server-side for 30 days and returns a
  // short id; the link opens the app on any device with ?share=<id>.
  const shareScript = async (script) => {
    if (shareBusyId) return;
    setShareBusyId(script.id);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: script.name,
          text: script.text,
          language: script.language || "en-US",
        }),
      });
      if (!res.ok) {
        alert(
          res.status === 503
            ? "Sharing is not configured on this deployment yet."
            : "Could not create the share link. Please try again."
        );
        return;
      }
      const data = await res.json();
      const url = `${window.location.origin}/app.html?share=${data.id}`;
      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch (_) {}
      alert(
        (copied
          ? "Share link copied to clipboard:\n\n"
          : "Share link (copy it manually):\n\n") +
          url +
          "\n\nAnyone with the link can import this script. It expires in 30 days."
      );
    } catch (_) {
      alert("Could not create the share link. Check your connection and try again.");
    } finally {
      setShareBusyId(null);
    }
  };

  // Import a script that was shared via link (?share=<id>).
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const shareId = params.get("share");
      if (!shareId) return;
      // Strip the param immediately so a reload doesn't re-import.
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("share");
        window.history.replaceState(
          {},
          "",
          url.pathname + url.search + url.hash
        );
      } catch (_) {}
      fetch(`/api/share/${encodeURIComponent(shareId)}`)
        .then((r) =>
          r.ok ? r.json() : Promise.reject(new Error(String(r.status)))
        )
        .then((data) => {
          if (!data || typeof data.text !== "string" || !data.text.trim())
            throw new Error("empty");
          const newScript = {
            id: Date.now().toString(),
            name: (data.title || "Shared script").slice(0, 100),
            text: data.text,
            language: data.language || "en-US",
            savedAt: new Date().toISOString(),
          };
          // Functional update: the fetch resolves after mount, so the saved
          // scripts state is already populated; never overwrite it blindly.
          setSavedScripts((prev) => {
            const updated = [newScript, ...prev].slice(0, MAX_SCRIPTS);
            try {
              localStorage.setItem(SCRIPTS_KEY, JSON.stringify(updated));
            } catch (_) {}
            return updated;
          });
          setText(data.text);
          if (data.language) setLanguage(data.language);
          alert(`Shared script "${newScript.name}" was imported and loaded.`);
        })
        .catch(() => {
          alert("This share link is invalid or has expired.");
        });
    } catch (_) {}
  }, []);

  const confirmDeleteScript = () => {
    if (!deleteScriptConfirm) return;
    saveScriptsToStorage(savedScripts.filter((s) => s.id !== deleteScriptConfirm.id));
    setDeleteScriptConfirm(null);
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
      if (s.aimStyle) setAimStyle(s.aimStyle);
      if (s.aimColor) setAimColor(s.aimColor);
      if (s.showListeningIndicator != null)
        setShowListeningIndicator(s.showListeningIndicator);
      if (s.skipCoHostLines != null) setSkipCoHostLines(s.skipCoHostLines);
      if (s.textOpacity != null) setTextOpacity(s.textOpacity);
      if (s.aimOpacity != null) setAimOpacity(s.aimOpacity);
      if (s.uiOpacity != null) setUiOpacity(s.uiOpacity);
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

  // Persist settings on change.
  // Debounced (400ms): previously this serialized ALL settings PLUS the whole
  // script text to localStorage on every keystroke — noticeable jank with
  // long scripts. Also fixed: `language` and `mirrorX` were missing from the
  // dependency array, so changing them alone was never persisted.
  useEffect(() => {
    const timer = setTimeout(() => {
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
        aimStyle,
        aimColor,
        showListeningIndicator,
        skipCoHostLines,
        textOpacity,
        aimOpacity,
        uiOpacity,
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
    }, 400);
    return () => clearTimeout(timer);
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
    aimStyle,
    aimColor,
    showListeningIndicator,
    skipCoHostLines,
    textOpacity,
    aimOpacity,
    uiOpacity,
    paragraphSpacingPx,
    sidePaddingVw,
    textAlignStyle,
    paragraphHighlightOpacity,
    language,
    mirrorX,
    text,
  ]);

  // Keep the co-host-skip flag in a ref so recognition callbacks (created
  // once per mic session) always see the current value without re-binding.
  useEffect(() => {
    skipCoHostRef.current = skipCoHostLines;
  }, [skipCoHostLines]);

  // Toolbar overflow hints: on narrow screens the toolbar scrolls
  // horizontally, but nothing indicated that more icons exist off-screen.
  // Track scroll position and show tappable arrows + edge fades.
  const updateToolbarHints = () => {
    const el = toolbarScrollRef.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setToolbarHints((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right }
    );
  };

  const scrollToolbar = (dir) => {
    const el = toolbarScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(150, el.clientWidth * 0.6), behavior: "smooth" });
  };

  useEffect(() => {
    updateToolbarHints();
    window.addEventListener("resize", updateToolbarHints);
    return () => window.removeEventListener("resize", updateToolbarHints);
  }, []);

  // Sync body background with setting
  useEffect(() => {
    try {
      if (typeof document !== "undefined" && document.body) {
        document.body.style.backgroundColor = bgColor;
        document.body.style.background = bgColor;
      }
    } catch (_) {}
  }, [bgColor]);

  const handleFileUpload = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    try {
      if (ext === "txt" || ext === "md" || ext === "markdown") {
        const txt = await file.text();
        setText(txt);
        setShowEditor(true);
      } else {
        alert("Supported file types: .txt, .md");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to load file");
    } finally {
      event.target.value = "";
    }
  };

  const FileButton = ({ onFile }) => {
    const inputRef = useRef(null);
    return (
      <IconButton uiOpacity={uiOpacity}
        onClick={() => inputRef.current && inputRef.current.click()}
        ariaLabel="Open File"
        tooltipTitle="Open File"
        tooltipDesc="Import .txt/.md"
      >
        <Icon name={"arrow-up-tray"} />
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,.markdown,text/plain,text/markdown"
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

  useEffect(() => {
    const lines = text.split(/\r?\n/);
    linesRawRef.current = lines;
    // splitWords also segments unspaced scripts (Chinese/Japanese/Thai)
    const linesSplit = lines.map((ln) => splitWords(ln));
    const linesWords = linesSplit.map((sp) => sp.words);
    linesWordsRef.current = linesWords;

    // Which lines belong to a co-host (">>" / "@Name:" prefix)
    const lineIsCoHostArr = lines.map((ln) => CO_HOST_LINE_RE.test(ln));
    lineIsCoHostRef.current = lineIsCoHostArr;

    const flatWords = [];
    const starts = [];
    const skippable = [];
    for (let i = 0; i < linesWords.length; i++) {
      starts.push(flatWords.length);
      for (const w of linesWords[i]) {
        flatWords.push(w);
        skippable.push(lineIsCoHostArr[i]);
      }
    }
    lineStartIndexRef.current = starts;
    wordsRef.current = flatWords;
    normalizedWordsRef.current = flatWords.map(normalizeWord);
    skippableWordsRef.current = skippable;
    setLinesWords(linesWords);
    setLinesGlue(linesSplit.map((sp) => sp.glue));
    setLineStartIndex(starts);
    setLineIsCoHost(lineIsCoHostArr);
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

    // Build the list of searchable word indices. Co-host words (">>" /
    // "@Name:" lines) are excluded when skipping is enabled, so the window
    // "flows over" another speaker's block no matter how long it is —
    // the window budget is only spent on the presenter's own words.
    const skip = skipCoHostRef.current ? skippableWordsRef.current : null;
    const total = normalizedWordsRef.current.length;
    const searchIdx = [];
    for (
      let i = startIndex;
      i < total && searchIdx.length < Math.max(1, maxWindow);
      i++
    ) {
      if (skip && skip[i]) continue;
      searchIdx.push(i);
    }

    // Strict 3-gram then 2-gram equality (can jump further)
    for (let n = Math.min(3, candidates.length); n >= 2; n--) {
      const seq = candidates.slice(-n);
      for (const i of searchIdx) {
        let ok = true;
        for (let k = 0; k < n; k++) {
          const target = normalizedWordsRef.current[i + k];
          const token = seq[k];
          if (
            !target ||
            (skip && skip[i + k]) ||
            !tokensEqual(target, token)
          ) {
            ok = false;
            break;
          }
        }
        if (ok) return { index: i + (n - 1), nUsed: n };
      }
    }

    // 1-token equality but restrict jump (first few searchable words only)
    const softIdx = searchIdx.slice(0, Math.max(1, maxSoftSkip + 1));
    const t1 = candidates[candidates.length - 1];
    for (const i of softIdx) {
      const target = normalizedWordsRef.current[i];
      if (tokensEqual(target, t1)) return { index: i, nUsed: 1 };
    }

    // soft matches (prefix/contains) within soft limit
    for (const i of softIdx) {
      const target = normalizedWordsRef.current[i];
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
    // Never match inside a co-host line — fall through to the wider search
    // (tryAdvanceByTokens), which skips over it entirely.
    if (skipCoHostRef.current && lineIsCoHostRef.current[lineIdx])
      return -1;
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
      alert(
        "Speech recognition is not supported in this browser. Please use Chrome or Edge, or press P for auto-scroll mode."
      );
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

  // Save support message dismissal to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(
          "smartTeleprompterSupportMessageDismissed",
          showSupportMessage ? "false" : "true"
        );
        console.log(
          "Support message state saved to localStorage:",
          showSupportMessage
        );
      } catch (error) {
        console.error(
          "Failed to save support message state to localStorage:",
          error
        );
      }
    }
  }, [showSupportMessage]);

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
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        setShowEditor(true);
        setShowScriptList((v) => !v);
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
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        if (deleteScriptConfirm) { setDeleteScriptConfirm(null); }
        else if (showAddScript) { setShowAddScript(false); }
        else if (showShortcuts) { setShowShortcuts(false); }
        else if (showResetConfirm) { setShowResetConfirm(false); }
        else if (showEditor) { setShowEditor(false); }
        else if (showSettings) { setShowSettings(false); }
        else return;
        e.preventDefault();
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isListening, isPlaying, showHighlight, showShortcuts]);

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

  // ---- WebMCP: expose teleprompter controls to browser AI agents ----
  // Keep the latest handlers/state reachable from tool callbacks without
  // re-registering tools on every render.
  const webmcpApiRef = useRef({});
  useEffect(() => {
    webmcpApiRef.current = {
      setText,
      setLanguage,
      setScrollSpeed,
      setFontSize,
      toggleAutoPlay,
      toggleListening,
      resetPosition,
      loadScript,
      savedScripts,
      isPlaying,
      isListening,
      language,
      scrollSpeed,
      fontSize,
    };
  });

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.modelContext) return;

    const ok = (text) => ({ content: [{ type: "text", text }] });
    const clampNum = (v, min, max, fallback) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return fallback;
      return Math.max(min, Math.min(max, n));
    };

    const tools = [
      {
        name: "load_script",
        description:
          "Replace the teleprompter script with new text. Optionally set the spoken language (BCP-47 code, e.g. en-US, el-GR).",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "The full script text to display.",
            },
            language: {
              type: "string",
              description: "Optional BCP-47 language code, e.g. en-US or el-GR.",
            },
          },
          required: ["text"],
        },
        async execute({ text, language } = {}) {
          const api = webmcpApiRef.current;
          const value = String(text ?? "");
          api.setText(value);
          if (language) api.setLanguage(String(language));
          return ok(
            `Loaded script (${value.length} characters)` +
              (language ? `, language ${language}.` : ".")
          );
        },
      },
      {
        name: "start_autoscroll",
        description:
          "Start automatic scrolling of the teleprompter at the current speed.",
        inputSchema: { type: "object", properties: {} },
        async execute() {
          const api = webmcpApiRef.current;
          if (!api.isPlaying) api.toggleAutoPlay();
          return ok("Auto-scroll started.");
        },
      },
      {
        name: "start_voice_tracking",
        description:
          "Start microphone voice tracking so the teleprompter follows the reader's speech. Requires mic permission; desktop Chrome recommended.",
        inputSchema: { type: "object", properties: {} },
        async execute() {
          const api = webmcpApiRef.current;
          if (!api.isListening) api.toggleListening();
          return ok("Voice tracking started.");
        },
      },
      {
        name: "stop",
        description:
          "Stop auto-scroll and voice tracking and reset the reading position to the top.",
        inputSchema: { type: "object", properties: {} },
        async execute() {
          webmcpApiRef.current.resetPosition();
          return ok("Stopped and reset to the beginning.");
        },
      },
      {
        name: "set_speed",
        description: "Set the auto-scroll speed (1 = slowest, 100 = fastest).",
        inputSchema: {
          type: "object",
          properties: {
            speed: { type: "number", minimum: 1, maximum: 100 },
          },
          required: ["speed"],
        },
        async execute({ speed } = {}) {
          const v = clampNum(speed, 1, 100, 88);
          webmcpApiRef.current.setScrollSpeed(v);
          return ok(`Scroll speed set to ${v}.`);
        },
      },
      {
        name: "set_font_size",
        description: "Set the teleprompter font size in pixels (12–200).",
        inputSchema: {
          type: "object",
          properties: {
            size: { type: "number", minimum: 12, maximum: 200 },
          },
          required: ["size"],
        },
        async execute({ size } = {}) {
          const v = clampNum(size, 12, 200, 32);
          webmcpApiRef.current.setFontSize(v);
          return ok(`Font size set to ${v}px.`);
        },
      },
      {
        name: "set_language",
        description:
          "Set the speech-recognition language using a BCP-47 code (e.g. en-US, el-GR, es-ES).",
        inputSchema: {
          type: "object",
          properties: { language: { type: "string" } },
          required: ["language"],
        },
        async execute({ language } = {}) {
          webmcpApiRef.current.setLanguage(String(language));
          return ok(`Language set to ${language}.`);
        },
      },
      {
        name: "list_scripts",
        description:
          "List the saved scripts in the user's local library (name and language).",
        inputSchema: { type: "object", properties: {} },
        async execute() {
          const scripts = webmcpApiRef.current.savedScripts || [];
          if (!scripts.length) return ok("No saved scripts.");
          return ok(
            scripts
              .map((s, i) => `${i + 1}. ${s.name} [${s.language || "en-US"}]`)
              .join("\n")
          );
        },
      },
      {
        name: "load_saved_script",
        description:
          "Load a saved script from the library by its name (case-insensitive).",
        inputSchema: {
          type: "object",
          properties: { name: { type: "string" } },
          required: ["name"],
        },
        async execute({ name } = {}) {
          const api = webmcpApiRef.current;
          const scripts = api.savedScripts || [];
          const target = scripts.find(
            (s) =>
              (s.name || "").toLowerCase() === String(name).toLowerCase()
          );
          if (!target) return ok(`No saved script named "${name}".`);
          api.loadScript(target);
          return ok(`Loaded "${target.name}".`);
        },
      },
      {
        name: "get_state",
        description:
          "Get the current teleprompter state: auto-scroll/voice status, language, speed and font size.",
        inputSchema: { type: "object", properties: {} },
        async execute() {
          const a = webmcpApiRef.current;
          return ok(
            JSON.stringify({
              autoScrolling: !!a.isPlaying,
              voiceTracking: !!a.isListening,
              language: a.language,
              scrollSpeed: a.scrollSpeed,
              fontSize: a.fontSize,
            })
          );
        },
      },
    ];

    try {
      const mc = navigator.modelContext;
      if (typeof mc.provideContext === "function") {
        mc.provideContext({ tools });
      } else if (typeof mc.registerTool === "function") {
        tools.forEach((t) => mc.registerTool(t));
      }
    } catch (err) {
      console.error("WebMCP registration failed:", err);
    }
  }, []);

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: bgColor,
        position: "relative",
        overflow: "visible",
      }}
    >
      {/* Center Line Indicator */}
      {showCenterLine && (
        <div
          style={{
            position: "fixed",
            top: `${centerPaddingVh}vh`,
            left: 0,
            right: 0,
            height: "2px",
            backgroundColor: "#ff0000",
            zIndex: 9999,
            pointerEvents: "none",
            opacity: 0.8,
          }}
        />
      )}

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
        {toolbarHints.left && (
          <button
            onClick={() => scrollToolbar(-1)}
            aria-label="Scroll toolbar left"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "36px",
              border: "none",
              cursor: "pointer",
              zIndex: 2,
              background:
                "linear-gradient(to right, rgba(0,0,0,0.95) 45%, rgba(0,0,0,0))",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              paddingLeft: "4px",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {toolbarHints.right && (
          <button
            onClick={() => scrollToolbar(1)}
            aria-label="Scroll toolbar right"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              width: "36px",
              border: "none",
              cursor: "pointer",
              zIndex: 2,
              background:
                "linear-gradient(to left, rgba(0,0,0,0.95) 45%, rgba(0,0,0,0))",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: "4px",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        <div
          className="toolbar-buttons"
          ref={toolbarScrollRef}
          onScroll={updateToolbarHints}
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
          <IconButton uiOpacity={uiOpacity}
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
            <IconButton uiOpacity={uiOpacity}
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
          <IconButton uiOpacity={uiOpacity}
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

          <IconButton uiOpacity={uiOpacity}
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
          <IconButton uiOpacity={uiOpacity}
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

          <IconButton uiOpacity={uiOpacity}
            onClick={resetPosition}
            ariaLabel="Reset"
            tooltipTitle="Reset (R)"
            tooltipDesc="Go to start and stop modes"
            style={{ background: "#0f0f0f" }}
          >
            <Icon name={"arrow-path"} />
          </IconButton>

          <IconButton uiOpacity={uiOpacity}
            onClick={() => setShowEditor(!showEditor)}
            ariaLabel="Script Editor"
            tooltipTitle="Script Editor (S)"
            tooltipDesc="Toggle script editor"
            style={{ background: "#0f0f0f" }}
          >
            <Icon name={"pencil-square"} />
          </IconButton>

          <IconButton uiOpacity={uiOpacity}
            onClick={() => setShowSettings(!showSettings)}
            ariaLabel="Settings"
            tooltipTitle="Settings (E)"
            tooltipDesc="Open configuration"
            style={{ background: "#0f0f0f" }}
          >
            <Icon name={"adjustments-horizontal"} />
          </IconButton>

          <IconButton uiOpacity={uiOpacity}
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

          <IconButton uiOpacity={uiOpacity}
            onClick={() => setShowShortcuts((v) => !v)}
            ariaLabel="Keyboard Shortcuts"
            tooltipTitle="Keyboard Shortcuts (?)"
            tooltipDesc="Show all keyboard shortcuts"
            style={{ background: showShortcuts ? "#1565c0" : "#0f0f0f" }}
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
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
              <path d="M6 8h.001" />
              <path d="M10 8h.001" />
              <path d="M14 8h.001" />
              <path d="M18 8h.001" />
              <path d="M6 12h.001" />
              <path d="M18 12h.001" />
              <path d="M8 16h8" />
            </svg>
          </IconButton>

          <IconButton uiOpacity={uiOpacity}
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

          <IconButton uiOpacity={uiOpacity}
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
            zIndex: 10000,
            minWidth: "320px",
            maxWidth: showEditor ? "500px" : "calc(95vw - 40px)",
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
            <h2 style={{ color: "white", margin: 0 }}>
              {showEditor ? "Script Editor" : "Settings"}
            </h2>
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
                  minHeight: showScriptList ? "25vh" : "50vh",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #555",
                  background: "#222",
                  color: "white",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  transition: "min-height 0.2s ease",
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
                  📋 Copy
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
                  🗑️ Clear
                </button>
              </div>

              {/* My Scripts section */}
              <div style={{ marginTop: "14px" }}>
                <button
                  onClick={() => setShowScriptList((v) => !v)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #444",
                    background: showScriptList ? "#1a1a1a" : "#0f0f0f",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "bold",
                  }}
                >
                  <span>📚 My Scripts ({savedScripts.length}/{MAX_SCRIPTS})</span>
                  <span style={{ fontSize: "10px", color: "#888" }}>
                    {showScriptList ? "▲" : "▼"}
                  </span>
                </button>

                {showScriptList && (
                  <div style={{ marginTop: "10px" }}>
                    <button
                      onClick={openAddScriptModal}
                      disabled={savedScripts.length >= MAX_SCRIPTS}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px dashed #555",
                        background: "transparent",
                        color: savedScripts.length >= MAX_SCRIPTS ? "#555" : "#4fc3f7",
                        cursor: savedScripts.length >= MAX_SCRIPTS ? "default" : "pointer",
                        fontSize: "13px",
                        fontWeight: "bold",
                        marginBottom: "10px",
                      }}
                    >
                      + Add Script
                    </button>

                    {savedScripts.length === 0 ? (
                      <div
                        style={{
                          color: "#666",
                          fontSize: "13px",
                          textAlign: "center",
                          padding: "20px 12px",
                          background: "#1a1a1a",
                          borderRadius: "8px",
                        }}
                      >
                        No saved scripts yet.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {savedScripts.map((script) => (
                          <div
                            key={script.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              background: "#1a1a1a",
                              borderRadius: "6px",
                              padding: "8px 10px",
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  color: "white",
                                  fontSize: "13px",
                                  fontWeight: "bold",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {script.name}
                              </div>
                              <div style={{ color: "#666", fontSize: "10px", marginTop: "1px" }}>
                                {(languagesList.find((l) => l.code === script.language) || {}).label || script.language || "—"}
                                {" · "}
                                {splitWords(script.text).words.length} words
                              </div>
                            </div>
                            <button
                              onClick={() => loadScript(script)}
                              style={{
                                padding: "5px 12px",
                                borderRadius: "5px",
                                border: "none",
                                background: "#1565c0",
                                color: "white",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "bold",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Load
                            </button>
                            <button
                              onClick={() => openEditScriptModal(script)}
                              style={{
                                padding: "5px 10px",
                                borderRadius: "5px",
                                border: "1px solid #666",
                                background: "transparent",
                                color: "#ccc",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => shareScript(script)}
                              disabled={shareBusyId === script.id}
                              title="Create a link to open this script on another device (expires in 30 days)"
                              style={{
                                padding: "5px 10px",
                                borderRadius: "5px",
                                border: "1px solid #2e7d32",
                                background: "transparent",
                                color: "#81c784",
                                cursor:
                                  shareBusyId === script.id
                                    ? "wait"
                                    : "pointer",
                                fontSize: "12px",
                              }}
                            >
                              {shareBusyId === script.id ? "…" : "Share"}
                            </button>
                            <button
                              onClick={() => setDeleteScriptConfirm(script)}
                              style={{
                                padding: "5px 8px",
                                borderRadius: "5px",
                                border: "1px solid #b71c1c",
                                background: "transparent",
                                color: "#ef5350",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ height: 8 }} />
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowResetConfirm(true)}
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
                <div
                  className="custom-slider"
                  onClick={(e) => {
                    if (e.target.classList.contains("custom-slider-thumb"))
                      return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    const newValue = Math.round(16 + percentage * (80 - 16));
                    setFontSize(Math.max(16, Math.min(80, newValue)));
                  }}
                >
                  <div className="custom-slider-track" />
                  <div
                    className="custom-slider-thumb"
                    style={{
                      left: `calc(${
                        ((fontSize - 16) / (80 - 16)) * 100
                      }% - 8px)`,
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startValue = fontSize;
                      const rect =
                        e.currentTarget.parentElement.getBoundingClientRect();
                      const maxValue = 80;
                      const minValue = 16;

                      const handleMouseMove = (moveEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaPercentage = deltaX / rect.width;
                        const deltaValue =
                          deltaPercentage * (maxValue - minValue);
                        const newValue = Math.round(startValue + deltaValue);
                        setFontSize(
                          Math.max(minValue, Math.min(maxValue, newValue))
                        );
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener(
                          "mousemove",
                          handleMouseMove
                        );
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  />
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
                  Side padding: {sidePaddingVw}vw
                </label>
                <div
                  className="custom-slider"
                  onClick={(e) => {
                    if (e.target.classList.contains("custom-slider-thumb"))
                      return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    const newValue = Math.round(0 + percentage * (40 - 0));
                    setSidePaddingVw(Math.max(0, Math.min(40, newValue)));
                  }}
                >
                  <div className="custom-slider-track" />
                  <div
                    className="custom-slider-thumb"
                    style={{
                      left: `calc(${
                        ((sidePaddingVw - 0) / (40 - 0)) * 100
                      }% - 8px)`,
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startValue = sidePaddingVw;
                      const rect =
                        e.currentTarget.parentElement.getBoundingClientRect();
                      const maxValue = 40;
                      const minValue = 0;

                      const handleMouseMove = (moveEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaPercentage = deltaX / rect.width;
                        const deltaValue =
                          deltaPercentage * (maxValue - minValue);
                        const newValue = Math.round(startValue + deltaValue);
                        setSidePaddingVw(
                          Math.max(minValue, Math.min(maxValue, newValue))
                        );
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener(
                          "mousemove",
                          handleMouseMove
                        );
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  />
                </div>
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
                <div
                  className="custom-slider"
                  onClick={(e) => {
                    if (e.target.classList.contains("custom-slider-thumb"))
                      return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    const newValue =
                      Math.round((1 + percentage * (3 - 1)) * 10) / 10;
                    setLineHeight(Math.max(1, Math.min(3, newValue)));
                  }}
                >
                  <div className="custom-slider-track" />
                  <div
                    className="custom-slider-thumb"
                    style={{
                      left: `calc(${
                        ((lineHeight - 1) / (3 - 1)) * 100
                      }% - 8px)`,
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startValue = lineHeight;
                      const rect =
                        e.currentTarget.parentElement.getBoundingClientRect();
                      const maxValue = 3;
                      const minValue = 1;

                      const handleMouseMove = (moveEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaPercentage = deltaX / rect.width;
                        const deltaValue =
                          deltaPercentage * (maxValue - minValue);
                        const newValue =
                          Math.round((startValue + deltaValue) * 10) / 10;
                        setLineHeight(
                          Math.max(minValue, Math.min(maxValue, newValue))
                        );
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener(
                          "mousemove",
                          handleMouseMove
                        );
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  />
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
                  Paragraph spacing: {paragraphSpacingPx}px
                </label>
                <div
                  className="custom-slider"
                  onClick={(e) => {
                    if (e.target.classList.contains("custom-slider-thumb"))
                      return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    const newValue = Math.round(0 + percentage * (40 - 0));
                    setParagraphSpacingPx(Math.max(0, Math.min(40, newValue)));
                  }}
                >
                  <div className="custom-slider-track" />
                  <div
                    className="custom-slider-thumb"
                    style={{
                      left: `calc(${
                        ((paragraphSpacingPx - 0) / (40 - 0)) * 100
                      }% - 8px)`,
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startValue = paragraphSpacingPx;
                      const rect =
                        e.currentTarget.parentElement.getBoundingClientRect();
                      const maxValue = 40;
                      const minValue = 0;

                      const handleMouseMove = (moveEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaPercentage = deltaX / rect.width;
                        const deltaValue =
                          deltaPercentage * (maxValue - minValue);
                        const newValue = Math.round(startValue + deltaValue);
                        setParagraphSpacingPx(
                          Math.max(minValue, Math.min(maxValue, newValue))
                        );
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener(
                          "mousemove",
                          handleMouseMove
                        );
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  />
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
                  Auto-scroll speed: {scrollSpeed}
                </label>
                <div
                  className="custom-slider"
                  onClick={(e) => {
                    if (e.target.classList.contains("custom-slider-thumb"))
                      return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    const newValue = Math.round(10 + percentage * (200 - 10));
                    setScrollSpeed(Math.max(10, Math.min(200, newValue)));
                  }}
                >
                  <div className="custom-slider-track" />
                  <div
                    className="custom-slider-thumb"
                    style={{
                      left: `calc(${
                        ((scrollSpeed - 10) / (200 - 10)) * 100
                      }% - 8px)`,
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startValue = scrollSpeed;
                      const rect =
                        e.currentTarget.parentElement.getBoundingClientRect();
                      const maxValue = 200;
                      const minValue = 10;

                      const handleMouseMove = (moveEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaPercentage = deltaX / rect.width;
                        const deltaValue =
                          deltaPercentage * (maxValue - minValue);
                        const newValue = Math.round(startValue + deltaValue);
                        setScrollSpeed(
                          Math.max(minValue, Math.min(maxValue, newValue))
                        );
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener(
                          "mousemove",
                          handleMouseMove
                        );
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  />
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
                  Lookahead window: {lookaheadWindow} words
                </label>
                <div
                  className="custom-slider"
                  onClick={(e) => {
                    if (e.target.classList.contains("custom-slider-thumb"))
                      return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    const newValue = Math.round(1 + percentage * (40 - 1));
                    setLookaheadWindow(Math.max(1, Math.min(40, newValue)));
                  }}
                >
                  <div className="custom-slider-track" />
                  <div
                    className="custom-slider-thumb"
                    style={{
                      left: `calc(${
                        ((lookaheadWindow - 1) / (40 - 1)) * 100
                      }% - 8px)`,
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startValue = lookaheadWindow;
                      const rect =
                        e.currentTarget.parentElement.getBoundingClientRect();
                      // Max raised 20 -> 40 (GitHub #2): lets tracking skip
                      // over a co-host's lines. Safe because far jumps still
                      // require a 2-3 word exact match (see tryAdvanceByTokens)
                      const maxValue = 40;
                      const minValue = 1;

                      const handleMouseMove = (moveEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaPercentage = deltaX / rect.width;
                        const deltaValue =
                          deltaPercentage * (maxValue - minValue);
                        const newValue = Math.round(startValue + deltaValue);
                        setLookaheadWindow(
                          Math.max(minValue, Math.min(maxValue, newValue))
                        );
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener(
                          "mousemove",
                          handleMouseMove
                        );
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  />
                </div>
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
                  Co-host lines: {skipCoHostLines ? "Skip" : "Off"}
                </label>
                <button
                  onClick={() => setSkipCoHostLines(!skipCoHostLines)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #555",
                    background: skipCoHostLines ? "#2e7d32" : "#37474f",
                    color: "white",
                    cursor: "pointer",
                  }}
                  aria-label="Toggle co-host line skipping"
                  title='Lines starting with ">>" or "@Name:" are dimmed and voice tracking jumps over them'
                >
                  {skipCoHostLines ? "Enabled" : "Enable"}
                </button>
                <div
                  style={{ color: "#aaa", fontSize: "12px", marginTop: "4px" }}
                >
                  Start a line with &gt;&gt; or @Name: to mark it as another
                  speaker's — it shows dimmed and voice tracking skips it
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
                <div
                  className="custom-slider"
                  onClick={(e) => {
                    if (e.target.classList.contains("custom-slider-thumb"))
                      return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    const newValue =
                      Math.round((0.2 + percentage * (1 - 0.2)) * 20) / 20;
                    setTextOpacity(Math.max(0.2, Math.min(1, newValue)));
                  }}
                >
                  <div className="custom-slider-track" />
                  <div
                    className="custom-slider-thumb"
                    style={{
                      left: `calc(${
                        ((textOpacity - 0.2) / (1 - 0.2)) * 100
                      }% - 8px)`,
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startValue = textOpacity;
                      const rect =
                        e.currentTarget.parentElement.getBoundingClientRect();
                      const maxValue = 1;
                      const minValue = 0.2;

                      const handleMouseMove = (moveEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaPercentage = deltaX / rect.width;
                        const deltaValue =
                          deltaPercentage * (maxValue - minValue);
                        const newValue =
                          Math.round((startValue + deltaValue) * 20) / 20;
                        setTextOpacity(
                          Math.max(minValue, Math.min(maxValue, newValue))
                        );
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener(
                          "mousemove",
                          handleMouseMove
                        );
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  />
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
                  Aim opacity: {Math.round(aimOpacity * 100)}%
                </label>
                <div
                  className="custom-slider"
                  onClick={(e) => {
                    if (e.target.classList.contains("custom-slider-thumb"))
                      return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    const newValue =
                      Math.round((0 + percentage * (1 - 0)) * 20) / 20;
                    setAimOpacity(Math.max(0, Math.min(1, newValue)));
                  }}
                >
                  <div className="custom-slider-track" />
                  <div
                    className="custom-slider-thumb"
                    style={{
                      left: `calc(${
                        ((aimOpacity - 0) / (1 - 0)) * 100
                      }% - 8px)`,
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startValue = aimOpacity;
                      const rect =
                        e.currentTarget.parentElement.getBoundingClientRect();
                      const maxValue = 1;
                      const minValue = 0;

                      const handleMouseMove = (moveEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaPercentage = deltaX / rect.width;
                        const deltaValue =
                          deltaPercentage * (maxValue - minValue);
                        const newValue =
                          Math.round((startValue + deltaValue) * 20) / 20;
                        setAimOpacity(
                          Math.max(minValue, Math.min(maxValue, newValue))
                        );
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener(
                          "mousemove",
                          handleMouseMove
                        );
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  />
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
                  Paragraph highlight opacity:{" "}
                  {Math.round(paragraphHighlightOpacity * 100)}%
                </label>
                <div
                  className="custom-slider"
                  onClick={(e) => {
                    if (e.target.classList.contains("custom-slider-thumb"))
                      return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    const newValue =
                      Math.round((0 + percentage * (0.6 - 0)) * 50) / 50;
                    setParagraphHighlightOpacity(
                      Math.max(0, Math.min(0.6, newValue))
                    );
                  }}
                >
                  <div className="custom-slider-track" />
                  <div
                    className="custom-slider-thumb"
                    style={{
                      left: `${
                        ((paragraphHighlightOpacity - 0) / (0.6 - 0)) * 100
                      }%`,
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startValue = paragraphHighlightOpacity;
                      const rect =
                        e.currentTarget.parentElement.getBoundingClientRect();
                      const maxValue = 0.6;
                      const minValue = 0;

                      const handleMouseMove = (moveEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaPercentage = deltaX / rect.width;
                        const deltaValue =
                          deltaPercentage * (maxValue - minValue);
                        const newValue =
                          Math.round((startValue + deltaValue) * 50) / 50;
                        setParagraphHighlightOpacity(
                          Math.max(minValue, Math.min(maxValue, newValue))
                        );
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener(
                          "mousemove",
                          handleMouseMove
                        );
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  />
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
                  Operation buttons opacity: {Math.round(uiOpacity * 100)}%
                </label>
                <div
                  className="custom-slider"
                  onClick={(e) => {
                    if (e.target.classList.contains("custom-slider-thumb"))
                      return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    const newValue =
                      Math.round((0.2 + percentage * (1 - 0.2)) * 20) / 20;
                    setUiOpacity(Math.max(0.2, Math.min(1, newValue)));
                  }}
                >
                  <div className="custom-slider-track" />
                  <div
                    className="custom-slider-thumb"
                    style={{
                      left: `calc(${
                        ((uiOpacity - 0.2) / (1 - 0.2)) * 100
                      }% - 8px)`,
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startValue = uiOpacity;
                      const rect =
                        e.currentTarget.parentElement.getBoundingClientRect();
                      const maxValue = 1;
                      const minValue = 0.2;

                      const handleMouseMove = (moveEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaPercentage = deltaX / rect.width;
                        const deltaValue =
                          deltaPercentage * (maxValue - minValue);
                        const newValue =
                          Math.round((startValue + deltaValue) * 20) / 20;
                        setUiOpacity(
                          Math.max(minValue, Math.min(maxValue, newValue))
                        );
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener(
                          "mousemove",
                          handleMouseMove
                        );
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  />
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
                  aria-label="Toggle Aim Indicator"
                >
                  {showAim ? "Disable" : "Enable"}
                </button>
                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        color: "white",
                        display: "block",
                        marginBottom: "8px",
                      }}
                    >
                      Marker style
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {[
                        ["crosshair", "Crosshair"],
                        ["dot", "Dot"],
                        ["frame", "Frame"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() => setAimStyle(value)}
                          aria-label={`Marker style: ${label}`}
                          aria-pressed={aimStyle === value}
                          style={{
                            flex: 1,
                            padding: "8px 4px",
                            borderRadius: "6px",
                            border:
                              aimStyle === value
                                ? "1px solid #90caf9"
                                : "1px solid #555",
                            background:
                              aimStyle === value ? "#1565c0" : "#37474f",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        color: "white",
                        display: "block",
                        marginBottom: "8px",
                      }}
                    >
                      Marker color
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {[
                        ["#ffeb3b", "Yellow"],
                        ["#2196f3", "Blue"],
                        ["#f44336", "Red"],
                        ["#4caf50", "Green"],
                        ["#ffffff", "White"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() => setAimColor(value)}
                          title={label}
                          aria-label={`Marker color: ${label}`}
                          aria-pressed={aimColor === value}
                          style={{
                            flex: 1,
                            height: "34px",
                            borderRadius: "6px",
                            border:
                              aimColor === value
                                ? "2px solid white"
                                : "1px solid #555",
                            background: value,
                            cursor: "pointer",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
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
                    <div
                      className="custom-slider"
                      onClick={(e) => {
                        if (e.target.classList.contains("custom-slider-thumb"))
                          return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percentage = x / rect.width;
                        const newValue = Math.round(
                          -400 + percentage * (400 - -400)
                        );
                        setAimOffsetX(Math.max(-400, Math.min(400, newValue)));
                      }}
                    >
                      <div className="custom-slider-track" />
                      <div
                        className="custom-slider-thumb"
                        style={{
                          left: `calc(${
                            ((aimOffsetX - -400) / (400 - -400)) * 100
                          }% - 8px)`,
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startValue = aimOffsetX;
                          const rect =
                            e.currentTarget.parentElement.getBoundingClientRect();
                          const maxValue = 400;
                          const minValue = -400;

                          const handleMouseMove = (moveEvent) => {
                            const deltaX = moveEvent.clientX - startX;
                            const deltaPercentage = deltaX / rect.width;
                            const deltaValue =
                              deltaPercentage * (maxValue - minValue);
                            const newValue = Math.round(
                              startValue + deltaValue
                            );
                            setAimOffsetX(
                              Math.max(minValue, Math.min(maxValue, newValue))
                            );
                          };

                          const handleMouseUp = () => {
                            document.removeEventListener(
                              "mousemove",
                              handleMouseMove
                            );
                            document.removeEventListener(
                              "mouseup",
                              handleMouseUp
                            );
                          };

                          document.addEventListener(
                            "mousemove",
                            handleMouseMove
                          );
                          document.addEventListener("mouseup", handleMouseUp);
                        }}
                      />
                    </div>
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
                    <div
                      className="custom-slider"
                      onClick={(e) => {
                        if (e.target.classList.contains("custom-slider-thumb"))
                          return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percentage = x / rect.width;
                        const newValue = Math.round(
                          -300 + percentage * (300 - -300)
                        );
                        setAimOffsetY(Math.max(-300, Math.min(300, newValue)));
                      }}
                    >
                      <div className="custom-slider-track" />
                      <div
                        className="custom-slider-thumb"
                        style={{
                          left: `calc(${
                            ((aimOffsetY - -300) / (300 - -300)) * 100
                          }% - 8px)`,
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startValue = aimOffsetY;
                          const rect =
                            e.currentTarget.parentElement.getBoundingClientRect();
                          const maxValue = 300;
                          const minValue = -300;

                          const handleMouseMove = (moveEvent) => {
                            const deltaX = moveEvent.clientX - startX;
                            const deltaPercentage = deltaX / rect.width;
                            const deltaValue =
                              deltaPercentage * (maxValue - minValue);
                            const newValue = Math.round(
                              startValue + deltaValue
                            );
                            setAimOffsetY(
                              Math.max(minValue, Math.min(maxValue, newValue))
                            );
                          };

                          const handleMouseUp = () => {
                            document.removeEventListener(
                              "mousemove",
                              handleMouseMove
                            );
                            document.removeEventListener(
                              "mouseup",
                              handleMouseUp
                            );
                          };

                          document.addEventListener(
                            "mousemove",
                            handleMouseMove
                          );
                          document.addEventListener("mouseup", handleMouseUp);
                        }}
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAimOffsetX(0);
                    setAimOffsetY(0);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #555",
                    background: "#37474f",
                    color: "white",
                    cursor: "pointer",
                    marginTop: "10px",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                  title="Reset aim indicator to center"
                >
                  Reset to Center
                </button>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "white",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  "Listening" indicator:{" "}
                  {showListeningIndicator ? "Visible" : "Hidden"}
                </label>
                <button
                  onClick={() =>
                    setShowListeningIndicator(!showListeningIndicator)
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #555",
                    background: showListeningIndicator ? "#2e7d32" : "#37474f",
                    color: "white",
                    cursor: "pointer",
                  }}
                  aria-label="Toggle Listening Indicator"
                  title="Hide the red 'Listening...' pill while recording — the mic button still shows red when active"
                >
                  {showListeningIndicator ? "Hide while recording" : "Show"}
                </button>
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
                <div
                  className="custom-slider"
                  onClick={(e) => {
                    if (e.target.classList.contains("custom-slider-thumb"))
                      return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    const newValue = Math.round(20 + percentage * (60 - 20));
                    setCenterPaddingVh(Math.max(20, Math.min(60, newValue)));
                  }}
                  onMouseDown={() => setShowCenterLine(true)}
                  onMouseUp={() => setShowCenterLine(false)}
                >
                  <div className="custom-slider-track" />
                  <div
                    className="custom-slider-thumb"
                    style={{
                      left: `calc(${
                        ((centerPaddingVh - 20) / (60 - 20)) * 100
                      }% - 8px)`,
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowCenterLine(true);
                      const startX = e.clientX;
                      const startValue = centerPaddingVh;
                      const rect =
                        e.currentTarget.parentElement.getBoundingClientRect();
                      const maxValue = 60;
                      const minValue = 20;

                      const handleMouseMove = (moveEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaPercentage = deltaX / rect.width;
                        const deltaValue =
                          deltaPercentage * (maxValue - minValue);
                        const newValue = Math.round(startValue + deltaValue);
                        setCenterPaddingVh(
                          Math.max(minValue, Math.min(maxValue, newValue))
                        );
                      };

                      const handleMouseUp = () => {
                        setShowCenterLine(false);
                        document.removeEventListener(
                          "mousemove",
                          handleMouseMove
                        );
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  />
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
              stroke={aimColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: aimOpacity }}
            >
              {aimStyle === "dot" ? (
                <circle cx="12" cy="12" r="4" fill={aimColor} stroke="none" />
              ) : aimStyle === "frame" ? (
                <>
                  <path d="M3 8V3h5" />
                  <path d="M16 3h5v5" />
                  <path d="M21 16v5h-5" />
                  <path d="M8 21H3v-5" />
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="2" />
                  <path d="M12 1v4" />
                  <path d="M12 19v4" />
                  <path d="M1 12h4" />
                  <path d="M19 12h4" />
                </>
              )}
            </svg>
          </div>
        )}
        <div
          style={{
            maxWidth: "100%",
            margin: "0 auto",
            textAlign: textAlignStyle,
            transform: `${mirrorX ? "scaleX(-1)" : "scaleX(1)"} `,
          }}
        >
          {linesWords.map((lineWordsLocal, lineIdx) => {
            const lineStart = lineStartIndex[lineIdx] || 0;
            const lineEnd = lineStart + lineWordsLocal.length - 1;
            const activeIndex =
              currentWordIndex >= lineStart && currentWordIndex <= lineEnd
                ? currentWordIndex
                : -1;
            return (
              <TeleprompterLine
                key={lineIdx}
                words={lineWordsLocal}
                glue={linesGlue[lineIdx]}
                lineIdx={lineIdx}
                lineStart={lineStart}
                activeIndex={activeIndex}
                isCoHost={!!(skipCoHostLines && lineIsCoHost[lineIdx])}
                showHighlight={showHighlight}
                highlightColor={highlightColor}
                textColor={textColor}
                paragraphSpacingPx={paragraphSpacingPx}
                paragraphHighlightOpacity={paragraphHighlightOpacity}
                onWordClick={setCurrentWordIndex}
              />
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

      {/* Status Indicator (hideable in settings — can distract on camera) */}
      {isListening && showListeningIndicator && (
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
              background: "#D1AA17",
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

      {/* Delete Script Confirmation Modal */}
      {deleteScriptConfirm && (
        <div
          onClick={() => setDeleteScriptConfirm(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 21000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#111",
              border: "2px solid rgba(255,255,255,0.15)",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "400px",
              width: "calc(100vw - 40px)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🗑️</div>
            <h2
              style={{
                color: "white",
                margin: "0 0 12px",
                fontSize: "20px",
              }}
            >
              Delete Script?
            </h2>
            <p
              style={{
                color: "#aaa",
                fontSize: "14px",
                lineHeight: "1.5",
                margin: "0 0 8px",
              }}
            >
              Are you sure you want to delete
            </p>
            <p
              style={{
                color: "white",
                fontSize: "15px",
                fontWeight: "bold",
                margin: "0 0 24px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              "{deleteScriptConfirm.name}"
            </p>
            <div
              style={{ display: "flex", gap: "12px", justifyContent: "center" }}
            >
              <button
                onClick={() => setDeleteScriptConfirm(null)}
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  border: "1px solid #555",
                  background: "#333",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteScript}
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#b71c1c",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Script Modal */}
      {showAddScript && (
        <div
          onClick={() => setShowAddScript(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 20000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#111",
              border: "2px solid rgba(255,255,255,0.15)",
              borderRadius: "16px",
              padding: "28px",
              maxWidth: "540px",
              width: "calc(100vw - 40px)",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ color: "white", margin: 0, fontSize: "18px" }}>
                {editScriptId ? "Edit Script" : "Add Script"}
              </h2>
              <button
                onClick={() => setShowAddScript(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#999",
                  fontSize: "24px",
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                ×
              </button>
            </div>

            <label
              style={{
                color: "#aaa",
                fontSize: "12px",
                marginBottom: "4px",
              }}
            >
              Script name
            </label>
            <input
              type="text"
              value={addScriptName}
              onChange={(e) => setAddScriptName(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="e.g. Episode 1 intro..."
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: `1px solid ${scriptFormTouched && !addScriptName.trim() ? "#b71c1c" : "#444"}`,
                background: "#1a1a1a",
                color: "white",
                fontSize: "14px",
                outline: "none",
                marginBottom: scriptFormTouched && !addScriptName.trim() ? "4px" : "12px",
              }}
            />
            {scriptFormTouched && !addScriptName.trim() && (
              <div style={{ color: "#ef5350", fontSize: "12px", marginBottom: "8px" }}>
                Please enter a script name.
              </div>
            )}

            <label
              style={{
                color: "#aaa",
                fontSize: "12px",
                marginBottom: "4px",
              }}
            >
              Language
            </label>
            <select
              value={addScriptLanguage}
              onChange={(e) => setAddScriptLanguage(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #444",
                background: "#1a1a1a",
                color: "white",
                fontSize: "14px",
                outline: "none",
                marginBottom: "12px",
                cursor: "pointer",
              }}
            >
              {languagesList.map((lng) => (
                <option key={lng.code} value={lng.code}>
                  {lng.label}
                </option>
              ))}
            </select>

            <label
              style={{
                color: "#aaa",
                fontSize: "12px",
                marginBottom: "4px",
              }}
            >
              Script text
            </label>
            <textarea
              value={addScriptText}
              onChange={(e) => setAddScriptText(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Paste or type your script here..."
              style={{
                flex: 1,
                minHeight: "200px",
                padding: "12px 14px",
                borderRadius: "8px",
                border: `1px solid ${scriptFormTouched && !addScriptText.trim() ? "#b71c1c" : "#444"}`,
                background: "#1a1a1a",
                color: "white",
                fontSize: "14px",
                fontFamily: "inherit",
                outline: "none",
                resize: "vertical",
                marginBottom: scriptFormTouched && !addScriptText.trim() ? "4px" : "16px",
              }}
            />
            {scriptFormTouched && !addScriptText.trim() && (
              <div style={{ color: "#ef5350", fontSize: "12px", marginBottom: "12px" }}>
                Please enter the script text.
              </div>
            )}
            <div
              style={{
                color: "#888",
                fontSize: "12px",
                marginTop: "-8px",
                marginBottom: "12px",
                lineHeight: 1.5,
              }}
            >
              💡 Recording with a co-host? Start their lines with{" "}
              <code style={{ color: "#ffd54f" }}>&gt;&gt;</code> or{" "}
              <code style={{ color: "#ffd54f" }}>@Name:</code> — they'll appear
              dimmed and voice tracking will skip to your next line
              automatically.
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowAddScript(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "1px solid #555",
                  background: "#333",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => saveScript(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#2e7d32",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                Save
              </button>
              <button
                onClick={() => saveScript(true)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#1565c0",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                Save & Load
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div
          onClick={() => setShowResetConfirm(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 20000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#111",
              border: "2px solid rgba(255,255,255,0.15)",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "400px",
              width: "calc(100vw - 40px)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
            <h2
              style={{
                color: "white",
                margin: "0 0 12px",
                fontSize: "20px",
              }}
            >
              Reset All Settings?
            </h2>
            <p
              style={{
                color: "#aaa",
                fontSize: "14px",
                lineHeight: "1.5",
                margin: "0 0 24px",
              }}
            >
              This will restore all settings to their defaults: font size,
              colors, speed, language, and layout. Your script text will not be
              affected.
            </p>
            <div
              style={{ display: "flex", gap: "12px", justifyContent: "center" }}
            >
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  border: "1px solid #555",
                  background: "#333",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetSettingsToDefault();
                  setShowResetConfirm(false);
                }}
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#b71c1c",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div
          onClick={() => setShowShortcuts(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 20000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#111",
              border: "2px solid rgba(255,255,255,0.15)",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "480px",
              width: "calc(100vw - 40px)",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ color: "white", margin: 0, fontSize: "20px" }}>
                ⌨️ Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowShortcuts(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#999",
                  fontSize: "24px",
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                ×
              </button>
            </div>
            {[
              ["V", "Start / Stop microphone"],
              ["P", "Play / Pause auto-scroll"],
              ["H", "Toggle word highlighting"],
              ["R", "Reset to beginning"],
              ["L", "Language selection"],
              ["E", "Settings menu"],
              ["S", "Script editor"],
              ["B", "My Scripts (in editor)"],
              ["F", "Fullscreen mode"],
              ["M", "Mirror text horizontally"],
              ["?", "Show this panel"],
            ].map(([key, desc]) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  background: "#1a1a1a",
                  borderRadius: "8px",
                  marginBottom: "6px",
                }}
              >
                <span style={{ color: "#ccc", fontSize: "14px" }}>{desc}</span>
                <kbd
                  style={{
                    background: "#333",
                    color: "white",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    border: "1px solid #555",
                    minWidth: "28px",
                    textAlign: "center",
                  }}
                >
                  {key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      )}

    </main>
  );
}
