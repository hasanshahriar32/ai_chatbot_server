const express = require("express");
const { adminProtect } = require("../MiddleWare/adminMiddleWare");
const { allAi, createAi, updateAi } = require("../Controllers/aiController");
const router = express.Router();

router.get("/all", allAi);
// router.post("/:id", adminProtect, createAi);
router.patch("/:id", adminProtect, updateAi);

module.exports = router;
