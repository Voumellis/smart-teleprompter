# Changelog

All notable changes to Smart Teleprompter will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2026-11-16

### Added

- 🇮🇩 **Indonesian** (`id-ID`) voice tracking — community request
- 🇳🇴🇩🇰🇫🇮 **Norwegian, Danish and Finnish** in the language selector — they were already listed on the landing page and in the README but missing from the app

### Fixed

- 🌍 **Voice tracking in non-Latin languages**: word normalization only kept `a-z`, Greek letters and digits, so every Russian, Arabic, Hindi, Korean, Chinese and Japanese word was reduced to an empty string and the script never advanced. Normalization is now Unicode-aware (letters and digits of any script; accents, Arabic short vowels and punctuation still stripped)
- 🈶 **Chinese & Japanese word splitting**: scripts and Chrome transcripts in these languages have no spaces, so a whole sentence counted as one word. Unspaced runs (Han, Kana, Thai) are now split with `Intl.Segmenter` on both sides; they still render without spaces
- 🔢 **Word count** in the script library now counts Chinese/Japanese words correctly

## [2.2.0] - 2026-07-02

### Added

- 🎭 **Co-Host Mode**: Start a line with `>>` or `@Name:` to mark it as another speaker's — it renders dimmed and voice tracking skips over it to your next line regardless of its length. Toggleable in Settings (GitHub #2)
- 🎯 **Aim Marker Styles**: Choose crosshair, dot, or camera-frame marker in 5 colors (yellow, blue, red, green, white) — community request from r/elgato
- 🔴 **Hideable "Listening" Indicator**: New setting hides the red pill during recording for a clean on-camera view — community request from r/elgato
- 🏠 **Landing Page**: New feature cards for Share via Link and Offline/Installable, plus an install-as-app tip

### Changed

- ⚡ **Snappier Word Highlight**: Highlight transition reduced 0.2s → 0.1s after feedback that word marking felt sluggish
- 🔭 **Wider Lookahead Range**: Lookahead window slider max raised from 20 to 40 words so voice tracking can skip over a co-host's lines in shared scripts (GitHub #2)

### Fixed

- 🐛 **Tooltip Position**: Toolbar tooltips drifted toward mid-screen once the script had scrolled (visible in the installed PWA) — fixed-position tooltips were offset by `window.scrollY`
- 📱 **Tooltips on Touch Devices**: No longer shown — they only appeared after the tap had already fired and referenced keyboard shortcuts that don't exist on mobile
- ↔️ **Tooltip Clipping**: Tooltips near the screen edge (e.g. leftmost toolbar buttons) now shift to stay fully visible
- 📱 **Toolbar Overflow Hints**: On narrow screens, tappable arrow buttons with edge fades now show when more toolbar icons are hidden off-screen — previously nothing indicated the toolbar scrolls horizontally

## [2.1.0] - 2026-07-02

### Added

- 🔗 **Share Scripts via Link**: New Share button in the script library creates a link (`?share=<id>`) that opens the script on any device. Backed by a Cloudflare Pages Function + KV (free tier); shares auto-expire after 30 days
- 📴 **Offline Support / Installable PWA**: New service worker caches the app shell and hashed assets — auto-scroll mode now works fully offline (ideal for iPhone/iPad where it is the only mode), and the app can be installed from the browser
- ⚙️ **CI Pipeline**: GitHub Actions workflow runs tests and a production build on every push/PR

### Changed

- 🖼️ **Icons Inlined**: Toolbar icons are now inline SVG instead of being fetched from unpkg.com — zero external requests, instant rendering, works offline
- ⚡ **Rendering Performance**: Script lines are memoized; a speech-recognition result now re-renders only the affected lines instead of every word span (large scripts stay smooth)
- 💾 **Settings Persistence**: Debounced (400ms) — no more full-settings serialization on every keystroke
- 📊 **Analytics**: Replaced Google Analytics with cookieless Cloudflare Web Analytics; landing-page privacy text updated accordingly
- 🔒 **CSP Tightened**: Removed unpkg.com, googletagmanager.com, and google-analytics.com from the Content-Security-Policy

### Fixed

- 🐛 **Settings Not Saving**: `language` and `mirrorX` were missing from the persistence dependency list — changing only them was never saved
- 🌐 **Greek Alert in English UI**: "Speech recognition not supported" message is now in English and suggests auto-scroll mode
- 🧹 **Dead Code Removed**: Non-functional `renderMarkdown` state (including a call that could crash file import) and the obsolete Apache `.htaccess`
- 🏷️ **Version Mismatch**: package.json, README badge, and JSON-LD `softwareVersion` now report the real version

## [2.0.1] - 2026-03-30

### Fixed

