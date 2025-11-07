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

const TOKEN = 'MTQzNjIxNjU1NDg4MTgxMDU0Ng.GxHb5w.w-sgNTve9P3aJJPVFZZU7-wW0rHnSMaQ4fHnAk';
const WELCOME_CHANNEL_ID = '1434722989387022367';
const REACTION_CHANNEL_ID = '1434722989387022370';

// --- WELCOME EMBED ---
client.on('guildMemberAdd', async member => {
  if (member.user.bot) return;

  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  try {
    const embed = new EmbedBuilder()
      .setDescription(
        `**Welcome ${member} to Coralises Network | OCE!**\n\n` +
        `📕 Make sure to read ⁠https://discord.com/channels/1434722988602822758/1434722989387022368.\n\n` +
        `❗ Check out ⁠https://discord.com/channels/1434722988602822758/1434722989387022370 to get your roles.\n\n` +
        `🎫 If you have any questions or concerns, open a support ticket here: ⁠https://discord.com/channels/1434722988602822758/1434722989571575984.`
      )
      .setColor(0x00AEFF); // blue accent

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Error sending welcome embed:', err);
  }
});

// --- REACTION ROLES ---
const reactionRoles = {
  '🎉': '1436243475107414087', // event
  '🔔': '1436179486356934717', // update
  '👀': '1436179389070053447', // sneak
  '📹': '1434722988602822760', // video
  '🎥': '1434722988602822761', // live
};

// Helper function for adding/removing roles
async function handleReaction(reaction, user, add) {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();

  const roleId = reactionRoles[reaction.emoji.name];
  if (!roleId) return;

  const member = await reaction.message.guild.members.fetch(user.id);
  const role = reaction.message.guild.roles.cache.get(roleId);
  if (!role) return;

  if (add) await member.roles.add(role).catch(console.error);
  else await member.roles.remove(role).catch(console.error);
}

// Event listeners for reactions
client.on('messageReactionAdd', (reaction, user) => handleReaction(reaction, user, true));
client.on('messageReactionRemove', (reaction, user) => handleReaction(reaction, user, false));

// Ready event
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);

  const channel = client.channels.cache.get(REACTION_CHANNEL_ID);
  if (!channel) return console.log("❌ Reaction roles channel not found");

  // Delete old reaction role messages to prevent duplicates
  const messages = await channel.messages.fetch({ limit: 50 });
  for (const msg of messages.values()) {
    if (msg.author.id === client.user.id) await msg.delete().catch(() => {});
  }

  // Send the reaction role embed
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

  for (const emoji of Object.keys(reactionRoles)) {
    await message.react(emoji);
  }

  console.log("✅ Reaction roles message sent!");
});

client.login(TOKEN);
