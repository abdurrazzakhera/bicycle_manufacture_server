const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
async function run() {
  try {
    await client.connect();
    // All Collection
    const goodsCollections = client.db("manufacture").collection("services");
    const ordersCollections = client.db("manufacture").collection("orders");
    const usersCollections = client.db("manufacture").collection("users");

    // * MongoDb User Collection
    app.get("/goods", async (req, res) => {
      const result = await goodsCollections.find().toArray();
      res.send(result);
    });
    //Call Single product from the database
    app.get("/goods/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: ObjectId(id) };
      const productDetails = await goodsCollections.findOne(query);
      res.send(productDetails);
    });
    //Save the order in database
    app.post("/orders", async (req, res) => {
      const orders = req.body;
      console.log(orders);
      const result = await ordersCollections.insertOne(orders);
      res.send({ success: true, result });
    });

    //Get per user order
    app.get("/orders", verifyJWT, async (req, res) => {
      const customerEmail = req.query.customerEmail;
      const decodedEmail = req.decoded.email;
      console.log(decodedEmail);
      if (customerEmail === decodedEmail) {
        const query = { customerEmail: customerEmail };
        const resulte = await ordersCollections.find(query).toArray();
        return res.send(resulte);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });

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
