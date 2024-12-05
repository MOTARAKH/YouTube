const db = require("../../config/db"); // Adjust the path based on your project structure
//const db = require("../../config/pooling");
function insert(tableName, data) {
  return new Promise((resolve, reject) => {
    const coordinatesKey = "Coordinates";
    const locationKey = "Location";

    const filterKeys = (key) => key !== coordinatesKey && key !== locationKey;
    const columns = Object.keys(data).filter(filterKeys).join(",");
    const placeholders = Object.keys(data)
      .filter(filterKeys)
      .map(() => "?")
      .join(",");

    let query = "";

    if (Object.keys(data).includes(coordinatesKey)) {
      const coordinatesValue = `ST_GeomFromText('${data[coordinatesKey]}')`;
      query = `INSERT INTO ${tableName} (${columns}, ${coordinatesKey}) VALUES (${placeholders}, ${coordinatesValue})`;
    } else if (Object.keys(data).includes(locationKey)) {
      const locationValue = `ST_GeomFromText('${data[locationKey]}')`;
      query = `INSERT INTO ${tableName} (${columns}, ${locationKey}) VALUES (${placeholders}, ${locationValue})`;
    } else {
      query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
    }

    // console.log(`Query: ${query}`);
    // console.log(`Data: ${JSON.stringify(data)}`);
    const values = Object.values(data).map((value) => {
      // Convert ST_GeomFromText values to strings
      if (
        typeof value === "object" &&
        value !== null &&
        value.hasOwnProperty("toString")
      ) {
        return value.toString();
      }
      return value;
    });
    // console.log(query, Object.values(data));
    db.query(query, values, (err, result) => {
      if (err) {
        console.error(`Error inserting data into ${tableName}:`, err);
        reject(err);
      } else {
        console.log(`${tableName} record inserted successfully:`, result);
        resolve(result);
      }
    });
  });
}

// function insert(tableName, data) {
//     return new Promise((resolve, reject) => {

//       const columns = Object.keys(data).filter(key => key !== 'Coordinates' ).join(',');
//       const placeholders = Object.keys(data).filter(key => key !== 'Coordinates' ).map(() => '?').join(',');
//       let query = "";
//       // Manually concatenate ST_GeomFromText for Coordinates field
//       if ( Object.keys(data).includes('Coordinates') ){
//
//         const coordinatesValue = `ST_GeomFromText('${data.Coordinates}')`;
//          query = `INSERT INTO ${tableName} (${columns}, Coordinates) VALUES (${placeholders}, ${coordinatesValue})`;

//       } else
//        {
//          query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
//       }

//       // const columns = Object.keys(data).join(',');
//       // const placeholders = Object.keys(data).map(() => '?').join(',');

//       db.query(query, Object.values(data), (err, result) => {
//         if (err) {
//           console.error(`Error inserting data into ${tableName}:`, err);
//           reject(err);
//         } else {
//           console.log(`${tableName} record inserted successfully:`, result);
//           resolve(result);
//         }
//       });
//     });
//   }

