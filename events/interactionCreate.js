const { Events } = require('discord.js');
const giveawayUtils = require('../utils/giveawayUtils');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        try {
          await command.execute(interaction);
        } catch (error) {
          console.error('Error while executing command:', error);
          await interaction.reply({ content: 'An error occurred while executing this command.', ephemeral: true });
        }
      }
      if (interaction.isButton()) {
        const { customId } = interaction;
        if (customId.startsWith('giveaway_enter_')) {
          const giveawayId = customId.replace('giveaway_enter_', '');
          return giveawayUtils.handleEntry(interaction, giveawayId);
        }
        if (customId.startsWith('giveaway_odds_')) {
          const giveawayId = customId.replace('giveaway_odds_', '');
          return giveawayUtils.showOdds(interaction, giveawayId);
        }
        if (customId.startsWith('giveaway_show_')) {
          const giveawayId = customId.replace('giveaway_show_', '');
          return giveawayUtils.showEntrants(interaction, giveawayId);
        }
      }
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticketSelect') {
          const handler = interaction.client.handlers?.get('ticketSelect');
          if (!handler) {
            console.error('ticketSelect handler not found');
            return interaction.reply({ content: 'Ticket handler not found.', ephemeral: true });
          }
          return handler(interaction);
        }
      }
    } catch (err) {
      console.error('Unexpected interaction error:', err);
    }
  },
};
