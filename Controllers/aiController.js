const asyncHandler = require("express-async-handler");
const Ai = require("../Model/aiModel");
const bcrypt = require("bcryptjs");
const Admin = require("../Model/adminModel");

const createAi = asyncHandler(async (req, res) => {
  const { initBalance, outPrice, inPrice, initDuration } = req.body;
  console.log(req.body);
  const aiExists = await Ai.findOne({ initBalance });
  if (aiExists) {
    res.status(422).json({
      error: "Config already exists",
      _id: aiExists._id,
      aiExists,
    });
    throw new Error("Config already exists");
  }
  const ai = await Ai.create({
    initBalance,
    initDuration,
    outPrice,
    inPrice,
  });
  if (ai) {
    res.status(201).json({
      _id: ai._id,
      initBalance: ai.initBalance,
      initDuration: ai.initDuration,
      outPrice: ai.outPrice,
      inPrice: ai.inPrice,
    });
  } else {
    res.status(400);
    throw new Error("Invalid ai data");
  }
});
const updateAi = async (req, res) => {
  const aiManager = req.params.id;
  const config = req.body;
  const filter = { _id: config._id };
  const user = await Admin.findById(aiManager);
  console.log("user before password update:", user);

  // Compare the current password entered by the user with the encrypted password in the database
  const isMatch = await bcrypt.compare(config.password, user.password);

  if (!isMatch) {
    return res.status(403).json({ msg: "Invalid credentials" });
  }
  const ai = await Ai.findOneAndUpdate(filter, config, {
    new: true,
  });
  res.send(ai);
};
const allAi = async (req, res) => {
  const ai = await Ai.find();
  res.send(ai);
};

module.exports = {
  createAi,
  allAi,
  updateAi,
};
