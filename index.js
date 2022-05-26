const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const res = require("express/lib/response");
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

    //Add Goods By Admin
    app.post("/goods", verifyJWT, async (req, res) => {
      const goods = req.body;
      console.log(goods);
      const result = await goodsCollections.insertOne(goods);
      res.send(result);
    });

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
    //Product Delete
    app.delete("/goods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const productDeleted = await goodsCollections.deleteOne(query);
      res.send(productDeleted);
    });

    //Save the order in database
    app.post("/orders", async (req, res) => {
      const orders = req.body;
      console.log(orders);
      const result = await ordersCollections.insertOne(orders);
      res.send({ success: true, result });
    });

    //Get order per user
    app.get("/orders", verifyJWT, async (req, res) => {
      const customerEmail = req.query.customerEmail;
      const decodedEmail = req.decoded.email;
      // console.log(decodedEmail);
      if (customerEmail === decodedEmail) {
        const query = { customerEmail: customerEmail };
        const resulte = await ordersCollections.find(query).toArray();
        return res.send(resulte);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });
    //Get Order For Admin
    app.get("/orderadmin", verifyJWT, async (req, res) => {
      const result = await ordersCollections.find().toArray();
      res.send(result);
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
