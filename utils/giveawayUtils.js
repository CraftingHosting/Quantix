const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const Giveaway = require('../models/giveaway');
const handleGiveawayButton = require('../utils/giveawayUtils');

let customAlphabet;
(async () => {
  const nanoidModule = await import('nanoid');
  customAlphabet = nanoidModule.customAlphabet;
})();

async function createGiveaway({ interaction, channel, duration, winners, prize, hostedBy }) {
  while (!customAlphabet) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  const nanoid = customAlphabet('1234567890abcdef', 8);
  const giveawayId = nanoid();
  const endTime = Date.now() + duration;

  const embed = new EmbedBuilder()
    .setColor('Blurple')
    .setTitle(`${prize} x${winners}!`)
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/3103/3103446.png')
    .addFields(
      { name: 'Hosted by:', value: `<@${hostedBy}>`, inline: true },
      { name: 'Ends in:', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true },
      { name: 'Entries:', value: '0', inline: true }
    )
    .setImage('https://cdn.discordapp.com/attachments/1143476755133982781/1145261705070676018/giveaway_banner.png')
    .setFooter({ text: `Giveaway ID: ${giveawayId}` });

  const enterButton = new ButtonBuilder()
    .setCustomId(`enter_${giveawayId}`)
    .setLabel('🎉 Enter')
    .setStyle(ButtonStyle.Primary);

  const oddsButton = new ButtonBuilder()
    .setCustomId(`odds_${giveawayId}`)
    .setLabel('🎲 Odds')
    .setStyle(ButtonStyle.Secondary);

  const entrantsButton = new ButtonBuilder()
    .setCustomId(`entrants_${giveawayId}`)
    .setLabel('👥 Show Entrants')
    .setStyle(ButtonStyle.Secondary);

  const entriesButton = new ButtonBuilder()
    .setCustomId(`entrycount_${giveawayId}`)
    .setLabel('Entries: 0')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const row = new ActionRowBuilder().addComponents(
    enterButton,
    oddsButton,
    entrantsButton,
    entriesButton
  );

  const msg = await channel.send({ embeds: [embed], components: [row] });
  const giveawayData = new Giveaway({
    giveawayId,
    messageId: msg.id,
    channelId: channel.id,
    guildId: interaction.guild.id,
    hostedBy,
    prize,
    winners,
    endsAt: new Date(endTime),
    entrants: [],
    ended: false
  });
  await giveawayData.save();
  return msg;
}

async function rerollGiveaway(giveawayId, newUserId, guildId) {
  const giveaway = await Giveaway.findOne({ guildId, giveawayId, ended: true });
  if (!giveaway) return { content: `No ended giveaway found with ID: ${giveawayId}`, ephemeral: true };
  if (!giveaway.entrants.includes(newUserId)) {
    giveaway.entrants.push(newUserId);
  }
  await giveaway.save();
  return {
    content: `Giveaway ${giveawayId} has been rerolled. 🎉 <@${newUserId}> is the new winner!`
  };
}

async function endGiveaway(giveawayId, guildId) {
  const giveaway = await Giveaway.findOne({ guildId, giveawayId });
  if (!giveaway) return { content: `No giveaway found with ID: ${giveawayId}`, ephemeral: true };
  giveaway.endsAt = new Date();
  giveaway.ended = true;
  await giveaway.save();
  return { content: `Giveaway ${giveawayId} has been manually ended.` };
}

module.exports = {
  createGiveaway,
  rerollGiveaway,
  endGiveaway
};
