const express = require("express");
const router = express.Router();

const {
  createUser,
  getUser,
  allUser,
  deleteUser,
  updateUser,
  singleUser,
} = require("../Controllers/userController");
const { protect } = require("../MiddleWare/authMiddleWare");
const { adminProtect } = require("../MiddleWare/adminMiddleWare");

router.post("/", createUser);
router.get("/user", getUser);
router.get("/all", adminProtect, allUser); // adminProtect, /user/all
router.get("/:id", singleUser);
router.delete("/:id", protect, deleteUser); //protect,
router.patch("/:id", protect, updateUser); //protect,

module.exports = router;
