// Word splitting + normalization shared by the script renderer and the
// speech-recognition matcher. Both sides MUST go through the same functions,
// otherwise a spoken word can never equal its script word.

// Scripts written without spaces between words. Splitting on whitespace
// alone turns a whole Chinese/Japanese sentence into a single "word", which
// voice tracking can never match — runs containing these scripts are split
// with Intl.Segmenter instead.
const NO_SPACE_SCRIPT_RE =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;

let wordSegmenter = null;
function getWordSegmenter() {
  if (wordSegmenter === null) {
    try {
      wordSegmenter =
        typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
          ? new Intl.Segmenter(undefined, { granularity: "word" })
          : false;
    } catch (_) {
      wordSegmenter = false;
    }
  }
  return wordSegmenter;
}

/**
 * Split text into display words.
 * `glue[i]` is true when word i is rendered directly against the next word
 * with no space (the pieces of an unspaced CJK/Thai run). Punctuation
 * segments (、。「」，！) are attached to a neighbouring word, never counted
 * as words of their own.
 */
export function splitWords(text) {
  const words = [];
  const glue = [];
  for (const chunk of String(text || "").split(/\s+/)) {
    if (!chunk) continue;
    const seg = NO_SPACE_SCRIPT_RE.test(chunk) && getWordSegmenter();
    if (!seg) {
      words.push(chunk);
      glue.push(false);
      continue;
    }
    const parts = [];
    let leading = ""; // punctuation before the first word-like segment
    for (const { segment, isWordLike } of seg.segment(chunk)) {
      if (isWordLike) {
        parts.push(leading + segment);
        leading = "";
      } else if (parts.length) {
        parts[parts.length - 1] += segment;
      } else {
        leading += segment;
      }
    }
    if (leading) parts.push(leading); // chunk had no word-like segment at all
    for (let k = 0; k < parts.length; k++) {
      words.push(parts[k]);
      glue.push(k < parts.length - 1);
    }
  }
  return { words, glue };
}

/**
 * Normalize a word for matching: lowercase, strip accents/diacritics and
 * punctuation, keep letters and digits of ANY script.
 * The previous version kept only /[a-zA-Zα-ω0-9]/, which reduced every
 * Cyrillic, Arabic, Devanagari, Hangul and CJK word to "" — so voice
 * tracking silently did nothing in Russian, Arabic, Hindi, Korean, Chinese
 * and Japanese.
 */
export function normalizeWord(input) {
  if (!input) return "";
  return (
    String(input)
      .toLowerCase()
      .normalize("NFD")
      // Latin/Greek accents (é→e, ά→α, ё→е) plus Arabic short vowels and
      // tatweel — scripts often contain them, transcripts usually don't
      .replace(/[̀-ًͯ-ٰٟـ]/g, "")
      .replace(/ς/g, "σ")
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, "")
      // recompose what's left (Hangul syllables, kana voicing marks) so
      // token lengths stay meaningful for the soft-match thresholds
      .normalize("NFC")
      .trim()
  );
}
