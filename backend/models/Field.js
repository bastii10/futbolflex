const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  surfaceType: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  availableHours: [{
    start: String,
    end: String
  }],
  image: String,
  location: String
});

module.exports = mongoose.model('Field', fieldSchema);
