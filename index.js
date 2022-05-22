const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
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
client.connect((err) => {
  const collection = client.db("test").collection("devices");
  console.log("mongo db connect succe");
  // perform actions on the collection object
  client.close();
});

// golab call
app.get("/", (req, res) => {
  res.send("Hello This is from server. of manufactur");
});

app.listen(port, () => {
  console.log("Manufacture server is runnit this port", port);
});
