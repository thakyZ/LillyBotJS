const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const constants = require("../constants.js");

const forwardReport = async (args) => {
  const guild = constants.client.guilds.resolve(args.guild);
  const channel = await guild.channels.fetch(constants.config.botLogChannel);
  const guildMember = await guild.members.fetch(args.user.id);
  console.log(guildMember);
  const nicknameAppend = guildMember.nickname === null ? "" : ` (${guildMember.nickname})`;
  const reportObject = {
    /* eslint camelcase: ["error", { "properties": "never" }] */
    content: "A new user report has come in!",
    tts: false,
    allowed_mentions: {
      replied_user: false,
      parse: [
        "roles"
      ],
      roles: [
        "1071493555807342672"
      ]
    },
    embeds: [
      {
        type: "rich",
        title: `Report of: ${args.user.username}${nicknameAppend}`,
        description: `${args.user.username} was reported for the following:`,
        color: 0xff4800,
        fields: [
          {
            name: "User:",
            value: `${args.user.username}#${args.user.discriminator}`,
            inline: true
          },
          {
            name: "Channel:",
            value: `#${args.channel.name}`,
            inline: true
          },
          {
            name: "Reason:",
            value: `${args.reason}`
          },
          {
            name: "Date:",
            value: `${new Date(args.date).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short" })}`,
            inline: true
          }
        ],
        timestamp: new Date(args.date).toISOString()
      }
    ]
  };
  if (args.reporter !== null) {
    const reporter = await guild.members.fetch(args.reporter.id);
    const reporterNicknameAppend = reporter.nickname === null ? "" : ` (${reporter.nickname})`;
    const reporterObject = {
      name: "Reporter:",
      value: `${reporter.username}#${reporter.discriminator}${reporterNicknameAppend} inputted invalid text for this report.`
    };
    reportObject.embeds[0].fields.push(reporterObject);
  }

  await channel.send(reportObject);
};

const parseOptions = (options, date, guild, reporter = null) => ({
  user: options.getUser("user"),
  channel: options.getChannel("channel"),
  reason: options.getString("reason") ?? "No reason provided",
  date,
  guild,
  reporter
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("report")
    .setDescription("Report a user for breaking a rule with this command.")
    .addUserOption(option => option.setName("user")
      .setDescription("The user you wish to report `@example#0001`")
      .setRequired(true))
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("The channel the issue with the reported user happened on.")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("The reason you wish to report this user.")
        .setRequired(true))
    .setDMPermission(false),
  async execute(interaction) {
    const date = Date.now();
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const user = interaction.options.getUser("user");
    const channel = interaction.options.getChannel("channel");
    const { guildId } = interaction;
    const reporter = interaction.user.id;
    let options = parseOptions(interaction.options, date, guildId);
    if (reason === "No reason provided") {
      options = parseOptions(interaction.options, date, guildId, reporter);
      await interaction.reply({ content: "Sorry, you must provide a reason as to why you are reporting this user. It greatly helps us moderate better.", ephemeral: true });
      await forwardReport(options);
    }

    const fetchedUser = await constants.client.guilds.resolve(interaction.guildId).members.fetch(user.id);
    const isValidUser = !(fetchedUser === undefined || fetchedUser === null);
    if (isValidUser === false) {
      options = parseOptions(interaction.options, date, guildId, reporter);
      await interaction.reply({ content: "Sorry, you must provide a valid server user. The user you supplied to the command does not exist on this server.", ephemeral: true });
      await forwardReport(options);
    }

    const fetchedChannel = await constants.client.guilds.resolve(interaction.guildId).channels.fetch(channel.id);
    const isValidChannel = !(fetchedChannel === undefined || fetchedChannel === null);
    if (isValidChannel === false) {
      options = parseOptions(interaction.options, date, guildId, reporter);
      await interaction.reply({ content: "Sorry, you must provide a valid server channel. The channel you supplied to the command does not exist on this server.", ephemeral: true });
      await forwardReport(options);
    }

    if (reason !== "No reason provided" && isValidChannel && isValidUser) {
      await interaction.reply({ content: "Thank you for the report, it will be handled ASAP", ephemeral: true });
      await forwardReport(options);
    }
  }
};
