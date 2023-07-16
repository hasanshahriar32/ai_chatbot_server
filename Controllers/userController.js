// const Admin = require("../Model/adminModel");
const User = require("../Model/userModel");
const generateToken = require("../Config/generateToken");
const asyncHandler = require("express-async-handler");
const Ai = require("../Model/aiModel");
const Transaction = require("../Model/transactionModel");

const createUser = asyncHandler(async (req, res) => {
  const { name, email, uid, verified, pic, userAbout } = req.body;
  console.log(req.body);
  // res.json("user created")
  const userExists = await User.findOne({ uid });
  if (userExists) {
    res.status(422).json({
      error: "User already exists",
      token: generateToken(userExists._id),
      _id: userExists._id,
      userExists,
    });
    throw new Error("User already exists");
  }
  const user = await User.create({
    name,
    email,
    uid,
    verified,
    pic,
    userAbout,
  });

  // give custom balance to user account
  const aiExists = await Ai.find();
  const initBalance = aiExists[0].initBalance;
  const initDuration = aiExists[0].initDuration;

  const transactionModelExists = await Transaction.findOne({ uid });
  if(!transactionModelExists){
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0); // Set today's time to 00:00:00 UTC

        const validity = new Date(
          today.getTime() + initDuration * 24 * 60 * 60 * 1000
        ); // Convert payment validity to milliseconds

        const transacModel = await Transaction.create({
          uid,
          transactions: [],
          currentBalance: initBalance,
          validity,
          dailyUsed: [],
        });
      }

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      uid: user.uid,
      pic: user.pic,
      verified: user.verified,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

const allUser = async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit) : 50;
  const skipIndex = (page - 1) * limit;
  const user = await User.find().skip(skipIndex).limit(limit);

  res.send(user);
};

const getUser = asyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};
  const users = await User.find({ ...keyword })
    .find({})
    .limit(10);
  // const users = await User.find({ ...keyword }).find;
  res.json(users);
});

const singleUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
};
const updateUser = async (req, res) => {
  const id = req.params.id;
  const updatedValue = req.body;
  const filter = { _id: id };
  const user = await User.findOneAndUpdate(filter, updatedValue, {
    new: true,
  });
  res.send(user);
};

const deleteUser = async (req, res) => {
  const id = req.params.id;
  //   const admin = await Admin.deleteOne({ _id: id });
  const user = await User.deleteOne({ _id: id });
  // console.log(user);
  // console.log(admin);
  res.send(user);
  // res.send(admin);
};

module.exports = {
  createUser,
  getUser,
  allUser,
  deleteUser,
  updateUser,
  singleUser,
};
