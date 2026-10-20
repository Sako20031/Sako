// Optional dictation via the Web Speech API. The transcript is always returned for the
// clinician to review; it is never inserted automatically. The microphone stops as soon as
// a result arrives, on error, or when the caller aborts.
const Recognition: any = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;

export const voiceSupported = () => !!Recognition;
const LOCALES = { ru: "ru-RU", kk: "kk-KZ", en: "en-US" } as const;

// Fields where silent errors are dangerous: numbers, units, times, doses.
export const RISKY = /\d|мг|mg|мл|ml|ммоль|mmol|ед|units?|час|hour|мин|min|аллерг|allerg/i;

export function listen(lang: keyof typeof LOCALES, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const rec = new Recognition();
    rec.lang = LOCALES[lang];
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => resolve(Array.from(e.results).map((r: any) => r[0].transcript).join(" "));
    rec.onerror = (e: any) => reject(new Error(e.error || "speech_error"));
    rec.onend = () => resolve("");
    signal.addEventListener("abort", () => rec.abort(), { once: true });
    rec.start();
  });
}
