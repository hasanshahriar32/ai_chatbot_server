const express = require("express");
const router = express.Router();

const { protect } = require("../MiddleWare/authMiddleWare");
const { adminProtect } = require("../MiddleWare/adminMiddleWare");
const {
  createIntent,
  resolveIntent,
} = require("../Controllers/paymentController");

router.post("/create-intent", createIntent);
router.post("/resolve-intent", resolveIntent);

module.exports = router;
