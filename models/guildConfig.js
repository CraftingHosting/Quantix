const mongoose = require('mongoose');
const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  welcomeChannelId: { type: String, default: null },
  welcomeEmbedTitle: {
    type: String,
    default: 'Welcome to {guildname}!',
  },
  welcomeEmbedDescription: {
    type: String,
    default: '👋 Welcome {user}, great to have you here! 🎉',
  },
  welcomeEmbedColor: {
    type: String,
    default: '#00b0f4',
  },
  language: {
    type: String,
    enum: ['de', 'en'],
    default: 'en',
  },
});
module.exports = mongoose.model('GuildConfig', guildConfigSchema);
