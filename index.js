const { Client, Intents, ReactionCollector } = require("discord.js");
var { channelId, guildId, reactionEmoji, readTheRulesRole, ruleMessageId, token } = require("./config.json");
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});
const fs = require('fs');
const _ = require('lodash');
const path = require('path');

var LoadBotChanges = function(client) {
  if (fs.existsSync(`${__dirname}/botupdate.json`)) {
    const { avatar, username, status } = require("./botupdate.json");
    if (avatar !== "null") {
      client.user.setAvatar(`./${avatar}`);
    }
    if (username !== "null") {
      client.user.setUsername(`${username}`);
    }
    if (status !== "null") {
      client.user.setStatus(`${status}`);
    }
  }
}


if (channelId.charAt(0) === ".") {
  channelId = channelId.replace(".", "");
}
if (guildId.charAt(0) === ".") {
  guildId = guildId.replace(".", "");
}
if (readTheRulesRole.charAt(0) === ".") {
  readTheRulesRole = readTheRulesRole.replace(".", "");
}
if (ruleMessageId.charAt(0) === ".") {
  ruleMessageId = ruleMessageId.replace(".", "");
}

function CheckConfig() {
  let varErrors = 0;
  if (!client.guilds.cache.has(guildId)) {
    client.guilds.cache.each(guild => console.log("id: " + guild.id));
    console.log("Could not find guild by id, \'" + guildId + "\'.");
    varErrors += 1;
  }
  if (!client.guilds.cache.find(guild => guild.id == guildId).channels.cache.has(channelId)) {
    console.log("Could not find channel by the name of, \'" + channelId + "\' in guild, \'" + guildId + "\'.");
    varErrors += 1;
  }
  if (reactionEmoji === "") {
    console.log("reactionEmoji cannot be blank.");
    varErrors += 1;
  }
  if (!client.guilds.cache.find(guild => guild.id == guildId).roles.cache.has(readTheRulesRole)) {
    console.log("Could not find the readTheRulesRole.");
    varErrors += 1;
  }

  if (varErrors > 0) {
    console.log("Please fix all outstanding errors.");
    return process.exit(varErrors + 2);
  } else {
    return true;
  }
}

process.on('exit', function (code) {
  return console.log(`About to exit with code ${code}`);
});

client.on("ready", async () => {
  console.log("LillyBot is ready!");

  if (CheckConfig()) {
    console.log("Config Valid!");
  }

  LoadBotChanges(client);

  const guild = client.guilds.cache.get(guildId);
  const channel = guild.channels.cache.find(channel => channel.id == channelId);
  const message = await channel.messages.fetch(ruleMessageId);

  await message.react(reactionEmoji);
  // Await message.reactions.removeAll();

  const collector = new ReactionCollector(message, () => true, { dispose: true });

  var reaction = await message.reactions.cache.find(reaction => reaction.emoji.toString() === reactionEmoji).fetch();

  var users = await reaction.users.fetch();

  for (const [key, value] of users.entries()) {
    var presentuser = await guild.members.fetch(key).catch(() => null);
    if (presentuser !== null && !presentuser.user.bot) {
      if (!presentuser.roles.cache.has(readTheRulesRole)) {
        console.log(`User, "${presentuser.displayName}" has accepted the rules.`);
        presentuser.roles.add(guild.roles.cache.get(readTheRulesRole).id).then(
          reaction.users.remove(presentuser));
      } else {
        reaction.users.remove(presentuser);
      }
    } else if (presentuser === null) {
      try {
        reaction.users.remove(value);
      } catch (e) {
        console.log(`Failed to remove reaction from user '${value.username}' with id '${value.id}'.`);
      }
    }
  }

  collector.on('collect', async (reaction, user) => {
    if (reaction.emoji.toString() !== reactionEmoji) {
      return;
    }
    if (user.bot) {
      return;
    }

    var guildUser;

    try {
      guildUser = await guild.members.fetch({ user, cache: true });

      if (guildUser == null) {
        return;
      }
    }
    catch (e) {
      console.log("Failed to get user by id: \'" + user.id + "\' From guild.");
    }

    if (guildUser != undefined) {
      if (guildUser.roles.cache.has(readTheRulesRole)) {
        reaction.users.remove(user);
      } else {
        console.log("User, \'" + guildUser.displayName + "\' has accepted the rules.");
        guildUser.roles.add(guild.roles.cache.get(readTheRulesRole).id).then(reaction.users.remove(user));
      }
    }
  });

  collector.on('create', () => {
    console.log('Emoji reaction was created. All is good.');
  });

  collector.on('remove', () => { //(reaction, user) => {
    //console.log("Emoji reaction was removed. Reacting now.");
    //    if (reaction.emoji.toString() !== reactionEmoji) {
    //      return;
    //    }
    //    try {
    //      var guildUser = await guild.members.fetch({ user, cache: true });
    //
    //      if (guildUser == null) {
    //        return;
    //      }
    //    }
    //    catch (e) {
    //      console.log("Failed to get user by id: \'" + user.id + "\' From guild.");
    //    }
    //    console.log("User, \'" + guildUser.displayName + "\', tried to remove their reaction");
    //await message.react(reactionEmoji);
  });

  collector.on('dispose', () => {
    console.log('Emoji reaction message was disposed. But why?');
    //await message.react(reactionEmoji);
  });
});

/*client.on("message", (message) => {
  // Exit and stop if it's not there
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if (message.channel.name === channelId)
  {
    if (message.member.roles.cache.find(r => r.id === readTheRulesRole)) return;
    if (command == "rulecode") {
      const phrase = args.join(" ");

      if (phrase === ruleCode) {
        message.delete();
        message.member.roles.add(message.guild.roles.cache.get(readTheRulesRole).id);
        message.channel.send("Thank you, " + message.member.nickname + " for accepting and reading the rules.").then(msg => { console.log(message.author.tag + " sent the right rule code."); msg.delete({ timeout: 10000 }) });
      } else {
        message.delete();
        message.channel.send("Sorry, " + message.member.nickname + ", but that is not the right rule code.").then(msg => { console.log(message.author.tag + " sent the wrong rule code."); msg.delete({ timeout: 10000 }) });
      }
    } else {
      if (message.content.includes(ruleCode)) {
        message.delete();
        message.channel.send("Sorry, " + message.member.nickname + ", seems like you read the rules and used the right code but wrong command. The command is `_RuleCode` you typed: `_" + command + "`.").then(msg => { console.log(message.author.tag + " sent the right code but wrong command. Used \"_" + command + "\"."); msg.delete({ timeout: 10000 }) });
      }
    }
  } else {
    if (command === "rulecode") {
      message.delete();
      message.channel.send("Please use the RuleCode command in the <#" + message.guild.channels.cache.find(channel => channel.name === channelId).id + "> channel.").then(msg => { console.log(message.author.tag + " sent the rule code command in the wrong channel."); msg.delete({ timeout: 10000 }); });
    }
    console.log(message.content);
    if (message.content.includes(ruleCode)) {
      message.delete();
      console.log(message.author.tag + " sent the rule code in a different channel");
    }
  }
});*/

client.login(token);
