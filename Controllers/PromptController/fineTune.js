const asyncHandler = require("express-async-handler");
const Session = require("../../Model/sessionModel");
const Transaction = require("../../Model/transactionModel");
const Ai = require("../../Model/aiModel");
const { openai } = require("./promptController");

const fineTune = asyncHandler(async (req, res) => {
  const { question, sessionId, uid } = req.body;
  const message = `Question: ${question}`;
  if (!message) {
    res.status(400).json({
      error: "Message is required.",
    });
    return;
  }

  const transaction = await Transaction?.find({ uid }).select(
    "-dailyUsed -transactions"
  );
  const currentBalance = transaction[0]?.currentBalance;
  const validity = transaction[0]?.validity;
  if (currentBalance < 0.06 || !currentBalance) {
    res.status(200).json({
      message: "How to upgrade plan?\n",
      sessionId,
      tokenUsage: 0,
      totalCost: 0,
    });
    return;
  }
  if (currentBalance > 0.06) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Set today's time to 00:00:00 UTC

    const newValidity = new Date(today.getTime());
    if (newValidity.getTime() > validity) {
      res.status(200).json({
        message: "How to update validity?\n",
        sessionId,
        tokenUsage: 0,
        totalCost: 0,
      });
      return;
    }
  }

  // const formattedMessage = message.replace(/\n/g, "");
  //   const response = await openai.createChatCompletion({
  //     model: "gpt-3.5-turbo",
  //     messages: [
  //       {
  //         role: "system",
  //         content: `Give some search suggestions based on the message in 5 lines. each line should be separated by a new line. and each line should be within 30 characters.`,
  //       },
  //       {
  //         role: "user",
  //         content: `
  // ---------------message starts here---------------
  // ${message}
  // ---------------message ends here---------------`,
  //       },
  //     ],
  //     max_tokens: 200,
  //     temperature: 0.5,
  //     presence_penalty: 0,
  //     frequency_penalty: 0,
  //   });
  // const response = await openai.createCompletion({
  //   model: "davinci:ft-sj-innovation-2023-07-29-07-13-53",
  //   prompt: `${message} ->`,
  //   max_tokens: 300,
  //   // end response
  //   stop: ["\n"],
  //   //give strict response
  //   temperature: 0,
  //   top_p: 1,
  //   frequency_penalty: 0,
  // });
  const response = await openai.createChatCompletion({
    model: process.env.FINE_TUNE_MODEL,
    messages,
    max_tokens: 300,
    temperature: 0.5,
    presence_penalty: 0,
    frequency_penalty: 0,
  });
  console.log(response.data?.choices[0]?.message?.content, "response");
  console.log("Token usage:", response.data.usage);

  console.log(response.data?.choices[0]?.message?.content, "response");
  console.log("Token usage:", response.data.usage);

  // rate of the token
  const aiExists = await Ai.find();
  const aiReadCost = 0.012;
  const aiWriteCost = 0.016;

  const totalCost =
    (response.data.usage.prompt_tokens / 1000) * aiReadCost +
    (response.data.usage.completion_tokens / 1000) * aiWriteCost;
  console.log("Total Cost: " + " " + totalCost);

  // sessionExists.sessionCost;
  // update value of sessionCost
  // code here for daily cost
  const sessionExists = await Session.findOne({ sessionId });
  sessionExists.sessionCost += totalCost;
  await sessionExists.save();

  transaction[0].currentBalance -= totalCost;
  await transaction[0].save();

  res.status(200).json({
    message: response.data?.choices[0]?.message?.content,
    tokenUsage: response.data.usage.completion_tokens,
    totalCost,
    sessionId,
  });
});
