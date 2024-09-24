import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

const geminiQueryRun = async ( testPrompt, questionCount, testDifficulty, testModel ) => {
 const prompt = `
 
Output format: 

json
[{
  "questionText": "Sample question text",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "answer": "Correct option",
  "tag": ["Tag 1", "Tag 2", "Tag 3", "Tag 4"]
}]

Test Prompt: ${testPrompt}

System Instructions: { "Number of questions to generate": ${questionCount}, "Difficulty level": ${testDifficulty}/10 (1 is the easiest, 10 is the most difficult), "Options Requirement": Each question must have exactly 4 options that are distinct, logically plausible, and designed to be confusing yet fair. No more or less than four options per question. "Answer Requirement": Ensure that the correct answer is accurate, relevant, and clearly distinguishable as the best choice among the options. "Question Types": Prioritize questions that start with "What," "Why," or "Which" to create engaging and thought-provoking content. Use these formats when relevant and appropriate. "Question Tags": Provide relevant tags for each question, capturing key concepts, categories, or skills being tested. "Language and Tone": Use clear, precise language suitable for ${testDifficulty}/10 difficulty. Ensure the questions are challenging but fair at the specified difficulty level. "Avoidance of Ambiguity": Avoid ambiguous phrasing in questions and options. Questions should be direct, and options should not overlap in meaning or intent. "Relevance and Appropriateness": Ensure all questions and options align with the test prompt context and maintain academic integrity. "Consistency Check": Verify that each question has exactly four options and that the question format aligns with "What," "Why," or "Which" as much as possible. }

`


  try {
    const model = genAI.getGenerativeModel({
      model: testModel,
    });

    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    const result = await chatSession.sendMessage(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error in geminiQueryRun:", error);
    return "403";
  }
};

export default geminiQueryRun;
