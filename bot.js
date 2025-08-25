const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config();
require('moment/locale/de');

const registerCommands = require('./register-commands');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[WARNING] The command file '${file}' is not correctly structured.`);
  }
}

client.handlers = new Collection();
const handlersPath = path.join(__dirname, 'handlers');
if (fs.existsSync(handlersPath)) {
  const handlerFiles = fs.readdirSync(handlersPath).filter(file => file.endsWith('.js'));
  for (const file of handlerFiles) {
    const modulePath = path.join(handlersPath, file);
    try {
      const handlerModule = require(modulePath);
      if (handlerModule && handlerModule.customId && typeof handlerModule.execute === 'function') {
        client.handlers.set(handlerModule.customId, handlerModule.execute);
        console.log(`[HANDLER] Geladen (customId -> execute): ${handlerModule.customId}`);
        continue;
      }
      if (typeof handlerModule === 'function') {
        const handlerName = path.parse(file).name;
        client.handlers.set(handlerName, handlerModule);
        console.log(`[HANDLER] Geladen (function): ${handlerName}`);
        continue;
      }
      const possibleFn = Object.values(handlerModule).find(v => typeof v === 'function');
      if (possibleFn) {
        const handlerName = path.parse(file).name;
        client.handlers.set(handlerName, possibleFn);
        console.log(`[HANDLER] Geladen (object -> fn): ${handlerName}`);
        continue;
      }
      console.warn(`[WARNING] Handler '${file}' hat kein gültiges Format.`);
    } catch (err) {
      console.error(`[HANDLER] Fehler beim Laden von ${file}:`, err);
    }
  }
}

client.once('ready', async () => {
  console.log(`Bot is online as ${client.user.tag}`);
  await registerCommands();
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection failed:', err);
  }
});

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

client.on('guildCreate', async guild => {
  try {
    const owner = await guild.fetchOwner();
    const dmMessage =
`Thank you for choosing **Quantix** to manage your server! 🎉

Need help or want to give feedback? Feel free to join our support server:
🔗 https://discord.gg/Quantix

// Bot Info //
Version: 0.3.4 BETA`;
    await owner.send(dmMessage);
    console.log(`Sent welcome DM to ${owner.user.tag}`);
  } catch (err) {
    console.error('Could not send DM to server owner:', err);
  }
});

client.on('guildMemberAdd', async member => {
  const GuildConfig = require('./models/GuildConfig');
  const config = await GuildConfig.findOne({ guildId: member.guild.id });
  if (config && config.welcomeChannelId && config.welcomeEmbedTitle && config.welcomeEmbedDescription) {
    const channel = member.guild.channels.cache.get(config.welcomeChannelId);
    if (channel && channel.permissionsFor(member.guild.members.me).has('SendMessages')) {
      const lang = ['de', 'en'].includes(config.language) ? config.language : 'en';
      moment.locale(lang);
      const joinDate = moment(member.joinedAt || new Date()).format('L (HH:mm)');
      const memberCount = member.guild.memberCount;
      const memberNumberFormatted = getOrdinal(memberCount, lang);
      const labels = {
        de: { joinDate: 'Gejoint am', member: 'Mitglied' },
        en: { joinDate: 'Join Date', member: 'Member' }
      };
      const embed = new EmbedBuilder()
        .setTitle(config.welcomeEmbedTitle.replace('{guildname}', member.guild.name))
        .setDescription(
          config.welcomeEmbedDescription
            .replace('{user}', `<@${member.id}>`)
            .replace('{tag}', member.user.tag)
            .replace('{guildname}', member.guild.name)
        )
        .addFields(
          { name: `${labels[lang].joinDate} »`, value: joinDate, inline: true },
          { name: `${labels[lang].member} »`, value: memberNumberFormatted, inline: true }
        )
        .setColor(config.welcomeEmbedColor || '#00b0f4')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Quantix • ${moment().calendar()}` });

      channel.send({ embeds: [embed] });
    }
  }
});

function getOrdinal(n, lang = 'en') {
  if (lang === 'de') return `${n}. Mitglied`;
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]} member`;
}

client.login(process.env.BOT_TOKEN);
