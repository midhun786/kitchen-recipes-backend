const express = require("express");
const cors = require("cors");
const app = express();
const mongodb = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
var nodemailer = require("nodemailer");
var randomstring = require("randomstring");
const dotenv = require("dotenv").config();
const mongoClient = mongodb.MongoClient;
const URL = process.env.DB_URL
const DB = process.env.DB;

//middleware
app.use(express.json());
app.use(
  cors({
    origin: "https://loquacious-syrniki-bb9377.netlify.app",
  })
);


app.get("/", function (req, res) {
  res.send('<h1>Welcome to Bite my kitchen..</h1>')
});


let authenticate = (req, res, next) => {
  console.log(req.headers);
  if (req.headers.authorization) {
    try {
      let decode = jwt.verify(req.headers.authorization, process.env.SECRET);
      if (decode) {
        next();
      }
    } catch (error) {
      res.status(401).json({ message: "Unauthorized" });
    }
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
};

app.get("/allusers", authenticate, async function (req, res) {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let reUser = await db.collection("register").find().toArray();
    await connection.close();
    res.json(reUser);
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.post("/register", async function (req, res) {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);

    let salt = await bcrypt.genSalt(10);
    let hash = await bcrypt.hash(req.body.password, salt);

    req.body.password = hash;
    await db.collection("register").insertOne(req.body);

    await connection.close();

    res.json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.post("/login", async function (req, res) {
  try {
    let connection = await mongoClient.connect(URL);
    let db = connection.db(DB);

    let user = await db
      .collection("register")
      .findOne({ email: req.body.email });
    if (user) {
      let compare = await bcrypt.compare(req.body.password, user.password);
let name = user.name;
      if (compare) {
        let token = jwt.sign({ _id: user._id }, process.env.SECRET, {
          expiresIn: "10m",
        });
         res.json({ token,name,user});
        
      } else {
        res.json({ message: "email or Password is wrong" });
      }
    } else {
      res.status(401).json({ message: "User email or password wrong" });
    }
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});



app.post("/resetpassword", async function (req, res) {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    const user = await db
      .collection("register")
      .findOne({ email: req.body.email });
    if (user) {
      let mailid = req.body.email;
      let rString = randomstring.generate(7);
      let link = "https://loquacious-syrniki-bb9377.netlify.app/reset-password-page";
      await db
        .collection("register")
        .updateOne({ email: mailid }, { $set: { rString: rString } });
      await connection.close();

      var transporter = nodemailer.createTransport({
        service: "gmail",
       
        auth: {
          user:process.env.FROM,
          pass: process.env.PASSWORD,
        },
      });

      var mailOptions = {
        from: process.env.FROM,
        to: mailid,
        subject: "Password Reset",
        text: `Your Random text is ${rString}. Click the link to reset password ${link}`,
        html: `<h2> Your Random text is ${rString}. Click the link to reset password ${link}</h2>`,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
          res.json({
            message: "Email not send",
          });
        } else {
          console.log("Email sent: " + info.response);
          res.json({
            message: "Email Send",
          });
        }
      });
      res.json({
        message: "Email Send",
      });
    } else {
      res.json({
        message: "Email Id not match / User not found",
      });
    }
  } catch (error) {
    console.log(error);
  }
});

app.post("/reset-password-page", async function (req, res) {
  let mailid = req.body.email;
  let String = req.body.rString;
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(req.body.password, salt);
    req.body.password = hash;
    const user = await db
      .collection("register")
      .findOne({ email: req.body.email });
    if (user) {
      if (user.rString === req.body.rString) {
        await db
          .collection("register")
          .updateOne(
            { rString: String },
            { $set: { password: req.body.password } }
          );
        res.json({
          message: "Password reset done",
        });
      } else {
        res.json({
          message: "Random String is incorrect",
        });
      }
    } else {
      res.json({
        message: "Email Id not match / User not found",
      });
    }
    await db
      .collection("register")
      .updateOne({ rString: String }, { $unset: { rString: "" } });
  } catch (error) {
    console.log(error);
  }
});


app.post("/createrecipes", async function (req, res) {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    await db.collection("recipes").insertOne(req.body);
    await connection.close();
    res.json({ message: "Recipes added successfully" });
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.get("/allrecipes",async function (req, res) {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let reRecipes = await db.collection("recipes").find().toArray();
    await connection.close();
    res.json(reRecipes);
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});
app.get("/viewrecipe/:id", async function (req, res) {
  try {
    // step 1: Create a connection between NodeJS and MongoDB
    const connection = await mongoClient.connect(URL);
    // step 2: Select the DB
    const db = connection.db(DB);
    // step 3: Select the Collection
    // step 4: Do the Operation(Create,Update,Edit,Delete)
    let recipe = await db
      .collection("recipes")
      .findOne({ _id: mongodb.ObjectId(req.params.id) });
    // step 5: Close the Connection
    await connection.close();

    res.json(recipe);
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.put("/editrecipe/:id", async function (req, res) {
  try {
    // step 1: Create a connection between NodeJS and MongoDB
    const connection = await mongoClient.connect(URL);
    // step 2: Select the DB
    const db = connection.db(DB);
    // step 3: Select the Collection
    // step 4: Do the Operation(Create,Update,Edit,Delete)
    let user = await db
      .collection("recipes")
      .findOneAndUpdate(
        { _id: mongodb.ObjectId(req.params.id) },
        { $set: req.body }
      );
    // step 5: Close the Connection
    await connection.close();

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});


// app.listen(5000);
const PORT = (process.env.PORT || 5000);
app.listen(PORT, () => {
    console.log('Port is Running on ' + PORT);
});
