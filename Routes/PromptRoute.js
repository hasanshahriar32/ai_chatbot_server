const express = require("express");
const router = express.Router();

const {
  generateResponse,
  fineTune,
  generateSuggestions,
  generateAnswer,
} = require("../Controllers/PromptController/promptController");
const {
  generateResponse3,
} = require("../Controllers/PromptController/test/promptController3");
const {
  generateTest,
} = require("../Controllers/PromptController/test/promptTest");
const { protect } = require("../MiddleWare/authMiddleWare");

// const {} = require("../Controllers/userController");

router.post("/test", generateResponse3);
router.post("/prompt/:id", protect, generateResponse);
router.post("/finetune/:id", protect, fineTune);
router.post("/admission/:id", protect, generateAnswer);
router.post("/suggestions/:id", protect, generateSuggestions);
// router.get("/test", generateTest);

module.exports = router;
