const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ChannelType 
} = require('discord.js');

const TicketConfig = require('../models/ticketConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Configure the ticket system for this server (guild).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('set')
        .setDescription('Set or update ticket configuration for this guild.')
        .addChannelOption(opt => 
          opt.setName('category')
            .setDescription('Category where ticket channels will be created (category channel).')
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildCategory)
        )
        .addRoleOption(opt =>
          opt.setName('support_role')
            .setDescription('Role that has access to support tickets.')
            .setRequired(false)
        )
        .addChannelOption(opt =>
          opt.setName('log_channel')
            .setDescription('Channel where ticket logs will be posted.')
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addStringOption(opt =>
          opt.setName('welcome_message')
            .setDescription('Custom welcome message for new tickets. Use {user} to mention the ticket creator.')
            .setRequired(false)
        )
        .addIntegerOption(opt =>
          opt.setName('max_tickets_per_user')
            .setDescription('Maximum number of open tickets a user can have. Default: 3')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('Show current ticket configuration for this guild.')
    )
    .addSubcommand(sub =>
      sub
        .setName('reset')
        .setDescription('Reset (delete) the ticket configuration for this guild.')
    ),

  /**
   * Execute function called when interaction is received.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      const { guild, member, options } = interaction;
      if (!guild) {
        return interaction.reply({ content: 'This command can only be used in a server (guild).', ephemeral: true });
      }
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: 'You need the **Manage Server** (Manage Guild) permission to run this command.', ephemeral: true });
      }

      const sub = options.getSubcommand();

      if (sub === 'set') {
        const category = options.getChannel('category'); // may be null
        const supportRole = options.getRole('support_role'); // may be null
        const logChannel = options.getChannel('log_channel'); // may be null
        const welcomeMessage = options.getString('welcome_message')?.trim();
        const maxTicketsPerUser = options.getInteger('max_tickets_per_user');
        if (category && category.guildId !== guild.id) {
          return interaction.reply({ content: 'The chosen category must be from this server.', ephemeral: true });
        }
        if (logChannel && logChannel.guildId !== guild.id) {
          return interaction.reply({ content: 'The chosen log channel must be from this server.', ephemeral: true });
        }
        if (supportRole && supportRole.guild.id !== guild.id) {
          return interaction.reply({ content: 'The chosen role must be from this server.', ephemeral: true });
        }
        if (category && category.type !== ChannelType.GuildCategory) {
          return interaction.reply({ content: 'Please choose a valid category channel for the category option.', ephemeral: true });
        }
        if (logChannel && ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(logChannel.type)) {
          return interaction.reply({ content: 'Log channel must be a text channel (not a category or voice channel).', ephemeral: true });
        }

        const update = {};
        if (category) update.ticketCategoryId = category.id;
        if (supportRole) update.supportRoleId = supportRole.id;
        if (logChannel) update.logChannelId = logChannel.id;
        if (welcomeMessage) update.welcomeMessage = welcomeMessage;
        if (typeof maxTicketsPerUser === 'number') update.maxTicketsPerUser = maxTicketsPerUser;
        if (Object.keys(update).length === 0) {
          return interaction.reply({ content: 'You must provide at least one option to update (category, support_role, log_channel, welcome_message, max_tickets_per_user).', ephemeral: true });
        }

        const guildId = guild.id;
        const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
        const updatedConfig = await TicketConfig.findOneAndUpdate(
          { guildId },
          { $set: update },
          opts
        );

        const embed = new EmbedBuilder()
          .setTitle('Ticket System Configuration Updated')
          .setColor(0x00AE86)
          .setDescription('Ticket configuration for this server has been created/updated.')
          .addFields([
            { name: 'Guild', value: `${guild.name} (${guild.id})`, inline: true },
            { name: 'Category', value: updatedConfig.ticketCategoryId ? `<#${updatedConfig.ticketCategoryId}>` : 'Not set', inline: true },
            { name: 'Support Role', value: updatedConfig.supportRoleId ? `<@&${updatedConfig.supportRoleId}>` : 'Not set', inline: true },
            { name: 'Log Channel', value: updatedConfig.logChannelId ? `<#${updatedConfig.logChannelId}>` : 'Not set', inline: true },
            { name: 'Welcome Message', value: updatedConfig.welcomeMessage ?? 'Default', inline: false },
            { name: 'Max Tickets Per User', value: `${updatedConfig.maxTicketsPerUser}`, inline: true }
          ])
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: false });

      } else if (sub === 'view') {
        const guildId = guild.id;
        const config = await TicketConfig.findOne({ guildId });

        if (!config) {
          return interaction.reply({ content: 'No ticket configuration found for this guild. Use `/ticket-setup set` to create one.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setTitle('Ticket System Configuration')
          .setColor(0x0099ff)
          .addFields([
            { name: 'Guild', value: `${guild.name} (${guild.id})`, inline: true },
            { name: 'Category', value: config.ticketCategoryId ? `<#${config.ticketCategoryId}>` : 'Not set', inline: true },
            { name: 'Support Role', value: config.supportRoleId ? `<@&${config.supportRoleId}>` : 'Not set', inline: true },
            { name: 'Log Channel', value: config.logChannelId ? `<#${config.logChannelId}>` : 'Not set', inline: true },
            { name: 'Welcome Message', value: config.welcomeMessage ?? 'Default', inline: false },
            { name: 'Max Tickets Per User', value: `${config.maxTicketsPerUser}`, inline: true },
            { name: 'Stored At (DB)', value: `<t:${Math.floor(config.createdAt.getTime() / 1000)}:f>`, inline: false }
          ])
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });

      } else if (sub === 'reset') {
        const guildId = guild.id;
        const deleted = await TicketConfig.findOneAndDelete({ guildId });
        if (!deleted) {
          return interaction.reply({ content: 'No configuration found to reset for this guild.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setTitle('Ticket Configuration Reset')
          .setColor(0xFF0000)
          .setDescription('The ticket configuration for this guild has been deleted from the database.')
          .addFields({ name: 'Guild', value: `${guild.name} (${guild.id})`, inline: false })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
      }

    } catch (err) {
      console.error('Error in /ticket-setup:', err);
      if (interaction.replied || interaction.deferred) {
        try {
          return interaction.followUp({ content: 'An unexpected error occurred while processing your request. The error has been logged.', ephemeral: true });
        } catch (e) {
          return;
        }
      } else {
        return interaction.reply({ content: 'An unexpected error occurred while processing your request. The error has been logged.', ephemeral: true });
      }
    }
  }
};
