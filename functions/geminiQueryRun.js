import { GoogleGenAI } from "@google/genai";
import {
  DEFAULT_GEMINI_MODEL,
  isSupportedGeminiModel,
} from "../config/geminiModels.js";
import { generateGroundedContent } from './geminiGrounding.js';
import { CONTENT_FORMAT_INSTRUCTIONS } from './assessment/contentInstructions.js';
import { validateContentFormat, validateQuestionContent } from './assessment/contentValidation.js';

const questionSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      questionText: { type: "string" },
      options: { type: "array", items: { type: "string" } },
      answer: { type: "string" },
      tag: { type: "array", items: { type: "string" } },
    },
    required: ["questionText", "options", "answer", "tag"],
  },
};

const getClient = () => {
  if (!process.env.GEMINI_API_KEY)
    throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { timeout: 120000, retryOptions: { attempts: 1 } },
  });
};

const resolveModel = (model) => {
  // Queued tests created before the model migration can still finish.
  if (model === "gemini-1.5-flash" || model === "gemini-1.5-pro") {
    return DEFAULT_GEMINI_MODEL;
  }
  if (!isSupportedGeminiModel(model))
    throw new Error("Unsupported Gemini model");
  return model;
};

const geminiQueryRun = async (
  testPrompt,
  questionCount,
  testDifficulty,
  testModel = DEFAULT_GEMINI_MODEL,
  context,
) => {
  const response = await generateGroundedContent({
    generate: (request) => getClient().models.generateContent(request),
    context,
    model: resolveModel(testModel),
    operation: "questions",
    validate: (result) => {
      const questions = JSON.parse(result.text || "null");
      if (
        !Array.isArray(questions) ||
        !questions.length ||
        questions.length > questionCount ||
        !questions.every(
          (question) =>
            typeof question.questionText === "string" &&
            question.questionText.trim() &&
            Array.isArray(question.options) &&
            question.options.length === 4 &&
            question.options.every(
              (option) => typeof option === "string" && option.trim(),
            ) &&
            new Set(question.options).size === 4 &&
            question.options.includes(question.answer) &&
            Array.isArray(question.tag),
        )
      )
        throw new Error("Invalid question response");
      questions.forEach(validateQuestionContent);
    },
    contents: `Create exactly ${questionCount} distinct multiple-choice questions about: ${testPrompt}. Difficulty: ${testDifficulty}/10. Each question must have four distinct plausible options, one answer that exactly matches an option, and relevant tags. Use clear, unambiguous language. ${CONTENT_FORMAT_INSTRUCTIONS} Return only the requested JSON array.`,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: questionSchema,
    },
  });
  if (!response.text)
    throw new Error("Gemini returned an empty question response");
  return response.text;
};

const geminiSummaryRun = async (
  questionText,
  correctAnswer,
  testModel = DEFAULT_GEMINI_MODEL,
  context,
) => {
  const response = await generateGroundedContent({
    generate: (request) => getClient().models.generateContent(request),
    context,
    model: resolveModel(testModel),
    operation: "explanation",
    validate: (result) => {
      if (!result.text?.trim()) throw new Error("Empty explanation");
      validateContentFormat(result.text, 'Explanation');
    },
    contents: `In about 50 words, explain why this answer is correct. ${CONTENT_FORMAT_INSTRUCTIONS}\nQuestion: ${questionText}\nCorrect answer: ${correctAnswer}`,
    config: { temperature: 0.4 },
  });
  if (!response.text) throw new Error("Gemini returned an empty explanation");
  return response.text.trim();
};

export default geminiQueryRun;
// Structured specialist calls use the same metering, timeout and model allowlist as MCQs.
export const createAgentGenerator = (model, context) => async ({ agent, schema, instructions, validate, operation }) => {
  const resolved = resolveModel(model);
  const result = await generateGroundedContent({
    generate: (request) => getClient().models.generateContent(request),
    context, model: resolved, operation, agent,
    validate: (response) => validate(JSON.parse(response.text || 'null')),
    contents: `${instructions}\n${CONTENT_FORMAT_INSTRUCTIONS}`,
    config: { temperature: 0.4, responseMimeType: 'application/json', responseJsonSchema: schema },
  });
  return JSON.parse(result.text);
};
export { geminiSummaryRun };
