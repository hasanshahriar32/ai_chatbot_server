const express = require("express");
const router = express.Router();
const {
  allTransaction,
  allUserTransaction,
} = require("../Controllers/transactionController");
const { protect } = require("../MiddleWare/authMiddleWare");
const { adminProtect } = require("../MiddleWare/adminMiddleWare");

router.post("/all/:id", protect, allTransaction);
router.post("/admin/all/:id", adminProtect, allUserTransaction);

module.exports = router;
