// --- Existing imports ---
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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

// --- Environment Variables ---
const TOKEN = 'YOUR_BOT_TOKEN_HERE';
const WELCOME_CHANNEL_ID = '1434722989387022367';
const REACTION_CHANNEL_ID = '1434722989387022370';
const PANEL_CHANNEL_ID = '1434722990054051957'; // Ticket panel channel
const TICKET_CATEGORY_ID = '1434722990054051957'; // Ticket category
const SUPPORT_ROLE_ID = '1434722988602822762'; // Role that can view tickets

// --- Emoji → Role mapping ---
const reactionRoles = {
  '🎉': '1436243475107414087', // event
  '🔔': '1436179486356934717', // update
  '👀': '1436179389070053447', // sneak
  '📹': '1434722988602822760', // video
  '🎥': '1434722988602822761', // live
};

// --- Active tickets store ---
const activeTickets = new Map();
let lastTicketNumber = 0;

// ================= WELCOME EMBED =================
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
    .setColor(0x00AEFF);
  await channel.send({ embeds: [embed] });
});

// ================= REACTION ROLES =================
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);

  const channel = client.channels.cache.get(REACTION_CHANNEL_ID);
  if (!channel) return console.log("❌ Reaction roles channel not found");

  // Delete previous reaction role messages
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
    .setColor(0x00AEFF)
    .setFooter({ text: 'Coralises Network | Reaction Roles' });

  const message = await channel.send({ embeds: [embed] });

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

// ================= TICKETS SYSTEM =================

// Send ticket panel
client.on('messageCreate', async message => {
  if(message.content === '!ticketpanel') {
    if(message.channel.id !== PANEL_CHANNEL_ID) return;

    const embed = new EmbedBuilder()
      .setTitle('🎫 Open a Ticket')
      .setDescription('Click a button below to open a ticket')
      .setColor(0x00BFFF);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('billing').setLabel('Billing Support').setStyle(ButtonStyle.Primary).setEmoji('💰'),
      new ButtonBuilder().setCustomId('support').setLabel('Support').setStyle(ButtonStyle.Success).setEmoji('🛠️'),
      new ButtonBuilder().setCustomId('report').setLabel('Report').setStyle(ButtonStyle.Danger).setEmoji('🚨')
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

// Handle ticket button clicks
client.on(Events.InteractionCreate, async interaction => {
  if(!interaction.isButton()) return;

  const userId = interaction.user.id;

  if(activeTickets.has(userId)) {
    return interaction.reply({ content: '❌ You already have an open ticket!', ephemeral: true });
  }

  const type = interaction.customId;

  // Increment ticket number
  lastTicketNumber++;
  const channelName = `ticket-${lastTicketNumber}`;

  const ticketChannel = await interaction.guild.channels.create({
    name: channelName,
    type: 0,
    parent: TICKET_CATEGORY_ID,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: SUPPORT_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
    ]
  });

  activeTickets.set(userId, ticketChannel.id);

  const ticketEmbed = new EmbedBuilder()
    .setTitle(`🎫 Ticket Opened: ${type.charAt(0).toUpperCase() + type.slice(1)}`)
    .setDescription(`Thank you for contacting support.\n-\nPlease describe your issue and wait for a response.\n\nPlease do not ping anyone`)
    .setColor(0x00BFFF);

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
  );

  await ticketChannel.send({ content: `<@${userId}>`, embeds: [ticketEmbed], components: [closeRow] });

  await interaction.reply({ content: `✅ Your ticket has been created: ${ticketChannel}`, ephemeral: true });
});

// Close ticket
client.on(Events.InteractionCreate, async interaction => {
  if(!interaction.isButton()) return;

  if(interaction.customId === 'close_ticket') {
    const channel = interaction.channel;
    await channel.delete();
    activeTickets.forEach((val, key) => {
      if(val === channel.id) activeTickets.delete(key);
    });
  }
});

// /add command
client.on(Events.InteractionCreate, async interaction => {
  if(!interaction.isChatInputCommand()) return;

  if(interaction.commandName === 'add') {
    const user = interaction.options.getUser('user');
    const channel = interaction.channel;

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if(!channel.name.startsWith('ticket-') || (!member.roles.cache.has(SUPPORT_ROLE_ID) && interaction.user.id !== channel.permissionOverwrites.cache.find(o => o.allow.has(PermissionFlagsBits.ViewChannel))?.id)) {
      return interaction.reply({ content: '❌ You cannot use this command here.', ephemeral: true });
    }

    await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    await interaction.reply({ content: `✅ Added ${user.tag} to the ticket.`, ephemeral: true });
  }
});

// Register slash command
client.on('ready', async () => {
  const data = new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a user to the ticket')
    .addUserOption(option => option.setName('user').setDescription('User to add').setRequired(true))
    .toJSON();

  const guild = client.guilds.cache.first();
  await guild.commands.create(data);
});

// ================= LOGIN =================
client.login(TOKEN);
