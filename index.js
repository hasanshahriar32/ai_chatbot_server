const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const mongoose = require("mongoose");
const UserRoute = require("./Routes/UserRoute");
const SessionRoute = require("./Routes/SessionRoute");
const PromptRoute = require("./Routes/PromptRoute");
const PackageRoute = require("./Routes/PackageRoute");
const transactionRoute = require("./Routes/TransactionRoute");
const AdminRoute = require("./Routes/AdminRoute");
const AiRoute = require("./Routes/AiRoute");
const PaymentRoute = require("./Routes/PaymentRoute");
const { notFound, errorHandler } = require("./MiddleWare/errMiddleWare");
const { swaggerServe, swaggerSetup } = require("./Documentation/specs.js");

// middleware
//new
app.use(cors());
app.use(express.json());

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

// routes start
// app.get("/", (req, res) => {
//   res.send(`neuronex is running on ${port}. documentation is at /api-docs`);
// });
app.use("/user", UserRoute);
app.use("/session", SessionRoute);
app.use("/generate", PromptRoute);
app.use("/admin", AdminRoute);
app.use("/ai", AiRoute);
app.use("/package", PackageRoute);
app.use("/payment", PaymentRoute);
app.use("/transaction", transactionRoute);
app.use("/api-docs", swaggerServe, swaggerSetup);
app.use("/", swaggerServe, swaggerSetup);

// routes end

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Neuronex is running: ${port}`);
});
//finish index.js
