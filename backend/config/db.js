const mongoose = require('mongoose');

const connectDB = async (uri) => {
  try {
    return await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (err) {
    console.error('Error conectando a MongoDB', err);
    throw err;
  }
};

module.exports = connectDB;
