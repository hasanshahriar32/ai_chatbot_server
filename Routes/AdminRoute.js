const express = require("express");
const router = express.Router();

const {
  createAdmin,
  // getAdmin,
  allAdmin,
  deleteAdmin,
  updateAdminPass,
  singleAdmin,
  deleteUser,
} = require("../Controllers/adminController");
const { protect } = require("../MiddleWare/authMiddleWare");
const { adminProtect } = require("../MiddleWare/adminMiddleWare");

router.post("/", adminProtect, createAdmin);
// router.get("/", getUser);
router.get("/all", adminProtect, allAdmin);
router.get("/:id", protect, adminProtect, singleAdmin);
router.delete("/:id", adminProtect, deleteAdmin);
router.delete("/user/:id", adminProtect, deleteUser);
router.patch("/:id", protect, adminProtect, updateAdminPass);

module.exports = router;
