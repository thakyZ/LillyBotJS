/* eslint prefer-const: "off" */
let buttons = {};
let config;
let client;
let commands = [];

const checkUserPermissions = async (interaction, permissions) => {
  if (client === undefined || client === null) {
    return false;
  }

  const guild = client.guilds.resolve(interaction.guildId);
  const member = await guild.members.fetch(interaction.user.id);

  if (member.permissions.any(permissions, true)) {
    return true;
  }

  return false;
};

module.exports = {
  buttons,
  config,
  client,
  commands,
  checkUserPermissions
};
