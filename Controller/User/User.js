const express = require("express");
const router = express.Router();
const moment = require("moment");
const now = moment().format("YYYY-MM-DD HH:mm:ss");
const {
  insert,
  selectAll,
  deleteItem,
  updateItem,
  findIdIfExists,
  SelectItemById,
  validateDataTypes,
  checkUnexpectedFields,
  isAnyDataInvalid,
} = require("../../Models/Function/function");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const rateLimit = require("express-rate-limit");
const saltRounds = 13;

router.post("/createUser", async (req, res) => {
  try {
    const {
      Username,
      Userpass,
     
      ...extraParams
    } = req.body;
    if (isAnyDataInvalid(req.body)) {
      console.log("All properties are True.");
    } else {
      console.log("At least  one or more property has error input.");
      return res
        .status(400)
        .json({ error: " At least one or more property has error input" });
    }
    if (!Username  || !Userpass ) {
      return res
        .status(400)
        .json({ error: "All fields are required in the request body" });
    }
    if (Object.keys(extraParams).length > 0) {
      return res
        .status(400)
        .json({ error: "Unexpected parameters in the JSON data." });
    }
    const requiredField = [
      "Username",
      "Userpass"
      
    ];
    const CheckFields = checkUnexpectedFields(req.body, requiredField);
    if (Array.isArray(CheckFields) && CheckFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `unexpected field ${CheckFields} found`,
      });
    }
    if (!isAnyDataInvalid(req.body)) {
      console.log("At least one or more property has error input.");
      return res
        .status(400)
        .json({ error: "At least one or more property has error input" });
    }
    const expectedDataTypes = {
      Username: "string",
      Userpass: "string"
     
     
    };

    const isValidData = validateDataTypes(req.body, expectedDataTypes);

    if (!isValidData) {
      return res.status(400).json({ error: "Invalid data types" });
    }
    const tableName = "users";
   

    const isUserExist = await findIdIfExists(tableName, "Username", Username);
    if (isUserExist) {
      return res.status(409).json({ error: "Username already exists!" });
    }
    const now = moment().format("YYYY-MM-DD HH:mm:ss");

    const data = {
      Username,
      Password: bcrypt.hashSync(Userpass, saltRounds)
    };

    const result = await insert(tableName, data);
    if (result) {
      res.status(200).json({ message: "User inserted successfully." });
    } else {
      res.status(500).json({ message: "User not inserted ." });
    }
  } catch (error) {
    console.error(`Error inserting data into Users: ${error}`);
    res.status(500).json({ error: "Internal server error" });
  }
});


//limits the number of unsuccessful login tries
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many login attempts from this IP, please try again later.",
});
//login and auth api with JWT
const accessTokenSecret = "jq1SWp2n6qMmxpvOtapEmkVqX9m7T9CtPekwEd4f3V7mSu29e3";

router.post("/users/userlogin", async (req, res) => {
  try {
    console.log(req.body);
    const { username, password, ...extraParams } = req.body;
    const tblname = "users";

    if (Object.keys(extraParams).length > 0) {
      return res
        .status(400)
        .json({ error: "Unexpected parameters in the JSON data." });
    }

    if (!isAnyDataInvalid(req.body)) {
      return res
        .status(400)
        .json({ error: "At least one or more property has error input" });
    }

    const data = { username, password };
    const expectedDataTypes = { username: "string", password: "string" };

    if (!validateDataTypes(data, expectedDataTypes)) {
      return res
        .status(415)
        .json({
          error: "The data types provided do not meet the required standard",
        });
    }

    const isUseridExist = await findIdIfExists(tblname, "Username", username);
    if (!isUseridExist) {
      return res.status(409).json({ error: "User not found!" });
    }

    const userExist = await SelectItemById(tblname, "Username", username);
    if (userExist) {
      const user = userExist[0];

      bcrypt.compare(password, user.Password, (bcryptErr, bcryptResult) => {
        if (bcryptErr) {
          console.error("Error comparing passwords:", bcryptErr);
          res.sendStatus(500);
          return;
        }
        if (bcryptResult) {
          const accessToken = jwt.sign(
            { UserID: user.UserID, Username: user.Username },
            accessTokenSecret,
            { expiresIn: "8h" }
          );

          res.status(200).json({ accessToken });
        } else {
          res.status(401).json({ error: "Password incorrect" });
        }
      });
    } else {
      res.status(404).json({ error: "Username incorrect" });
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
