const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
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
async function run() {
  try {
    await client.connect();
    const goodsCollections = client.db("manufacture").collection("services");
    const ordersCollections = client.db("manufacture").collection("orders");

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
    app.get("/orders", async (req, res) => {
      const customerEmail = req.query.customerEmail;
      const query = { customerEmail: customerEmail };
      const resulte = await ordersCollections.find(query).toArray();
      res.send(resulte);
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
