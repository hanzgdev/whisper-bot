const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

const confessions = [];
let confessionCount = 0;
const CONFESSION_CHANNEL = 'confessions'; // channel name where confessions are posted

client.on('ready', () => {
  console.log(`Whisper is online!`);
});

// Handle !confess command in server
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // !confess <message>
  if (message.content.startsWith('!confess')) {
    const confession = message.content.slice(9).trim();
    if (!confession) return message.reply('Usage: `!confess <your confession>`');

    // delete the original message to keep it anonymous
    await message.delete().catch(() => {});

    await postConfession(message.guild, confession, message.author.id);
  }

  // !deleteconfession <id> — admin only
  else if (message.content.startsWith('!deleteconfession')) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('You need to be an admin to delete confessions!');
    }
    const id = parseInt(message.content.split(' ')[1]);
    const confession = confessions.find(c => c.id === id);
    if (!confession) return message.reply('Confession not found!');

    try {
      const channel = message.guild.channels.cache.find(c => c.name === CONFESSION_CHANNEL);
      const msg = await channel.messages.fetch(confession.messageId);
      await msg.delete();
      confessions.splice(confessions.indexOf(confession), 1);
      message.reply(`Confession #${id} deleted!`).then(m => setTimeout(() => m.delete(), 3000));
    } catch {
      message.reply('Could not delete confession, it may have already been removed!');
    }
  }

  // !confessions — list all confession IDs
  else if (message.content === '!confessions') {
    if (confessions.length === 0) return message.reply('No confessions yet!');
    const list = confessions.map(c => `**#${c.id}** — ${c.preview}`).join('\n');
    message.reply(`Active confessions:\n${list}`);
  }
});

// Handle DM confessions
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.guild) return; // ignore server messages here

  if (message.content.startsWith('!confess')) {
    const confession = message.content.slice(9).trim();
    if (!confession) return message.reply('Usage: `!confess <your confession>`');

    // find the first mutual guild
    const guild = client.guilds.cache.first();
    if (!guild) return message.reply('I cant find a server to post your confession to!');

    await postConfession(guild, confession, message.author.id);
    message.reply('Your confession has been posted anonymously!');
  }
});

async function postConfession(guild, confession, userId) {
  const channel = guild.channels.cache.find(c => c.name === CONFESSION_CHANNEL);
  if (!channel) return;

  confessionCount++;
  const id = confessionCount;

  const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle(`🤫 Confession #${id}`)
    .setDescription(confession)
    .setFooter({ text: 'Whisper — anonymous confessions' })
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });
  await msg.react('👍');
  await msg.react('👎');

  confessions.push({
    id,
    messageId: msg.id,
    preview: confession.length > 30 ? confession.slice(0, 30) + '...' : confession
  });
}

client.login(process.env.TOKEN);
