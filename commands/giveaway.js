const { SlashCommandBuilder } = require('discord.js');
const giveawayUtils = require('../utils/giveawayUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a giveaway')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Target channel').setRequired(true))
        .addStringOption(opt =>
          opt.setName('duration').setDescription('Time (e.g. 1h, 30m)').setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('winners').setDescription('Number of winners').setRequired(true))
        .addStringOption(opt =>
          opt.setName('prize').setDescription('Prize').setRequired(true))
        .addUserOption(opt =>
          opt.setName('hostedby').setDescription('Host (optional)')))
    .addSubcommand(sub =>
      sub.setName('end')
        .setDescription('End a giveaway')
        .addStringOption(opt =>
          opt.setName('giveaway_id').setDescription('Giveaway Message ID').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('reroll')
        .setDescription('Reroll a giveaway')
        .addStringOption(opt =>
          opt.setName('giveaway_id').setDescription('Giveaway Message ID').setRequired(true))
        .addUserOption(opt =>
          opt.setName('user').setDescription('New winner').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
      const channel = interaction.options.getChannel('channel');
      const durationInput = interaction.options.getString('duration');
      const winners = interaction.options.getInteger('winners');
      const prize = interaction.options.getString('prize');
      const hostedBy = interaction.options.getUser('hostedby')?.id || interaction.user.id;

      const ms = require('ms');
      const duration = ms(durationInput);
      if (!duration) return interaction.reply({ content: 'Invalid duration format.', ephemeral: true });

      const msg = await giveawayUtils.createGiveaway({
        interaction,
        channel,
        duration,
        winners,
        prize,
        hostedBy
      });

      return interaction.reply({ content: `Giveaway started in ${channel} with ID: \`${msg.id}\``, ephemeral: true });
    }

    if (subcommand === 'end') {
      const giveawayId = interaction.options.getString('giveaway_id');
      const response = await giveawayUtils.endGiveaway(giveawayId, interaction.guild.id);
      return interaction.reply(response);
    }

    if (subcommand === 'reroll') {
      const giveawayId = interaction.options.getString('giveaway_id');
      const newUser = interaction.options.getUser('user');
      const response = await giveawayUtils.rerollGiveaway(giveawayId, newUser.id, interaction.guild.id);
      return interaction.reply(response);
    }
  }
};
