const express = require("express");
const {
  allPackage,
  createPackage,
  deletePackage,
  updatePackage
} = require("../Controllers/packageController");
const { adminProtect } = require("../MiddleWare/adminMiddleWare");
const router = express.Router();

router.get("/all", allPackage);
router.post("/create/:id", adminProtect, createPackage);
router.delete("/:id", adminProtect, deletePackage);
router.patch("/:id", adminProtect, updatePackage);

module.exports = router;
