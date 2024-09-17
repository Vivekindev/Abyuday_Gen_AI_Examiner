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
 
output json format:  [{"questionText": "question", "options": ["option1", "option2", "option3", "option4"], "answer": "correct option", "tag": ["Question tag 1", "Question tag 2", "Question tag 3", "Question tag 4"]}, ]

${testPrompt}
System Instructions : {
number of questions to be generated : ${questionCount}
Difficulty : ${testDifficulty}/10, (1 is easiest, 10 is most difficult)
there must be 4 options that should be confusing and unique from each other

}

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
