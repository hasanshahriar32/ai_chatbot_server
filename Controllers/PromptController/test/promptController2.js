const OpenAiStream = require("./openAiStream");
const asyncHandler = require("express-async-handler");
const { Configuration, OpenAIApi } = require("openai");
// const database = require("./database"); // Assuming you have a separate module for database operations

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const config = {
  runtime: "edge",
};

const generateResponse2 = asyncHandler(async (req, res) => {
  const userPrompt = req.body;
  const {
    subjectSelection,
    question,
    sessionId,
    additionalInstruction,
    assistanceLevel,
    uid,
  } = userPrompt;

  const responseStream = await OpenAiStream({
    model: "text-davinci-003",
    prompt: `
      Subject: ${subjectSelection} ,
      Topic or Question: ${question},
      Assistance Level: ${assistanceLevel},
      Additional Details: ${additionalInstruction},
      
      Act as a teaching professional and analyze the question or topic and generate a comprehensive response to assist. Please explain the concept and offer step-by-step guidance.
      `,
    temperature: 0.1,
    max_tokens: 600,
    stream: true,
  });
  const chunks = [];
  const reader = responseStream.getReader();

  // Send each chunk to the frontend using Server-Sent Events
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  let index = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Process and save the chunk to the database asynchronously
    const chunkText = new TextDecoder().decode(value);
    console.log(chunkText);
    // database.saveChunk(chunkText).catch((error) => {
    //   console.error("Error saving chunk to database:", error);
    // });

    // Send the chunk to the frontend
    const event = `data: ${chunkText}\n\n`;
    res.write(event);

    // Simulate a delay between sending chunks (adjust the delay as needed)
    setTimeout(() => {
      if (index === chunks.length - 1) {
        res.write("event: end\n\n"); // Signal the end of the stream
      }
    }, index * 0); // Delay each chunk by 1 second

    index++;
  }

  res.end();
});

module.exports = {
  generateResponse2,
};
