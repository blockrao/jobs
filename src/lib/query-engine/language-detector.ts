/**
 * Language Detection & Normalization for Query Engine
 *
 * Detects: English, Hindi, Hinglish (code-mixed)
 * Uses: fasttext model via API (fallback regex patterns)
 * Output: language + confidence + normalized text
 */

interface LanguageDetection {
  detected: "english" | "hindi" | "hinglish";
  confidence: number;
  originalText: string;
  normalizedText: string;
}

// Hinglish phonetic patterns: Common romanized Hindi words
const HINGLISH_PATTERNS = {
  // Common Hinglish question starts
  "\\bmujhe\\b": "mujhe",
  "\\baap\\b": "aap",
  "\\bkya\\b": "kya",
  "\\bkis\\b": "kis",
  "\\bkaun\\b": "kaun",

  // Common Hinglish exam/job terms (already English-ish)
  "\\bexam\\b|\\bpariksha\\b": "exam",
  "\\bjob\\b|\\bnaukri\\b": "job",
  "\\bsalary\\b|\\btenthha\\b": "salary",

  // Common Hinglish suffixes
  "\\bhai\\b": "hain",
  "\\bho\\b": "hain",
  "\\bkare\\b": "karein",
};

// Hindi Unicode ranges
const DEVANAGARI_REGEX = /[ऀ-ॿ]/g;
const LATIN_REGEX = /[a-zA-Z0-9]/g;

/**
 * Detect if text contains Hindi/Devanagari characters
 */
export function hasDevanagari(text: string): boolean {
  return DEVANAGARI_REGEX.test(text);
}

/**
 * Detect if text is code-mixed (both Latin and Devanagari)
 */
export function isCodeMixed(text: string): boolean {
  const hasLatin = LATIN_REGEX.test(text);
  const hasDevanagari = DEVANAGARI_REGEX.test(text);
  return hasLatin && hasDevanagari;
}

/**
 * Phonetic normalization for Hinglish
 * Standardizes common Hinglish phonetic variations
 */
export function normalizeHinglishPhonetics(text: string): string {
  let normalized = text.toLowerCase();

  // Apply phonetic replacements
  normalized = normalized.replace(/hai(?!\w)/g, "hain"); // "hai" → "hain"
  normalized = normalized.replace(/ho(?!\w)/g, "hain"); // "ho" → "hain"
  normalized = normalized.replace(/kro(?!\w)/g, "karo"); // "kro" → "karo"
  normalized = normalized.replace(/kar(?!o)\b/g, "karo"); // "kar" → "karo"

  return normalized;
}

/**
 * Main language detection function
 * Returns detected language + confidence score
 */
export function detectLanguage(text: string): LanguageDetection {
  const trimmedText = text.trim();

  // Quick detection using patterns
  const codeMixed = isCodeMixed(trimmedText);
  const devanagariCount = (trimmedText.match(DEVANAGARI_REGEX) || []).length;
  const latinCount = (trimmedText.match(LATIN_REGEX) || []).length;
  const totalChars = trimmedText.length;

  // Decision tree
  if (codeMixed) {
    // Code-mixed: has both Latin + Devanagari
    const devanagariRatio = devanagariCount / totalChars;
    const latinRatio = latinCount / totalChars;

    // If one dominates (>70%), it's not true code-mix
    if (devanagariRatio > 0.7) {
      return {
        detected: "hindi",
        confidence: 0.85 + devanagariRatio * 0.1, // confidence 0.85-0.95
        originalText: trimmedText,
        normalizedText: trimmedText, // Keep Devanagari as-is for now
      };
    }

    if (latinRatio > 0.7) {
      return {
        detected: "hinglish",
        confidence: 0.9,
        originalText: trimmedText,
        normalizedText: normalizeHinglishPhonetics(trimmedText),
      };
    }

    // True code-mix (balanced mix)
    return {
      detected: "hinglish",
      confidence: 0.95,
      originalText: trimmedText,
      normalizedText: normalizeHinglishPhonetics(trimmedText),
    };
  }

  // Pure Devanagari detection
  if (devanagariCount / totalChars > 0.5) {
    return {
      detected: "hindi",
      confidence: 0.95,
      originalText: trimmedText,
      normalizedText: trimmedText,
    };
  }

  // Default: English (or mostly Latin)
  return {
    detected: "english",
    confidence: 0.9,
    originalText: trimmedText,
    normalizedText: trimmedText.toLowerCase(),
  };
}

/**
 * Batch language detection for multiple queries
 */
export function detectLanguageBatch(
  texts: string[]
): LanguageDetection[] {
  return texts.map(detectLanguage);
}
