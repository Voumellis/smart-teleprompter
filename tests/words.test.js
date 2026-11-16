import { describe, it, expect } from "vitest";
import { splitWords, normalizeWord } from "../src/words";

const norm = (text) => splitWords(text).words.map(normalizeWord).filter(Boolean);

describe("normalizeWord", () => {
  it("keeps Latin-script words and strips accents/punctuation", () => {
    expect(normalizeWord("Selamat,")).toBe("selamat");
    expect(normalizeWord("Café!")).toBe("cafe");
    expect(normalizeWord("Łódź")).toBe("łodz");
  });

  it("keeps Greek and folds final sigma", () => {
    expect(normalizeWord("Κόσμος.")).toBe("κοσμοσ");
  });

  // Regression: the old /[^a-zA-Zα-ω0-9]/ filter turned all of these into ""
  it.each([
    ["Привет,", "привет"],
    ["안녕하세요", "안녕하세요"],
    ["مرحبا،", "مرحبا"],
    ["नमस्ते।", "नमस्ते"],
    ["世界。", "世界"],
    ["テスト", "テスト"],
  ])("does not erase non-Latin word %s", (input, expected) => {
    expect(normalizeWord(input)).toBe(expected);
  });

  it("drops Arabic short vowels so vocalised scripts match plain transcripts", () => {
    expect(normalizeWord("مَرْحَبًا")).toBe(normalizeWord("مرحبا"));
  });

  it("treats ё and е as the same letter", () => {
    expect(normalizeWord("ёлка")).toBe(normalizeWord("елка"));
  });
});

describe("splitWords", () => {
  it("splits spaced languages on whitespace with no glue", () => {
    expect(splitWords("Selamat pagi,  semua!")).toEqual({
      words: ["Selamat", "pagi,", "semua!"],
      glue: [false, false, false],
    });
  });

  it("segments Japanese and attaches punctuation to the previous word", () => {
    const { words, glue } = splitWords("こんにちは、世界。");
    expect(words).toEqual(["こんにちは、", "世界。"]);
    expect(glue).toEqual([true, false]);
  });

  it("attaches leading punctuation to the next word", () => {
    expect(splitWords("「テスト」です").words).toEqual(["「テスト」", "です"]);
  });

  it("produces the same tokens for a script line and an unspaced transcript", () => {
    expect(norm("今天天气很好。")).toEqual(norm("今天天气很好"));
    expect(norm("今天天气很好").length).toBeGreaterThan(1);
  });

  it("returns nothing for blank input", () => {
    expect(splitWords("   ")).toEqual({ words: [], glue: [] });
    expect(splitWords(undefined)).toEqual({ words: [], glue: [] });
  });
});
