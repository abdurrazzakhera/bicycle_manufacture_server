const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

//Midle Werere
app.use(cors());
app.use(express.json());

//mango db connet
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iajku.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
function verifyJWT(req, res, next) {
  const authHeaders = req.headers.authorization;
  if (!authHeaders) {
    return res.status(401).send({ message: "UnAthorized Access" });
  }
  const token = authHeaders.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}
// something is change
async function run() {
  try {
    await client.connect();
    // All Collection
    const goodsCollections = client.db("manufacture").collection("services");
    const ordersCollections = client.db("manufacture").collection("orders");
    const usersCollections = client.db("manufacture").collection("users");
    const paymentCollections = client.db("manufacture").collection("payments");
    const reviewsCollections = client.db("manufacture").collection("reviews");
    const shipedOrderCollections = client
      .db("manufacture")
      .collection("ShipedOrder");

    //Payment price intent
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const services = req.body;
      const price = services.totalPrice;
      const amount = price * 100;

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    //
    //
    //Add Goods By Admin
    app.post("/goods", verifyJWT, async (req, res) => {
      const goods = req.body;
      const result = await goodsCollections.insertOne(goods);
      res.send(result);
    });
    //
    //
    // * MongoDb User Collection
    app.get("/goods", async (req, res) => {
      const result = await goodsCollections.find().toArray();
      res.send(result);
    });
    //
    //
    //Call Single product from the database
    app.get("/goods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const productDetails = await goodsCollections.findOne(query);
      res.send(productDetails);
    });
    //
    //
    //Product Delete for Admin Control
    app.delete("/goods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const productDeleted = await goodsCollections.deleteOne(query);
      res.send(productDeleted);
    });
    //
    //
    //Save the order in database
    app.post("/orders", async (req, res) => {
      const orders = req.body;
      const result = await ordersCollections.insertOne(orders);
      res.send({ success: true, result });
    });
    //
    //
    //Get order per user
    app.get("/orders", verifyJWT, async (req, res) => {
      const customerEmail = req.query.customerEmail;
      const decodedEmail = req.decoded.email;
      if (customerEmail === decodedEmail) {
        const query = { customerEmail: customerEmail };
        const resulte = await ordersCollections.find(query).toArray();
        return res.send(resulte);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });
    //
    //
    //Get order from user Payment
    app.get("/orders/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollections.findOne(query);
      res.send(result);
    });
    //
    //
    //Order Collection Update after payment;
    app.patch("/orders/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: true,
          transactionId: payment.transectionId,
        },
      };
      const result = await paymentCollections.insertOne(payment);
      const updatedOrder = await ordersCollections.updateOne(filter, updateDoc);
      res.send(updateDoc);
    });
    //
    //
    //Ship Status update by admin/ procesing start
    app.patch("/ordersShiped/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const shipedOrder = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          shiped: true,
        },
      };
      const result = await shipedOrderCollections.insertOne(shipedOrder);
      const updatedOrder = await ordersCollections.updateOne(filter, updateDoc);
      res.send(updatedOrder);
    });
    //
    //
    //Unpaid order Delete by user
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const orderDeleted = await ordersCollections.deleteOne(query);
      res.send(orderDeleted);
    });
    //
    //
    //Get Order For Admin
    app.get("/orderadmin", verifyJWT, async (req, res) => {
      const result = await ordersCollections.find().toArray();
      res.send(result);
    });
    //
    //
    // Update or Insert a neW User
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollections.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    //Make Admin
    app.put("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      //Requster who request make admin
      const requester = req.decoded.email;
      const resuedterAccount = await usersCollections.findOne({
        email: requester,
      });
      if (resuedterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await usersCollections.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });

    //Verify Admin
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollections.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    //Get All Users
    app.get("/users", verifyJWT, async (req, res) => {
      const resutl = await usersCollections.find().toArray();
      res.send(resutl);
    });
    //
    //
    //admin useer info
    app.get("/adminrole", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const resutl = await usersCollections.findOne(query);
      res.send(resutl);
    });
    //
    //
    //Add Reviews By User
    app.post("/review", verifyJWT, async (req, res) => {
      const review = req.body;
      const result = await reviewsCollections.insertOne(review);
      res.send(result);
    });
    //
    //
    //Get Review in home patge
    app.get("/review", async (req, res) => {
      const result = await reviewsCollections.find().toArray();
      res.send(result);
    });

    //end of try method
  } finally {
  }
}

run().catch(console.dir);

// golab call
app.get("/", (req, res) => {
  res.send("Hello This is from server. of manufactur");
});

app.listen(port, () => {
  console.log("Manufacture server is runnit this port", port);
});
