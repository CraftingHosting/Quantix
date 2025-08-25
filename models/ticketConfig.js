const mongoose = require('mongoose');
const ticketConfigSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  ticketCategoryId: {
    type: String,
    default: null
  },
  supportRoleId: {
    type: String,
    default: null
  },
  logChannelId: {
    type: String,
    default: null
  },
  welcomeMessage: {
    type: String,
    default: 'Hello {user}, thank you for creating a ticket! A staff member will be with you shortly.'
  },
  maxTicketsPerUser: {
    type: Number,
    default: 3,
    min: 1
  },
  panelChannelId: {
    type: String,
    default: null
  },
  panelMessageId: {
    type: String,
    default: null
  },
  ticketCounter: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
ticketConfigSchema.statics.findByGuildId = function (guildId) {
  return this.findOne({ guildId });
};

module.exports = mongoose.model('TicketConfig', ticketConfigSchema);
