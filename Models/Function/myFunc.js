const bcrypt = require('bcrypt');
//     // const hashedPass = bcrypt.hashSync(data.clientpass ,saltRounds)
//     // const hashedPass1 = bcrypt.hashSync(data.clientpass ,salt)
//     const hashedPass2 = bcrypt.hashSync(data.clientpass ,salt2)
//     // console.log(hashedPass);
//     // console.log(hashedPass1);
    //console.log(hashedPass2);
        // const salt =await bcrypt.genSalt(saltRounds);
// const salt2 = bcrypt.genSaltSync(saltRounds);
// // console.log (salt);
// // console.log(salt2);
//await sharp(req.file.buffer).resize({width: 250, height: 250}).png().toBuffer()
function checkImageSize(imageBuffer, maxSizeInKB) {
  const imageSizeInBytes = imageBuffer.length;
  const maxSizeInBytes = maxSizeInKB * 1024;

  return imageSizeInBytes <= maxSizeInBytes;
}
function validateUser(hash,password) {
    bcrypt
      .compare(password, hash)
      .then(res => {
        console.log(res) // return true
      })
      .catch(err => console.error(err.message))        
};



const crypto = require('crypto');


// // Generate a random key for encryption and decryption
const secretKey = crypto.randomBytes(32); // You might want to store this securely

// // Function to encrypt data using AES
function encryptData(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
  let encryptedData = cipher.update(data, 'utf-8', 'hex');
  encryptedData += cipher.final('hex');
  return { iv: iv.toString('hex'), encryptedData ,secretKey};
}


// // Example of how to use the encryption function
// const dataToEncrypt = 'Your API response data';
// const encryptedResult = encryptData(dataToEncrypt);

// // Send `encryptedResult` to the mobile app
// console.log('Encrypted Result:', encryptedResult);


// //const crypto = require('crypto');

// // The secretKey should be securely stored on the mobile app
// //const secretKey = 'yourSecretKey'; // Replace with the actual secret key

// // Function to decrypt data using AES
function decryptData(encryptedData, iv) {

  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey), Buffer.from(iv, 'hex'));
  let decryptedData = decipher.update(encryptedData, 'hex', 'utf-8');
  decryptedData += decipher.final('utf-8');
  return decryptedData;
}
module.exports={encryptData,decryptData,validateUser,checkImageSize};

// // Example of how to use the decryption function
// const receivedData = { iv: '...', encryptedData: '...' }; // Replace with the actual received data
// const decryptedResult = decryptData(receivedData.encryptedData, receivedData.iv);

// console.log('Decrypted Result:', decryptedResult);
