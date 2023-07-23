const asyncHandler = require("express-async-handler");
const { Configuration, OpenAIApi } = require("openai");
const Session = require("../../Model/sessionModel");
const Transaction = require("../../Model/transactionModel");
const Ai = require("../../Model/aiModel");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const generateResponse = asyncHandler(async (req, res) => {
  try {
    const userPrompt = req.body;
    const {
      subjectSelection,
      question,
      sessionId,
      additionalInstruction,
      assistanceLevel,
      uid,
    } = userPrompt;
    const sessionExists = await Session.findOne({ sessionId });
    if (!sessionExists) {
      res.status(422).json({
        error: "session doesn't exists",
      });
      return;
    }

    // get the session's message array length
    const serial = sessionExists.messages.length + 1;
    const transaction = await Transaction.find({ uid }).select(
      "-dailyUsed -transactions"
    );
    const currentBalance = transaction[0]?.currentBalance;
    const validity = transaction[0]?.validity;
    if (currentBalance < 0.006 || !currentBalance) {
      if (
        question === "How to upgrade plan?" ||
        question === "How to update validity?"
      ) {
        res.status(403).json([
          {
            type: "outgoing",
            message: question,
            serial,
            sessionId: sessionId,
          },
          {
            type: "incoming",
            message:
              "Go to profile. Look for Make Payment section. From there, purchase your desired plan.\n\n For Demo, you can use these cards.\n\nCard Details:\n    4242 4242 4242 4242 | 05 | 25 | 125 | 46585",
            serial: serial + 1,
            sessionId: sessionId,
          },
        ]);
        return;
      }
      res.status(403).json([
        {
          type: "outgoing",
          message: question,
          serial,
          sessionId: sessionId,
        },
        {
          type: "incoming",
          message: "Low balance! Upgrade Plan",
          serial: serial + 1,
          sessionId: sessionId,
        },
      ]);
      return;
    }
    if (currentBalance > 0.006) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Set today's time to 00:00:00 UTC

      const newValidity = new Date(today.getTime());
      if (newValidity.getTime() > validity) {
        if (
          question === "How to upgrade plan?" ||
          question === "How to update validity?"
        ) {
          res.status(403).json([
            {
              type: "outgoing",
              message: question,
              serial,
              sessionId: sessionId,
            },
            {
              type: "incoming",
              message:
                "Go to profile. Look for Make Payment section. From there, purchase your desired plan.\n\n For Demo, you can use these cards.\n\nCard Details:\n    4242 4242 4242 4242 | 05 | 25 | 125 | 46585",
              serial: serial + 1,
              sessionId: sessionId,
            },
          ]);
          return;
        }
        res.status(403).json([
          {
            type: "outgoing",
            message: question,
            serial,
            sessionId: sessionId,
          },
          {
            type: "incoming",
            message: "Expired balance! Recharge again",
            serial: serial + 1,
            sessionId: sessionId,
          },
        ]);
        return;
      }
    }
    // rate of the token
    const aiExists = await Ai.find();
    const aiReadCost = aiExists[0].inPrice;
    const aiWriteCost = aiExists[0].outPrice;

    // load existing 2 messages to give better response
    const existingMessages = sessionExists?.messages;
    const latestIncomingMessages = existingMessages
      .filter((message) => message?.type === "incoming")
      .slice(-2);

    const previousMessages = latestIncomingMessages?.map((message) => ({
      role: "assistant",
      content: message?.message,
    }));

    const messages = [
      {
        role: "system",
        content: `focus on responding to latest content!! Act as a teaching professional (of HSTU, Dinajpur, Bangladesh) and analyze the question or topic and generate a comprehensive response to assist. Not mandatorily, if possible or necessary or required, provide additional resources to assist the student. (Links, youtube videos, wikipedia reference etc.) ${
          serial < 3
            ? "most importantly, give a suitable title named Title: at the beginning of response."
            : ""
        }`,
      },
      ...previousMessages, // Include the previous messages if there are 2 or more
      // if you do not wanna include previous messages, then hide it
      {
        role: "user",
        content: `
    Subject: ${subjectSelection} ,
    Prompt: ${question},
    Assistance Level: ${assistanceLevel},
    Additional Details: ${additionalInstruction}, 
    `,
      },
    ];

    // generate the response

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages,
      max_tokens: 1000,
      temperature: 0.5,
      presence_penalty: 0,
      frequency_penalty: 0,
    });

    console.log(response.data.choices[0].message.content, "response");
    console.log("Token usage:", response.data.usage);
    const totalCost =
      (response.data.usage.prompt_tokens / 1000) * aiReadCost +
      (response.data.usage.completion_tokens / 1000) * aiWriteCost;
    console.log("Total Cost: " + " " + totalCost);

    // sessionExists.sessionCost;
    // update value of sessionCost
    // code here for daily cost

    sessionExists.sessionCost += totalCost;
    await sessionExists.save();
    transaction[0].currentBalance -= totalCost;
    await transaction[0].save();

    // Extract the title from the response
    let title = "";
    const responseContent = response.data.choices[0].message.content;
    const titleMatch = responseContent.match(/Title: ([^\n]+)/);
    if (titleMatch) {
      title = titleMatch[1];
    }

    console.log(title, "title");

    // if serial is less than 3, then set the title to Session model's sessionTitle

    if (serial < 3 && title !== "") {
      const sessionTitle = await Session.findOneAndUpdate(
        { sessionId },
        {
          sessionTitle: title,
        }
      );
    }

    // push the user's prompt to the session's message array

    const incomingData = await Session.findOneAndUpdate(
      { sessionId },
      {
        $push: {
          messages: {
            type: "outgoing",
            message: question,
            serial,
            sessionId: sessionId,
            tokenUsage: response.data.usage.prompt_tokens,
          },
        },
      }
    );

    // push the response to the session's message array

    const generatedData = await Session.findOneAndUpdate(
      { sessionId },
      {
        $push: {
          messages: {
            type: "incoming",
            message: response.data.choices[0].message.content,
            serial: serial + 1,
            sessionId: sessionId,
            tokenUsage: response.data.usage.completion_tokens,
          },
        },
      }
    );

    // send the response to the user

    res.status(200).json([
      {
        type: "outgoing",
        message: question,
        serial,
        sessionId: sessionId,
        tokenUsage: response.data.usage.prompt_tokens,
        cost: (response.data.usage.prompt_tokens / 1000) * aiReadCost,
        //if serial is greater than 3, then send the title
        ...(serial < 3 && { title }),
      },
      {
        type: "incoming",
        message: response.data.choices[0].message.content,
        serial: serial + 1,
        sessionId: sessionId,
        tokenUsage: response.data.usage.completion_tokens,
        cost: (response.data.usage.completion_tokens / 1000) * aiWriteCost,
        ...(serial < 3 && { title }),
      },
    ]);
  } catch (error) {
    // Handle the OpenAI API key error
    console.log("OpenAI API error:", error);
    res.status(200).json([
      {
        type: "incoming",
        message:
          "Error Occurred! \n\n Possible Fixes:\n -OpenAI API key is invalid or not available\n -Exceeded text size\n -Server runtime error (COMMON FOR VERCEL)\nContact Admin!",
      },
    ]);
  }
});
const generateAnswer = asyncHandler(async (req, res) => {
  try {
    const userPrompt = req.body;
    const {
      subjectSelection,
      question,
      sessionId,
      finetune,
      additionalInstruction,
      assistanceLevel,
      uid,
    } = userPrompt;
    const sessionExists = await Session.findOne({ sessionId });
    if (!sessionExists) {
      res.status(422).json({
        error: "session doesn't exists",
      });
      return;
    }

    // get the session's message array length
    const serial = sessionExists.messages.length + 1;
    const transaction = await Transaction.find({ uid }).select(
      "-dailyUsed -transactions"
    );
    const currentBalance = transaction[0]?.currentBalance;
    const validity = transaction[0]?.validity;
    if (currentBalance < 0.006 || !currentBalance) {
      if (
        question === "How to upgrade plan?" ||
        question === "How to update validity?"
      ) {
        res.status(403).json([
          {
            type: "outgoing",
            message: question,
            serial,
            sessionId: sessionId,
          },
          {
            type: "incoming",
            message:
              "Go to profile. Look for Make Payment section. From there, purchase your desired plan.\n\n For Demo, you can use these cards.\n\nCard Details:\n    4242 4242 4242 4242 | 05 | 25 | 125 | 46585",
            serial: serial + 1,
            sessionId: sessionId,
          },
        ]);
        return;
      }
      res.status(403).json([
        {
          type: "outgoing",
          message: question,
          serial,
          sessionId: sessionId,
        },
        {
          type: "incoming",
          message: "Low balance! Upgrade Plan",
          serial: serial + 1,
          sessionId: sessionId,
        },
      ]);
      return;
    }
    if (currentBalance > 0.006) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Set today's time to 00:00:00 UTC

      const newValidity = new Date(today.getTime());
      if (newValidity.getTime() > validity) {
        if (
          question === "How to upgrade plan?" ||
          question === "How to update validity?"
        ) {
          res.status(403).json([
            {
              type: "outgoing",
              message: question,
              serial,
              sessionId: sessionId,
            },
            {
              type: "incoming",
              message:
                "Go to profile. Look for Make Payment section. From there, purchase your desired plan.\n\n For Demo, you can use these cards.\n\nCard Details:\n    4242 4242 4242 4242 | 05 | 25 | 125 | 46585",
              serial: serial + 1,
              sessionId: sessionId,
            },
          ]);
          return;
        }
        res.status(403).json([
          {
            type: "outgoing",
            message: question,
            serial,
            sessionId: sessionId,
          },
          {
            type: "incoming",
            message: "Expired balance! Recharge again",
            serial: serial + 1,
            sessionId: sessionId,
          },
        ]);
        return;
      }
    }
    // rate of the token
    const aiExists = await Ai.find();
    const aiReadCost = aiExists[0].inPrice;
    const aiWriteCost = aiExists[0].outPrice;

    // load existing 2 messages to give better response
    // const existingMessages = sessionExists?.messages;
    // const latestIncomingMessages = existingMessages
    //   .filter((message) => message?.type === "incoming")
    //   .slice(-2);

    // const previousMessages = latestIncomingMessages?.map((message) => ({
    //   role: "assistant",
    //   content: message?.message,
    // }));

    const messages = [
      {
        role: "system",
        content: `Act as a admission assistant bot of Hajee Mohammad Danesh Science and Technology University, Dinajpur- 5200, Bangladesh. If you have the answer to the problem of the candidate, then provide it. For your assistance, another fine tune model will provide its trained data to you. With your knowledge and the data of this fine tune model, create a meaningful solution and provide it. Note that, the trained data of this fine tune model might not be correct (or be correct). Give priority of your own data and just for assistance, use the data of fine tune model.`,
      },
      {
        role: "assistant",
        content: `finetune model message starts here
        ${finetune}
        `,
      },
      {
        role: "user",
        content: `
    Prompt: ${question},
    Assistance Level: ${assistanceLevel},
    Additional Details: ${additionalInstruction}, 
    `,
      },
    ];

    // generate the response

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages,
      max_tokens: 500,
      temperature: 0.5,
      presence_penalty: 0,
      frequency_penalty: 0,
    });

    console.log(response.data.choices[0].message.content, "response");
    console.log("Token usage:", response.data.usage);
    const totalCost =
      (response.data.usage.prompt_tokens / 1000) * aiReadCost +
      (response.data.usage.completion_tokens / 1000) * aiWriteCost;
    console.log("Total Cost: " + " " + totalCost);

    // sessionExists.sessionCost;
    // update value of sessionCost
    // code here for daily cost

    sessionExists.sessionCost += totalCost;
    await sessionExists.save();
    transaction[0].currentBalance -= totalCost;
    await transaction[0].save();

    // Extract the title from the response
    let title = "HSTU Helpline Bot 🟢";
    const responseContent = response.data.choices[0].message.content;
    const titleMatch = responseContent.match(/Title: ([^\n]+)/);
    if (titleMatch) {
      title = titleMatch[1];
    }

    console.log(title, "title");

    // if serial is less than 3, then set the title to Session model's sessionTitle

    if (serial < 3 && title !== "") {
      const sessionTitle = await Session.findOneAndUpdate(
        { sessionId },
        {
          sessionTitle: title,
        }
      );
    }

    // push the user's prompt to the session's message array

    const incomingData = await Session.findOneAndUpdate(
      { sessionId },
      {
        $push: {
          messages: {
            type: "outgoing",
            message: question,
            serial,
            sessionId: sessionId,
            tokenUsage: response.data.usage.prompt_tokens,
          },
        },
      }
    );

    // push the response to the session's message array

    const generatedData = await Session.findOneAndUpdate(
      { sessionId },
      {
        $push: {
          messages: {
            type: "incoming",
            message: response.data.choices[0].message.content,
            serial: serial + 1,
            sessionId: sessionId,
            tokenUsage: response.data.usage.completion_tokens,
          },
        },
      }
    );

    // send the response to the user

    res.status(200).json([
      {
        type: "outgoing",
        message: question,
        serial,
        sessionId: sessionId,
        tokenUsage: response.data.usage.prompt_tokens,
        cost: (response.data.usage.prompt_tokens / 1000) * aiReadCost,
        //if serial is greater than 3, then send the title
        ...(serial < 3 && { title }),
      },
      {
        type: "incoming",
        message: response.data.choices[0].message.content,
        serial: serial + 1,
        sessionId: sessionId,
        tokenUsage: response.data.usage.completion_tokens,
        cost: (response.data.usage.completion_tokens / 1000) * aiWriteCost,
        ...(serial < 3 && { title }),
      },
    ]);
  } catch (error) {
    // Handle the OpenAI API key error
    console.log("OpenAI API error:", error);
    res.status(200).json([
      {
        type: "incoming",
        message:
          "Error Occurred! \n\n Possible Fixes:\n -OpenAI API key is invalid or not available\n -Exceeded text size\n -Server runtime error (COMMON FOR VERCEL)\nContact Admin!",
      },
    ]);
  }
});

