const { PermissionsBitField, EmbedBuilder, ChannelType } = require('discord.js');
const TicketConfig = require('../models/ticketConfig');
async function handleTicketSelect(interaction) {
  try {
    if (interaction.customId !== 'ticket_category_select') return;

    const { guild, user, values } = interaction;
    if (!guild) {
      return interaction.reply({
        content: '❌ This action must be used in a server.',
        ephemeral: true
      });
    }

    const selected = values[0];
    const guildId = guild.id;
    const config = await TicketConfig.findOne({ guildId });
    if (!config) {
      return interaction.reply({
        content: '⚠️ Ticket system is not configured. Please run `/ticket-setup` first.',
        ephemeral: true
      });
    }
    if (!config.ticketCategoryId) {
      return interaction.reply({
        content: '⚠️ Ticket category is not configured. Please run `/ticket-setup`.',
        ephemeral: true
      });
    }
    const openTicketCount = guild.channels.cache.filter(ch =>
      ch.parentId === config.ticketCategoryId &&
      (ch.name.includes(user.id) || (ch.topic && ch.topic.includes(user.id)))
    ).size;

    const maxTickets = config.maxTicketsPerUser ?? 3;
    if (openTicketCount >= maxTickets) {
      return interaction.reply({
        content: `❌ You already have ${openTicketCount} open ticket(s). Limit: ${maxTickets}.`,
        ephemeral: true
      });
    }

    const updatedConfig = await TicketConfig.findOneAndUpdate(
      { guildId },
      { $inc: { ticketCounter: 1 } },
      { new: true }
    );
    
    const ticketNumber = updatedConfig.ticketCounter ?? 1;
    const paddedNumber = String(ticketNumber).padStart(3, '0');
    const safeUsername = user.username
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '')
      .slice(0, 16) || user.id;
    const categoryName = selected.toLowerCase();
    const channelName = `${paddedNumber}-${categoryName}-${safeUsername}`;
    const overwrites = [
      {
        id: guild.roles.everyone.id,
        denied: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: user.id,
        allowed: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      },
      {
        id: interaction.client.user.id,
        allowed: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      }
    ];
    if (config.supportRoleId) {
      overwrites.push({
        id: config.supportRoleId,
        allowed: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: config.ticketCategoryId,
      permissionOverwrites: overwrites,
      topic: `Ticket ${paddedNumber} — ${categoryName} — created by ${user.tag} (${user.id})`
    });

    const welcomeMessage = (config.welcomeMessage || 'Hello {user}, thank you for creating a ticket!')
      .replace(/{user}/g, `<@${user.id}>`);
    const mentionSupport = config.supportRoleId ? ` <@&${config.supportRoleId}>` : '';
    await ticketChannel.send({ content: `${welcomeMessage}${mentionSupport}` });
    if (config.logChannelId) {
      const logChannel = await guild.channels.fetch(config.logChannelId).catch(() => null);
      if (logChannel?.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle('📩 Ticket Created')
          .addFields(
            { name: 'Ticket', value: `${ticketChannel}`, inline: true },
            { name: 'Creator', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'Category', value: `${categoryName}`, inline: true },
            { name: 'Ticket Number', value: `${paddedNumber}`, inline: true }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
    }
    await interaction.reply({
      content: `✅ Ticket created: ${ticketChannel}`,
      ephemeral: true
    });
    }
    catch (err) {
    console.error(`[TicketSelect] Error:`, err);
    if (!interaction.replied) {
      await interaction.reply({
        content: '❌ An error occurred while creating the ticket. Please contact staff.',
        ephemeral: true
      }).catch(() => {});
    }
  }
}

module.exports = { handleTicketSelect };
