require('dotenv').config();
const jwt = require('jsonwebtoken');

const secretKey = process.env.JWT; // Replace with your secret key

// Function to verify JWT
const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        resolve(null) // Reject the promise if verification fails
      } else {
        resolve(decoded); // Resolve with decoded payload if valid
      }
    });
  });
};

module.exports = { verifyToken };