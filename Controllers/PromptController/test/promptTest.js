const asyncHandler = require("express-async-handler");
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);
const generateTest = asyncHandler(async (req, res) => {
  const response = await openai.createImage({
    prompt: "a graph chart of e=mc^2",
    n: 1,
    size: "256x256",
  });

  const imageUrl = response.data.data[0].url;

  console.log(response.data.choices, "response");

  res.status(200).json({
    message: "success",
    imageUrl: imageUrl,
  });
});

module.exports = { generateTest };
