const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlanguage')
    .setDescription('Sets the language for welcome messages')
    .addStringOption(option =>
      option
        .setName('language')
        .setDescription('Choose the language')
        .setRequired(true)
        .addChoices(
          { name: 'German', value: 'de' },
          { name: 'English', value: 'en' },
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const selectedLanguage = interaction.options.getString('language');
    const guildId = interaction.guild.id;

    try {
      await GuildConfig.findOneAndUpdate(
        { guildId },
        { language: selectedLanguage },
        { upsert: true, new: true }
      );

      const confirmationMessage = selectedLanguage === 'de'
        ? 'Sprache wurde auf Deutsch gesetzt.'
        : 'Language has been set to English.';

      await interaction.reply({
        content: confirmationMessage,
        ephemeral: true,
      });
    } catch (error) {
      console.error('Error setting the language:', error);
      await interaction.reply({
        content: 'Error setting the language.',
        ephemeral: true,
      });
    }
  },
};
