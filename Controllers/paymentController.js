const asyncHandler = require("express-async-handler");
const Package = require("../Model/packageModel");
const Payment = require("../Model/paymentModel");
const Transaction = require("../Model/transactionModel");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const createIntent = asyncHandler(async (req, res) => {
  const { id } = req.body;
  const package = await Package.findById(id);
  const price = package.price;
  // Create a PaymentIntent with the order amount and currency
  if (price) {
    const amount = price * 100;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
    });
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  }
});

const resolveIntent = asyncHandler(async (req, res) => {
  console.log(req.body);
  const { _id, paymentID, uid } = req.body;

  // search for the package and get amount
  const package = await Package.findById(_id);
  console.log(package);

  // Create a PaymentIntent with the order amount and currency
  if (package?._id) {
    const charge = package?.profit || 0;
    const payment = await Payment.create({
      uid,
      paymentID,
      packageID: _id,
      plan: package?.plan,
      price: package?.price - charge,
      estimatedGeneration: package?.estimatedGeneration,
      validity: package?.validity,
      status: "Confirmed",
    });

    if (payment) {
      res.status(201).json({
        _id: payment._id,
        uid: payment.uid,
        packageID: payment.packageID,
        paymentID: payment.paymentID,
        plan: payment.plan,
        price: payment.price,
        estimatedGeneration: payment.estimatedGeneration,
        validity: payment.validity,
        status: payment.status,
      });

      const transactionModelExists = await Transaction.findOne({ uid });

      if (transactionModelExists) {
        // push payment object to the transactionModelExists.transactions array
        transactionModelExists.transactions.push(payment);
        // update the currentBalance
        transactionModelExists.currentBalance += payment.price;

        // Update validity only if it increases
        const existingValidity = transactionModelExists.validity.getTime(); // Get the existing validity in milliseconds

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0); // Set today's time to 00:00:00 UTC

        const newValidity = new Date(
          today.getTime() + payment.validity * 24 * 60 * 60 * 1000
        ); // Calculate the new validity by adding payment validity to the current date

        if (newValidity.getTime() > existingValidity) {
          transactionModelExists.validity = newValidity;
        }

        const updatedTransactionModelExists =
          await transactionModelExists.save();

        if (updatedTransactionModelExists) {
          console.log(
            "updatedTransactionModelExists",
            updatedTransactionModelExists
          );
        } else {
          res.status(400);
          throw new Error("Invalid transactionModelExists data");
        }
      } else {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0); // Set today's time to 00:00:00 UTC

        const validity = new Date(
          today.getTime() + payment.validity * 24 * 60 * 60 * 1000
        ); // Convert payment validity to milliseconds

        const transacModel = await Transaction.create({
          uid,
          transactions: [payment],
          currentBalance: payment.price,
          validity,
          dailyUsed: [],
        });

        if (transacModel) {
          console.log(transacModel);
          // res.status(201).json({
          //   _id: transacModel._id,
          //   uid: transacModel.uid,
          //   transactions: transacModel.transactions,
          //   currentBalance: transacModel.currentBalance,
          //   validity: transacModel.validity,
          //   dailyUsed: transacModel.dailyUsed,
          // });
        } else {
          res.status(400);
          throw new Error("Invalid transaction data");
        }
      }
    } else {
      res.status(400);
      throw new Error("Invalid payment data");
    }
  } else {
    res.status(400);
    throw new Error("Invalid package data");
  }
});

module.exports = { createIntent, resolveIntent };