// Function to generate a basic SELECT SQL query
function selectAll(tableName) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM ${tableName}`;

    db.query(query, (err, rows) => {
      if (err) {
        console.error(`Error selecting data from ${tableName}:`, err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function deleteItem(tableName, nameId, itemId) {
  return new Promise((resolve, reject) => {
    if (!itemId) {
      reject(new Error(`${tableName} ID is required`));
      return;
    }

    // Check if item exists (CORRECTED SELECT query)
    const checkQuery = `SELECT 1 FROM ${tableName} WHERE ${nameId} = ?`;
    db.query(checkQuery, [itemId], (checkErr, checkResult) => {
      if (checkErr) {
        console.error(`Error checking item existence :`, checkErr);
        reject(checkErr);
        return;
      }

      if (checkResult.length === 0) {
        reject(new Error(`${tableName} with ID ${itemId} not found`));
        return;
      }

      // Proceed with deletion
      const deleteQuery = `DELETE FROM ${tableName} WHERE ${nameId} = ?`;
      db.query(deleteQuery, [itemId], (deleteErr, deleteResult) => {
        if (deleteErr) {
          console.error(`Error deleting item from ${tableName}:`, deleteErr);
          reject(deleteErr);
        } else {
          console.log(
            `Item with ID ${itemId} deleted from ${tableName}:`,
            deleteResult
          );
          resolve(deleteResult);
        }
      });
    });
  });
}

function updateItem(tableName, nameId, idValue, data) {
  return new Promise((resolve, reject) => {
    // Check if the record with the specified ID exists
    const checkQuery = `SELECT * FROM ${tableName} WHERE ${nameId} = ?`;
    db.query(checkQuery, [idValue], (checkErr, checkResult) => {
      if (checkErr) {
        console.error(
          `Error checking existence of record in ${tableName}:`,
          checkErr
        );
        reject(checkErr);
        return;
      }

      if (checkResult.length === 0) {
        console.log(
          `Record with ${nameId}=${idValue} does not exist in ${tableName}. Update aborted.`
        );
        resolve(null);
        return;
      }

      // Record exists, proceed with the update

      const coordinatesKey = "Coordinates";
      const locationKey = "Location";
      let updateQuery = "";
      const filterKeys = (key) => key !== coordinatesKey && key !== locationKey;
      const updateColumns = Object.keys(data)
        .filter(filterKeys)
        .map((column) => `${column} = ?`)
        .join(",");

      const values = Object.values(data);
      values.push(idValue);

      if (Object.keys(data).includes(coordinatesKey)) {
        const coordinatesValue = `ST_GeomFromText(?)`;
        if (
          Object.keys(data).length === 1 &&
          Object.keys(data)[0] === coordinatesKey
        ) {
          updateQuery = `UPDATE ${tableName} SET ${coordinatesKey} = ${coordinatesValue} WHERE ${nameId} = ?`;
        } else {
          updateQuery = `UPDATE ${tableName} SET ${updateColumns}, ${coordinatesKey} = ${coordinatesValue} WHERE ${nameId} = ?`;
        }
        // console.log(`Update Query: ${updateQuery}`);
        //console.log(`Update Data: ${JSON.stringify(data)}`);
      } else if (Object.keys(data).includes(locationKey)) {
        const locationValue = `ST_GeomFromText(?)`;
        if (
          Object.keys(data).length === 1 &&
          Object.keys(data)[0] === locationKey
        ) {
          // Only the Location field is being updated
          updateQuery = `UPDATE ${tableName} SET ${locationKey} = ${locationValue} WHERE ${nameId} = ?`;
        } else {
          updateQuery = `UPDATE ${tableName} SET ${updateColumns}, ${locationKey} = ${locationValue} WHERE ${nameId} = ?`;
        }
      } else {
        updateQuery = `UPDATE ${tableName} SET ${updateColumns} WHERE ${nameId} = ?`;
      }

      db.query(updateQuery, values, (updateErr, updateResult) => {
        if (updateErr) {
          console.error(`Error updating data in ${tableName}:`, updateErr);
          console.error("Update Query:", updateQuery);
          console.error("Update Values:", values);
          reject(updateErr);
        } else {
          console.log(
            `${tableName} record updated successfully:`,
            updateResult
          );
          resolve(updateResult);
        }
      });
    });
  });
}

function findIdIfExists(tableName, nameId, id) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM ${tableName} WHERE ${nameId} = ?`;

    db.query(query, [id], (err, results) => {
      if (err) {
        console.error(`Error querying ${tableName} for ${nameId} ${id}:`, err);
        reject(err);
      } else {
        // If results array is not empty, the ID exists
        const idExists = results.length > 0;
        resolve(idExists);
      }
    });
  });
}
//
function SelectItemById(tableName, nameId, id) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM ${tableName} WHERE ${nameId} = ?`;

    db.query(query, [id], (err, results) => {
      if (err) {
        console.error(`Error querying ${tableName} for ${nameId} ${id}:`, err);
        reject(err);
      } else {
        // If results array is not empty, the ID exists
        if (results.length > 0) {
          resolve(results);
        }
      }
    });
  });
}


function isAnyDataInvalid(data) {
  const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
  const dateRegex = /^\d{4}\/(0[1-9]|1[0-2])\/(0[1-9]|[1-2][0-9]|3[0-1])$/;

  for (const key in data) {
    if (key !== "updateDate") {
      if (
        data[key] === "" ||
        /^\s*$/.test(data[key]) ||
        scriptRegex.test(data[key]) ||
        data[key] === null
      ) {
        return false; // Non-date property is empty, contains spaces, is a script, or is null
      }
    }
  }
  // if(data.updateDate){
  // if ("updateDate" in data && !dateRegex.test(data.updateDate)) {
  //   return false; // Date format is invalid
  // }

  // }

  return true; // No non-'updateDate' property is invalid
}

function validateDataTypes(data, expectedDataTypes) {
  for (const key in expectedDataTypes) {
    if (Object.prototype.hasOwnProperty.call(expectedDataTypes, key)) {
      const expectedType = expectedDataTypes[key];
      const value = data[key];

      if (value !== undefined && value !== null) {
        if (expectedType === "date" && !isValidDate(value)) {
          console.log(`Invalid ${key}: "${value}"`);
          return false;
        } else if (expectedType === "date" && typeof value !== "string") {
          // If the expected type is 'date', ensure the value is a string
          return false;
        } else if (typeof value !== expectedType) {
          return false;
        }
      }
    }
  }
  return true;
}
function isValidDate(dateString) {
  // Regex to check the date format (YYYY/MM/DD)
  const dateRegex = /^\d{4}\/(0[1-9]|1[0-2])\/(0[1-9]|[1-2][0-9]|3[0-1])$/;

  return dateRegex.test(dateString);
}

// Function to check for unexpected fields
function checkUnexpectedFields(params, requiredFields) {
  // Use Object.keys to get an array of field names in params
  const unexpectedFields = Object.keys(params)
    // Filter out fields that are in the requiredFields list
    .filter((field) => !requiredFields.includes(field));

  // If unexpectedFields has elements, return the array; otherwise, return null
  return unexpectedFields.length > 0 ? unexpectedFields : null;
}

function autoGenerateIDs(tableName, fieldName, nameId) {
  return new Promise((resolve, reject) => {
    const query = `SELECT MAX(${fieldName}) FROM ${tableName}`;

    // Perform the database query
    db.query(query, (err, result) => {
      if (err) {
        console.error(`Error selecting data from ${tableName}:`, err);
        reject(err);
        return;
      }

      // Check if result is an array and has at least one item
      if (!Array.isArray(result) || result.length === 0) {
        const errorMessage = `Invalid result format from ${tableName} query`;
        console.error(errorMessage);
        reject(new Error(errorMessage));
        return;
      }

      const maxUserId = result[0][`MAX(${fieldName})`];
      console.log(maxUserId);
      if (maxUserId === null) {
        // If the maximum value is null, set the newID to 1
        const newID = 1;
        const finalId = `${nameId}${newID}`.toString();
        resolve(finalId);
      } else {
        // Calculate the new ID after the query is complete
        const currentNumericPart = parseInt(maxUserId, 10); //.split('_')[1]
        console.log(currentNumericPart);
        const newID = currentNumericPart + 1;
        console.log(newID);
        // const finalId = `${newID}`.toString();
        // const finalId = `${currentNumericPart}${newID}`.toString();
        const finalId = `${nameId}${newID.toString()}`;

        console.log(finalId);
        // Resolve the promise with the final ID
        resolve(finalId);
      }
    });
  });
}

async function loginJWT(
  tableName,
  nameId,
  id,
  pswd,
  data,
  expectedDataTypes,
  accessTokenSecret,
  expiry
) {
  const validDTypes = validateDataTypes(data, expectedDataTypes);
  const validData = isAnyDataInvalid(data);

  if (validDTypes) {
    if (validData) {
      const userExist = await findIdIfExists(tableName, nameid, id);
      if (userExist) {
        const user = userExist[0];
        // Compare the entered password with the hashed password in the database
        bcrypt.compare(password, user.pswd, (bcryptErr, bcryptResult) => {
          if (bcryptErr) {
            console.error("Error comparing passwords:", bcryptErr);
            res.sendStatus(500);
            return;
          }

          if (bcryptResult) {
            // Generate an access token
            const accessToken = jwt.sign(
              { id: user.nameId },
              accessTokenSecret,
              { expiresIn: expiry }
            );

            res.json({
              accessToken,
            });
            console.log("Successful login attempt for user:", user.nameId);
          } else {
            // Passwords do not match
            res.send("Password incorrect");
          }
        });
      }
    } else {
      // Data validation failed
      res
        .status(415)
        .send("The data types provided does not meet the required standard");
    }
  } else {
    res
      .status(415)
      .send("The data types provided does not meet the required standard");
  }
}

module.exports = {
  insert,
  selectAll,
  deleteItem,
  updateItem,
  findIdIfExists,
  SelectItemById,
  isAnyDataInvalid,
  validateDataTypes,
  checkUnexpectedFields,
  autoGenerateIDs
 
};
