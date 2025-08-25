const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType
} = require('discord.js');

const TicketConfig = require('../models/ticketConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-set-panel')
    .setDescription('Create a ticket panel (embed + select menu) in this channel or a specified channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt =>
      opt.setName('title')
        .setDescription('Embed title (e.g., "Create a Ticket")')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('description')
        .setDescription('Embed description (e.g., "Select a category to create a support ticket.")')
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Optional: channel to post the panel into. Default: current channel.')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    ),

  async execute(interaction) {
    try {
      const { guild, channel, options, member } = interaction;
      if (!guild) {
        return interaction.reply({ content: 'This command can only be used in a server (guild).', ephemeral: true });
      }
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: 'You need the **Manage Server** permission to run this command.', ephemeral: true });
      }

      const title = options.getString('title', true).trim();
      const description = options.getString('description', true).trim();
      const targetChannel = options.getChannel('channel') ?? channel;
      if (targetChannel.guildId !== guild.id) {
        return interaction.reply({ content: 'The target channel must belong to this server.', ephemeral: true });
      }
      if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(targetChannel.type)) {
        return interaction.reply({ content: 'Please choose a text/announcement channel to post the panel.', ephemeral: true });
      }

      const panelEmbed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: 'Quantix Ticket' })
        .setColor(0x2F3136) // a neutral dark color

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_category_select')
        .setPlaceholder('Choose a ticket category...')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions([
          new StringSelectMenuOptionBuilder()
            .setLabel('General Support')
            .setValue('general')
            .setDescription('For general inquiries.'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Player Report')
            .setValue('report')
            .setDescription('Report a user or issue.'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Bug Report')
            .setValue('bug')
            .setDescription('Report a bug in the system.')
        ]);

      const row = new ActionRowBuilder().addComponents(selectMenu);
      const sentMessage = await targetChannel.send({ embeds: [panelEmbed], components: [row] });
      const guildId = guild.id;
      const update = {
        panelChannelId: targetChannel.id,
        panelMessageId: sentMessage.id
      };

      const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
      const updatedConfig = await TicketConfig.findOneAndUpdate(
        { guildId },
        { $set: update },
        opts
      );
      
      const responseEmbed = new EmbedBuilder()
        .setTitle('Ticket Panel Posted')
        .setColor(0x00AE86)
        .setDescription(`Ticket panel successfully posted in ${targetChannel.toString()}.`)
        .addFields(
          { name: 'Panel Channel', value: `<#${updatedConfig.panelChannelId}>`, inline: true },
          { name: 'Panel Message ID', value: `${updatedConfig.panelMessageId}`, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [responseEmbed], ephemeral: true });

    } catch (err) {
      console.error('Error in /ticket-set-panel:', err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'An error occurred while setting the ticket panel. Check logs.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'An error occurred while setting the ticket panel. Check logs.', ephemeral: true });
      }
    }
  }
};
