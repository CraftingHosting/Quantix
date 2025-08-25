const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwelcomechannel')
    .setDescription('Sets the channel for greeting messages')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel for greetings')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;
    if (!channel || channel.type !== ChannelType.GuildText) {
      return interaction.reply({ content: 'Please select a text channel!', ephemeral: true });
    }
    await GuildConfig.findOneAndUpdate(
      { guildId },
      { welcomeChannelId: channel.id },
      { upsert: true, new: true }
    );
    await interaction.reply({ content: `Welcome channel set: ${channel}`, ephemeral: true });
  },
};
