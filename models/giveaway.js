const mongoose = require('mongoose');
const giveawaySchema = new mongoose.Schema({
  giveawayId: {
    type: String,
    required: true,
    unique: true
  },
  messageId: {
    type: String,
    required: true
  },
  channelId: {
    type: String,
    required: true
  },
  guildId: {
    type: String,
    required: true
  },
  hostedBy: {
    type: String,
    required: true
  },
  prize: {
    type: String,
    required: true
  },
  winners: {
    type: Number,
    required: true
  },
  endsAt: {
    type: Date,
    required: true
  },
  entrants: {
    type: [String],
    default: []
  },
  ended: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Giveaway', giveawaySchema);