const generateSuggestions = asyncHandler(async (req, res) => {
  const { message, sessionId, uid } = req.body;

  if (!message) {
    res.status(400).json({
      error: "Message is required.",
    });
    return;
  }

  const transaction = await Transaction.find({ uid }).select(
    "-dailyUsed -transactions"
  );
  const currentBalance = transaction[0]?.currentBalance;
  const validity = transaction[0]?.validity;
  if (currentBalance < 0.006 || !currentBalance) {
    res.status(200).json({
      message: "How to upgrade plan?\n",
      sessionId,
      tokenUsage: 0,
      totalCost: 0,
    });
    return;
  }
  if (currentBalance > 0.006) {
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

  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `Give some search suggestions based on the message in 5 lines. each line should be separated by a new line. and each line should be within 30 characters.`,
      },
      {
        role: "user",
        content: `
---------------message starts here---------------
${message}
---------------message ends here---------------`,
      },
    ],
    max_tokens: 200,
    temperature: 0.5,
    presence_penalty: 0,
    frequency_penalty: 0,
  });

  console.log(response.data.choices[0].message.content, "response");
  console.log("Token usage:", response.data.usage);

  // rate of the token
  const aiExists = await Ai.find();
  const aiReadCost = aiExists[0].inPrice;
  const aiWriteCost = aiExists[0].outPrice;

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
    message: response.data.choices[0].message.content,
    tokenUsage: response.data.usage.completion_tokens,
    totalCost,
    sessionId,
  });
});
const fineTune = asyncHandler(async (req, res) => {
  const { question, sessionId, uid } = req.body;
  const message = `Question: ${question}`;
  if (!message) {
    res.status(400).json({
      error: "Message is required.",
    });
    return;
  }

  const transaction = await Transaction.find({ uid }).select(
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
  const response = await openai.createCompletion({
    model: "curie:ft-sj-innovation-2023-07-22-23-45-03",
    prompt: message,
    max_tokens: 300,
  });

  console.log(response.data.choices[0]?.text, "response");
  console.log("Token usage:", response.data.usage);

  console.log(response.data.choices[0]?.text, "response");
  console.log("Token usage:", response.data.usage);

  // rate of the token
  const aiExists = await Ai.find();
  const aiReadCost = 0.12;
  const aiWriteCost = 0.12;

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
    message: response.data.choices[0]?.text,
    tokenUsage: response.data.usage.completion_tokens,
    totalCost,
    sessionId,
  });
});

module.exports = {
  generateResponse,
  generateSuggestions,
  fineTune,
  generateAnswer,
};
