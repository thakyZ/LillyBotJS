const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const constants = require("../constants.js");
const { buildRulesPage } = require("../rulesPage.js");

const subcommandPermissions = {
  rules: {
    rewrite: PermissionFlagsBits.Administrator
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lilly")
    .setDescription("Lilly Bot Command")
    .addSubcommandGroup(subcommandGroup => subcommandGroup.setName("rules")
      .setDescription("Modifies rules in the rules channel")
      .addSubcommand(subcommand => subcommand.setName("rewrite")
        .setDescription("Rewrites the rules in the rules channel")))
    .setDMPermission(false),
  async execute(interaction) {
    const selectedPermissions = subcommandPermissions[interaction.options.getSubcommandGroup()][interaction.options.getSubcommand()];
    if (interaction.options.getSubcommandGroup() === "rules" && constants.checkUserPermissions(interaction, selectedPermissions)) {
      if (interaction.options.getSubcommand() === "rewrite") {
        await interaction.reply({ content: "Rewriting Rules!", ephemeral: true });
        if (Object.keys(constants.buttons).length > 0) {
          await buildRulesPage();
          interaction.deleteReply();
          await interaction.followUp({ content: "Rewrote Rules!", ephemeral: true });
        } else {
          interaction.deleteReply();
          await interaction.followUp({ content: "Buttons not yet initialized!", ephemeral: true });
        }
      }
    }
  }
};