- 🔧 **Public Assets Deployed**: Fixed `.gitignore` excluding `public/` directory — favicons, robots.txt, sitemap.xml, manifest, `_headers`, and OG image were never being deployed
- 🖼️ **Social Share Image**: Fixed `og:image` and `twitter:image` URLs pointing to non-existent GitHub raw path
- ♿ **Accessibility**: Added `<main>` landmark to landing page and app
- ♿ **Contrast**: Improved Edit button contrast in script library
- 🔒 **Security Headers**: Added `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`, and `Content-Security-Policy` headers
- 🐛 **Broken HTML**: Fixed mismatched `<h2>...</p>` tag in landing page footer
- 🔁 **Redirect Loop**: Removed `_redirects` rewrite rule that conflicted with Cloudflare Pages' built-in pretty URLs

## [2.0.0] - 2026-03-30

### Added

- 📚 **Script Library**: Save, edit, load, and delete up to 50 scripts with per-script language
- ⌨️ **Keyboard Shortcuts Modal**: Press `?` to view all shortcuts
- 🔑 **New Shortcut `B`**: Open My Scripts panel from the editor
- ✅ **Delete Confirmation Modal**: Prevents accidental script deletion
- ✅ **Reset Settings Confirmation Modal**: Prevents accidental settings reset
- 🧪 **Test Suite**: 9 Vitest tests covering app rendering, settings persistence, and script library
- 📦 **Vite 6 Build Pipeline**: Replaced CDN/Babel with proper build tooling
- 🎨 **Tailwind CSS 4**: Installed via `@tailwindcss/vite` plugin (CSS-first config)
- 📄 **Structured Data**: JSON-LD `SoftwareApplication` schema for rich search results
- 🔍 **SEO Improvements**: Optimized meta tags, keywords, OG/Twitter descriptions
- 📊 **Google Analytics**: Tracking integration
- 🛠️ **Node Version Files**: `.nvmrc` and `.node-version` (Node 22)

### Changed

- 🌐 **Default Language**: Set to English (en-US) instead of browser locale
- 🏗️ **Build System**: Migrated from CDN scripts to Vite + React 19 + Tailwind CSS 4
- 📁 **Static Assets**: Moved to `public/` directory
- 🔗 **All URLs**: Corrected to `smarttelepromter.com`
- 📖 **README**: Full rewrite with features, shortcuts, compatibility, project structure
- 🌐 **Landing Page**: Added Script Library feature card, keyboard shortcuts, SEO footer text
- ⚡ **Bundle Size**: Reduced from ~2.5MB (Babel standalone) to ~73KB gzipped

### Fixed

- 🐛 **Auto-scroll Tooltip Bug**: Icon/IconButton components moved outside render to prevent unmount/remount on re-render
- 🔗 **Broken URLs**: Fixed repository URL typos across all files
- 📋 **Sitemap**: Corrected URLs and updated lastmod date

### Removed

- 📄 **PDF.js**: Removed PDF import (was lazy-loaded, unnecessary)
- 📝 **Marked + DOMPurify**: Removed Markdown rendering dependencies
- 🔧 **Babel Standalone**: Replaced by Vite build
- 🧶 **Yarn Artifacts**: Cleaned up accidental yarn files

### Migration

- Existing script text in `tp_settings_v1` is automatically migrated to the script library on first load

## [1.0.0] - 2025-10-05

### Added

- 🎤 **Voice Recognition**: Real-time speech tracking with 20+ language support
- 🎯 **Auto-scrolling**: Automatic text scrolling that follows your voice
- ✨ **Word Highlighting**: Visual feedback as you speak each word
- 🎨 **Customization**: Font size, colors, spacing, and alignment controls
- 📱 **Responsive Design**: Works on mobile, tablet, and desktop
- 🌍 **Multi-language Support**: 20+ languages
- ⌨️ **Keyboard Shortcuts**: Quick access to all features (V, P, H, R, L, E, S, F, M)
- 📝 **Script Editor**: Built-in text editor with copy/clear functions
- 🔧 **Settings Panel**: Comprehensive configuration options
- 💾 **Settings Persistence**: localStorage integration for user preferences
- 🖥️ **Fullscreen Mode**: Professional presentation mode
- 🪞 **Mirror Mode**: Horizontal text mirroring for camera setups
- 🎯 **Aim Indicator**: Visual reading line indicator with offset controls
- ☕ **Support Integration**: Buy Me a Coffee button

---

## Version History

- **2.0.1** (2026-03-30): Lighthouse fixes, deploy public assets, security headers
- **2.0.0** (2026-03-30): Vite migration, script library, SEO improvements
- **1.0.0** (2025-10-05): Initial release with core functionality
