// ===== IMPORTS =====
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

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

// ===== CONFIG =====
const TOKEN = 'YOUR_BOT_TOKEN_HERE';

// CHANNELS
const WELCOME_CHANNEL_ID = '1434722989387022367';
const REACTION_CHANNEL_ID = '1434722989387022370';
const PANEL_CHANNEL_ID = '1434722990054051957'; // Ticket panel channel
const TICKET_CATEGORY_ID = '1434722990054051957'; // Ticket category

// ROLES
const SUPPORT_ROLE_ID = '1434722988602822762';

// ===== REACTION ROLES CONFIG =====
const reactionRoles = {
  '🎉': '1436243475107414087', // event
  '🔔': '1436179486356934717', // update
  '👀': '1436179389070053447', // sneak
  '📹': '1434722988602822760', // video
  '🎥': '1434722988602822761', // live
};

// ===== ACTIVE TICKET TRACKER =====
const activeTickets = new Map();
let lastTicketNumber = 0;

// ===== WELCOME MESSAGE =====
client.on('guildMemberAdd', async member => {
  if (member.user.bot) return;
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setDescription(
      `**Welcome ${member} to Coralises Network | OCE!**\n\n` +
      `📕 Make sure to read the rules.\n\n` +
      `❗ Grab your roles in the reaction role channel.\n\n` +
      `🎫 Need help? Open a support ticket anytime!`
    )
    .setColor(0x00AEFF);

  await channel.send({ embeds: [embed] });
});

// ===== REACTION ROLES =====
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);

  // --- REACTION ROLES SETUP ---
  const channel = client.channels.cache.get(REACTION_CHANNEL_ID);
  if (channel) {
    const messages = await channel.messages.fetch({ limit: 50 });
    messages.forEach(msg => {
      if (msg.author.id === client.user.id) msg.delete().catch(() => {});
    });

    const embed = new EmbedBuilder()
      .setTitle('Choose Your Pings!')
      .setDescription(
        `React below to get your pings:\n\n` +
        `🎉 → Event pings\n\n` +
        `🔔 → Update pings\n\n` +
        `👀 → Sneak peek pings\n\n` +
        `📹 → Video pings\n\n` +
        `🎥 → Live stream pings`
      )
      .setColor(0x00AEFF)
      .setFooter({ text: 'Coralises Network | Reaction Roles' });

    const message = await channel.send({ embeds: [embed] });
    for (const emoji of Object.keys(reactionRoles)) await message.react(emoji);

    console.log('✅ Reaction roles setup done!');
  } else {
    console.log('⚠️ Reaction roles channel not found.');
  }

  // --- AUTO SEND TICKET PANEL ---
  const panelChannel = client.channels.cache.get(PANEL_CHANNEL_ID);
  if (panelChannel) {
    const messages = await panelChannel.messages.fetch({ limit: 10 });
    messages.forEach(msg => {
      if (msg.author.id === client.user.id) msg.delete().catch(() => {});
    });

    const embed = new EmbedBuilder()
      .setTitle('🎫 Coralises Support')
      .setDescription('Need help? Choose your support type below:')
      .setColor(0x00BFFF);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('billing').setLabel('Billing Support').setStyle(ButtonStyle.Primary).setEmoji('💰'),
      new ButtonBuilder().setCustomId('support').setLabel('Support').setStyle(ButtonStyle.Success).setEmoji('🛠️'),
      new ButtonBuilder().setCustomId('report').setLabel('Report').setStyle(ButtonStyle.Danger).setEmoji('🚨')
    );

    await panelChannel.send({ embeds: [embed], components: [row] });
    console.log('🎟️ Ticket panel sent!');
  } else {
    console.log('⚠️ Ticket panel channel not found.');
  }

  // --- REGISTER /add COMMAND ---
  const guild = client.guilds.cache.first();
  if (guild) {
    const data = new SlashCommandBuilder()
      .setName('add')
      .setDescription('Add a user to the current ticket')
      .addUserOption(option => option.setName('user').setDescription('User to add').setRequired(true))
      .toJSON();

    await guild.commands.create(data);
    console.log('✅ /add command registered!');
  }
});

// ===== REACTION ROLE HANDLERS =====
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

// ===== TICKET BUTTON HANDLERS =====
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;
  const type = interaction.customId;

  // Close ticket
  if (type === 'close_ticket') {
    const channel = interaction.channel;
    await channel.delete().catch(() => {});
    activeTickets.forEach((val, key) => {
      if (val === channel.id) activeTickets.delete(key);
    });
    return;
  }

  // Open ticket
  if (activeTickets.has(userId)) {
    return interaction.reply({ content: '❌ You already have an open ticket!', ephemeral: true });
  }

  lastTicketNumber++;
  const ticketChannel = await interaction.guild.channels.create({
    name: `ticket-${lastTicketNumber}`,
    type: 0,
    parent: TICKET_CATEGORY_ID,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: SUPPORT_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
    ]
  });

  activeTickets.set(userId, ticketChannel.id);

  const embed = new EmbedBuilder()
    .setTitle(`🎫 Ticket: ${type.charAt(0).toUpperCase() + type.slice(1)}`)
    .setDescription(
      `Thank you for contacting support.\n\n` +
      `Please describe your issue and wait for a response.\n\n` +
      `⚠️ Do not ping anyone.`
    )
    .setColor(0x00BFFF);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
  );

  await ticketChannel.send({
    content: `<@${userId}> <@&${SUPPORT_ROLE_ID}>`,
    embeds: [embed],
    components: [row]
  });

  await interaction.reply({ content: `✅ Ticket created: ${ticketChannel}`, ephemeral: true });
});

// ===== /ADD COMMAND =====
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'add') return;

  const user = interaction.options.getUser('user');
  const channel = interaction.channel;
  if (!channel.name.startsWith('ticket-')) {
    return interaction.reply({ content: '❌ You can only use this inside a ticket.', ephemeral: true });
  }

  await channel.permissionOverwrites.edit(user.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true
  });

  await interaction.reply({ content: `✅ Added ${user.tag} to the ticket.`, ephemeral: true });
});

// ===== LOGIN =====
client.login(TOKEN);
