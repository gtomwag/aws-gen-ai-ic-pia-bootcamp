/**
 * Amazon Translate Integration — Multi-Language Notification Support
 *
 * Translates notification copy and chat responses into the passenger's
 * preferred language. Falls through to English when disabled or on error.
 *
 * When USE_TRANSLATE is false (default for local dev), returns the original text.
 */

const USE_TRANSLATE = (process.env.USE_TRANSLATE || 'false').toLowerCase() === 'true';

let translateClient = null;

function getTranslateClient() {
  if (!translateClient) {
    const { TranslateClient } = require('@aws-sdk/client-translate');
    translateClient = new TranslateClient({});
  }
  return translateClient;
}

/**
 * Supported language codes (ISO 639-1). Amazon Translate supports 75+ languages;
 * these are the most common for airline operations.
 */
const SUPPORTED_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ja', 'ko', 'zh', 'zh-TW',
  'ar', 'hi', 'ru', 'tr', 'pl', 'sv', 'da', 'no', 'fi', 'el', 'cs', 'ro',
  'hu', 'th', 'vi', 'id', 'ms', 'tl', 'he',
];

/**
 * Translate text to a target language.
 *
 * @param {string} text - The text to translate
 * @param {string} targetLanguage - Target language code (e.g., 'es', 'fr', 'de')
 * @param {string} [sourceLanguage='en'] - Source language code
 * @returns {Promise<{ translatedText: string, sourceLanguage: string, targetLanguage: string }>}
 */
async function translateText(text, targetLanguage, sourceLanguage = 'en') {
  // No-op if disabled, same language, or empty text
  if (!USE_TRANSLATE || !text || !targetLanguage || targetLanguage === sourceLanguage) {
    return { translatedText: text, sourceLanguage, targetLanguage: targetLanguage || sourceLanguage };
  }

  // Validate target language
  if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
    console.warn(`METRIC: TRANSLATE_UNSUPPORTED_LANG | lang=${targetLanguage}`);
    return { translatedText: text, sourceLanguage, targetLanguage };
  }

  try {
    const { TranslateTextCommand } = require('@aws-sdk/client-translate');
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: sourceLanguage,
      TargetLanguageCode: targetLanguage,
    });

    const response = await getTranslateClient().send(command);

    console.log(`METRIC: TEXT_TRANSLATED | source=${sourceLanguage} | target=${targetLanguage} | chars=${text.length}`);

    return {
      translatedText: response.TranslatedText,
      sourceLanguage: response.SourceLanguageCode,
      targetLanguage: response.TargetLanguageCode,
    };
  } catch (err) {
    console.error(`METRIC: TRANSLATE_ERROR | value=1 | target=${targetLanguage} |`, err.message);
    return { translatedText: text, sourceLanguage, targetLanguage };
  }
}

/**
 * Detect the dominant language of a text.
 *
 * @param {string} text - The text to analyze
 * @returns {Promise<{ languageCode: string, score: number }>}
 */
async function detectLanguage(text) {
  if (!USE_TRANSLATE || !text || text.trim().length === 0) {
    return { languageCode: 'en', score: 1.0 };
  }

  try {
    const { TranslateClient } = require('@aws-sdk/client-translate');
    // Amazon Translate doesn't have detect-language; use Comprehend for that
    // For simplicity, we use the 'auto' source language feature in TranslateText
    // and extract the detected language from the response.
    const { TranslateTextCommand } = require('@aws-sdk/client-translate');
    const command = new TranslateTextCommand({
      Text: text.slice(0, 200), // Limit to 200 chars for detection
      SourceLanguageCode: 'auto',
      TargetLanguageCode: 'en',
    });

    const response = await getTranslateClient().send(command);
    return {
      languageCode: response.SourceLanguageCode || 'en',
      score: 1.0, // Translate doesn't return a confidence score for detected language
    };
  } catch (err) {
    console.error('METRIC: LANG_DETECT_ERROR | value=1 |', err.message);
    return { languageCode: 'en', score: 0 };
  }
}

/**
 * Translate a notification object (greeting + body + CTA options).
 *
 * @param {Object} notification - The notification object from generateNotificationCopy
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<Object>} Translated notification object
 */
async function translateNotification(notification, targetLanguage) {
  if (!USE_TRANSLATE || !targetLanguage || targetLanguage === 'en') {
    return { ...notification, language: 'en' };
  }

  try {
    // Translate the main body text
    const bodyResult = await translateText(notification.body, targetLanguage);

    // Translate CTA options
    const translatedCTAs = await Promise.all(
      (notification.ctaOptions || []).map(async (cta) => {
        const result = await translateText(cta, targetLanguage);
        return result.translatedText;
      })
    );

    return {
      ...notification,
      body: bodyResult.translatedText,
      originalBody: notification.body,
      ctaOptions: translatedCTAs,
      originalCtaOptions: notification.ctaOptions,
      language: targetLanguage,
      translatedFrom: 'en',
    };
  } catch (err) {
    console.error(`METRIC: NOTIFICATION_TRANSLATE_ERROR | value=1 | target=${targetLanguage} |`, err.message);
    return { ...notification, language: 'en' };
  }
}

module.exports = { translateText, detectLanguage, translateNotification, SUPPORTED_LANGUAGES };
