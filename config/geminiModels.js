export const GEMINI_MODELS = {
  'gemini-3.5-flash-lite': 'Gemini 3.5 Flash-Lite',
  'gemini-3.8-flash': 'Gemini 3.8 Flash',
};

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

export const isSupportedGeminiModel = (model) =>
  Object.hasOwn(GEMINI_MODELS, model);
