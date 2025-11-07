const { Client, GatewayIntentBits, EmbedBuilder, Partials } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Environment Variables
const TOKEN = process.env.TOKEN;
const WELCOME_CHANNEL_ID = '1434722989387022367';
const REACTION_CHANNEL_ID = '1434722989387022370';

// Emoji → Role ID mapping
const reactionRoles = {
  '🎉': '1436243475107414087', // event
  '🔔': '1436179486356934717', // update
  '👀': '1436179389070053447', // sneak
  '📹': '1434722988602822760', // video
  '🎥': '1434722988602822761', // live
};

// --- WELCOME EMBED ---
client.on('guildMemberAdd', async member => {
  if (member.user.bot) return;

  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setDescription(
      `**Welcome ${member} to Coralises Network | OCE!**\n\n` +
      `📕 Make sure to read ⁠https://discord.com/channels/1434722988602822758/1434722989387022368.\n\n` +
      `❗ Check out ⁠https://discord.com/channels/1434722988602822758/1434722989387022370 to get your roles.\n\n` +
      `🎫 If you have any questions or concerns, open a support ticket here: ⁠https://discord.com/channels/1434722988602822758/1434722989571575984.`
    )
    .setColor(0x00AEFF); // blue accent
  await channel.send({ embeds: [embed] });
});

// --- REACTION ROLES EMBED ---
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);

  const channel = client.channels.cache.get(REACTION_CHANNEL_ID);
  if (!channel) return console.log("❌ Reaction roles channel not found");

  // Delete previous reaction roles messages to avoid duplicates
  const messages = await channel.messages.fetch({ limit: 50 });
  messages.forEach(msg => {
    if (msg.author.id === client.user.id) msg.delete().catch(() => {});
  });

  const embed = new EmbedBuilder()
    .setTitle('Choose Your Pings!')
    .setDescription(
      `React below to get your pings:\n\n` +
      `🎉 → Event pings\n` +
      `🔔 → Update pings\n` +
      `👀 → Sneak peek pings\n` +
      `📹 → Video pings\n` +
      `🎥 → Live stream pings`
    )
    .setColor(0x00AEFF) // blue accent
    .setFooter({ text: 'Coralises Network | Reaction Roles' });

  const message = await channel.send({ embeds: [embed] });

  // React with emojis
  for (const emoji of Object.keys(reactionRoles)) {
    await message.react(emoji);
  }

  console.log("✅ Reaction roles message sent with reactions!");
});

// --- ADD/REMOVE ROLES ON REACTION ---
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();

  const roleId = reactionRoles[reaction.emoji.name];
  if (!roleId) return;

  const member = await reaction.message.guild.members.fetch(user.id);
  await member.roles.add(roleId).catch(console.error);
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();

  const roleId = reactionRoles[reaction.emoji.name];
  if (!roleId) return;

  const member = await reaction.message.guild.members.fetch(user.id);
  await member.roles.remove(roleId).catch(console.error);
});

// --- LOGIN ---
client.login(TOKEN);
