import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, within, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import SmartTeleprompter from "../src/App";

// Recognizer mock that remembers its instances so the test can feed it
// transcripts the way Chrome does.
const WAIT = { timeout: 3000 }; // generous for slow CI runners
const instances = [];
class RecognizerMock {
  constructor() {
    instances.push(this);
    this.onresult = null;
  }
  start() {
    setTimeout(() => this.onstart && this.onstart(), 0);
  }
  stop() {}
  abort() {}
}

// [case, script, what Chrome transcribes, word that must be highlighted]
const cases = [
  ["English", "Hello there my good friends", "hello there", "there"],
  ["Indonesian", "Selamat pagi semuanya, apa kabar", "selamat pagi", "pagi"],
  ["Russian", "Привет, дорогие друзья мои", "привет дорогие", "дорогие"],
  ["Korean", "안녕하세요 여러분 반갑습니다", "안녕하세요 여러분", "여러분"],
  ["Arabic", "مرحبا بكم جميعا في البرنامج", "مرحبا بكم", "بكم"],
  ["Hindi", "नमस्ते दोस्तों आज हम शुरू करते हैं", "नमस्ते दोस्तों", "दोस्तों"],
  // Chrome returns Chinese/Japanese without spaces
  ["Japanese", "今日はいい天気ですね。\n二行目です", "今日はいい", "いい"],
  ["Chinese", "今天天气很好。我们开始吧", "今天天气", "天气"],
];

describe("voice tracking advances in every supported script", () => {
  beforeEach(() => {
    localStorage.clear();
    instances.length = 0;
    window.SpeechRecognition = RecognizerMock;
    window.webkitSpeechRecognition = RecognizerMock;
  });
  afterEach(() => cleanup());

  it.each(cases)("%s", async (_name, text, spoken, expectedWord) => {
    localStorage.setItem("tp_settings_v1", JSON.stringify({ text }));
    const { container } = render(<SmartTeleprompter />);
    await waitFor(() => expect(container.textContent).toContain(text.slice(0, 3)));

    fireEvent.click(within(container).getAllByLabelText("Microphone")[0]);
    await waitFor(() => expect(instances.some((r) => r.onresult)).toBe(true), WAIT);
    const rec = [...instances].reverse().find((r) => r.onresult);

    const result = [{ transcript: spoken }];
    result.isFinal = true;
    await act(async () => {
      rec.onresult({ results: [result], resultIndex: 0 });
    });

    await waitFor(() => {
      const highlighted = [...container.querySelectorAll('[id^="word-"]')].find(
        (el) => el.style.backgroundColor && el.style.backgroundColor !== "transparent"
      );
      expect(highlighted && highlighted.textContent.trim()).toBe(expectedWord);
    }, WAIT);
  });

  it("renders Chinese/Japanese segments without inserted spaces", async () => {
    localStorage.setItem("tp_settings_v1", JSON.stringify({ text: "今日はいい天気ですね。" }));
    const { container } = render(<SmartTeleprompter />);
    await waitFor(() => expect(container.querySelector("#line-0")).not.toBeNull());
    expect(container.querySelector("#line-0").textContent.trim()).toBe("今日はいい天気ですね。");
    expect(container.querySelectorAll('#line-0 [id^="word-"]').length).toBeGreaterThan(1);
  });
});
