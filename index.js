/**
 * @type {import('discord-api-types/v10').APIEmoji}
 */

const { REST, Routes, ActionRowBuilder, Client, GatewayIntentBits, ButtonStyle, ChannelType, ButtonBuilder, Events, Collection } = require("discord.js");
const constants = require("./lib/constants.js");
constants.client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ],
});
const { promises: fs, existsSync } = require("fs");
const path = require("path");

const loadCommands = async () => {
  const commandsPath = path.join(__dirname, "lib", "commands");
  const commandFiles = await fs.readdir(commandsPath);
  const commandFilesFiltered = commandFiles.filter(file => file.endsWith(".js"));
  for (const file of commandFilesFiltered) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      constants.commands.push(command.data.toJSON());
      constants.client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
};

const rest = new REST({ version: "10" });

const sendRestRequest = async (_client, guildId) => {
  await loadCommands();
  try {
    console.log(`Started refreshing ${constants.commands.length} application (/) commands.`);

    const data = await rest.put(
      Routes.applicationGuildCommands(_client.user.id, guildId),
      { body: constants.commands },
    );

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error(error);
  }
};

const loadBotChanges = async _client => {
  if (existsSync(`${__dirname}/botupdate.json`)) {
    const updateFile = await fs.readFile(path.join(__dirname, "botupdate.json"), { encoding: "utf-8", flag: "r+" });
    const update = JSON.parse(updateFile);
    if (update.avatar !== "null") {
      _client.user.setAvatar(`./${update.avatar}`);
    }

    if (update.username !== "null") {
      _client.user.setUsername(`${update.username}`);
    }

    if (update.status !== "null") {
      _client.user.setStatus(`${update.status}`);
    }

    try {
      fs.rename(path.join(__dirname, "botupdate.json"), path.join(__dirname, "botupdate.old.json"));
    } catch (error) {
      console.error(error);
    }
  }
};

const checkConfig = _client => {
  let varErrors = 0;

  if (!constants.client.guilds.cache.has(constants.config.guildId)) {
    constants.client.guilds.cache.each(guild => console.log(`id: ${guild.id}`));
    console.log(`Could not find guild by id, '${constants.config.guildId}'.`);
    varErrors += 1;
  }

  if (!constants.client.guilds.cache.find(guild => guild.id === constants.config.guildId).channels.cache.has(constants.config.rules.channelId)) {
    console.log(`Could not find channel by the name of, '${constants.config.channelId}' in guild, '${constants.config.guildId}'.`);
    varErrors += 1;
  }

  if (constants.config.reactionEmoji === "") {
    console.log("reactionEmoji cannot be blank.");
    varErrors += 1;
  }

  if (!constants.client.guilds.cache.find(guild => guild.id === constants.config.guildId).roles.cache.has(constants.config.readTheRulesRole)) {
    console.log("Could not find the readTheRulesRole.");
    varErrors += 1;
  }

  if (varErrors > 0) {
    console.log("Please fix all outstanding errors.");
    return process.exit(varErrors + 2);
  }

  return true;
};

process.on("exit", code => console.log(`About to exit with code ${code}`));

const getParseEmoji = (emoji, _client) => {
  const getGuildEmoji = _client.emojis.cache.find(emote => emote.name === emoji);
  if (getGuildEmoji === undefined) {
    const resolvedEmoji = _client.emojis.resolveIdentifier(emoji);
    return resolvedEmoji;
  }

  return getGuildEmoji;
};

const getParseStyle = style => {
  switch (style.toLowerCase()) {
  case "secondary":
    return ButtonStyle.Primary;
  case "success":
    return ButtonStyle.Primary;
  case "danger":
    return ButtonStyle.Primary;
  case "link":
    return ButtonStyle.Primary;
  case "primary":
  default:
    return ButtonStyle.Primary;
  }
};

constants.client.once(Events.ClientReady, async _client => {
  console.log("LillyBot is ready!");
  constants.client.commands = new Collection();

  if (checkConfig(_client)) {
    console.log("Config is Valid!");
  }

  await loadBotChanges(_client);

  constants.buttons[constants.config.rules.acceptButton.id] = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(constants.config.rules.acceptButton.id)
        .setLabel(constants.config.rules.acceptButton.label)
        .setStyle(getParseStyle(constants.config.rules.acceptButton.style))
        .setEmoji(getParseEmoji(constants.config.rules.acceptButton.emoji, _client)),
    );

  const guild = _client.guilds.cache.find(guild => guild.id === constants.config.guildId);
  const channel = guild.channels.cache.find(channel => channel.id === constants.config.rules.channelId);

  await sendRestRequest(_client, guild.id);

  if (channel.type !== ChannelType.GuildText) {
    console.error(`Channel with ID: '${constants.config.rules.channelId}' is not a text channel.`);
    process.exit(1);
  }
});

constants.client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
    }
  } else if (interaction.isButton()) {
    if (interaction.customId === constants.config.rules.acceptButton.id) {
      try {
        const guild = constants.client.guilds.resolve(interaction.guildId);
        const member = await guild.members.fetch(interaction.user.id);
        const readTheRules = await guild.roles.fetch(constants.config.readTheRulesRole);
        if (member.user.bot === false && member.roles.resolve(constants.config.readTheRulesRole) === null) {
          await member.roles.add(readTheRules, `${member.user.username} accepted the rules`);
        }
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: "There was an error when accepting the rules...\nPlease contact an administrator.", ephemeral: true });
      } finally {
        await interaction.reply({ content: "Thank you for accepting and agreeing to the rules.", ephemeral: true });
      }
    }
  }
});

const run = async () => {
  try {
    const configFile = await fs.readFile(path.join(__dirname, "config", "config.json"), { encoding: "utf-8", flag: "r+" });
    constants.config = JSON.parse(configFile.toString());
  } catch (error) {
    console.error(`failed to read constants.config file at: ${path.join(__dirname, "config", "config.json")}.`);
    console.error(error);
  }

  rest.setToken(constants.config.token);
  constants.client.login(constants.config.token);
};

run();
