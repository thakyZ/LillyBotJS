const { Client, Intents, ReactionCollector } = require("discord.js");
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});
const fs = require('fs-extra');
const _ = require('lodash');
const path = require('path');

const defaultConfig = {
//  prefix: "_",
//  ruleCode: "<string of the code>",
  channelName: "<name of the channel to be sent in>",
  guildId: 0,
  readTheRulesRole: 0,
  reactionEmoji: "<actual emoji>",
  ruleMessageId: 0,
  token: "<token of the bot>"
};
let stringDefaultConfig = JSON.stringify(defaultConfig);
let config = null;

let channelName = null;
let guildId = null;
let readTheRulesRole = null;
let reactionEmoji = null;
let ruleMessageId = null;
let token = null;

function LoadConfig() {
  if(fs.existsSync(path.resolve(__dirname, "config.json")) == false) {
    fs.writeFileSync(path.resolve(__dirname, "config.json"), JSON.stringify(defaultConfig, null, 2), { overwrite: false }, function(err) {
      if (err) throw err;

      console.log("Wrote default config. Please edit it before starting again.");
      return process.exit(2);
    });
  } else {
    config = fs.readFileSync(path.resolve(__dirname, "config.json"), "utf-8");
  }
  if (!config) {
    console.log("No config read.");
    return process.exit(1);
  }
  const finalConfig = config;

  global.gConfig = JSON.parse(finalConfig);

//  console.log(`global.gConfig: ${JSON.stringify(global.gConfig, undefined, global.gConfig.json_indentation)}`);

//  const ruleCode = global.gConfig.ruleCode;
  channelName = global.gConfig.channelName;
  guildId = global.gConfig.guildId;
  readTheRulesRole = global.gConfig.readTheRulesRole;
  reactionEmoji = global.gConfig.reactionEmoji;
  ruleMessageId = global.gConfig.ruleMessageId;
  token = global.gConfig.token;
//  console.log("token: " + token);

  return true;
}

function CheckConfig() {
  let varErrors = 0;

  const prefix = global.gConfig.prefix;
//  if (prefix === "") {
//    console.log("Command prefix cannot be blank");
//    varErrors += 1;
//  }
//  if (ruleCode === "") {
//    console.log("RuleCode cannot be blank.");
//    varErrors += 1;
//  }
  if (!client.guilds.cache.find(guild => guild.id == guildId)) {
    client.guilds.cache.each(guild => console.log("id: " + guild.id));
    console.log("Could not find guild by id, \'" + guildId + "\'.");
    varErrors += 1;
  }
  if (!client.guilds.cache.find(guild => guild.id == guildId).channels.cache.find(channel => channel.name === channelName)) {
    console.log("Could not find channel by the name of, \'" + channelName + "\' in guild, \'" + guildId + "\'.");
    varErrors += 1;
  }
  if (reactionEmoji === "") {
    console.log("reactionEmoji cannot be blank.");
    varErrors += 1;
  }
  if (ruleMessageId === "") {
    console.log("ruleMessageId cannot be blank.");
    varErrors += 1;
  }
  if (token === "" || token === defaultConfig.token) {
    console.log("Please change the token variable to a bot token.");
    varErrors += 1;
  }
  if (!client.guilds.cache.find(guild => guild.id == guildId).roles.cache.find(role => role.id == readTheRulesRole)) {
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

process.on('exit', function(code) {
  return console.log(`About to exit with code ${code}`);
});

if (LoadConfig()) {
  console.log("Config Loaded!");
}

client.on("ready", async () => {
  console.log("LillyBot is ready!");

  if (CheckConfig()) {
    console.log("Config Valid!");
  }


  const guild = client.guilds.cache.get(guildId);
  const channel = guild.channels.cache.find(channel => channel.name == channelName);
  const message = await channel.messages.fetch(ruleMessageId);

  await message.react(reactionEmoji);
  // Await message.reactions.removeAll();

  const collector = new ReactionCollector(message, () => true, { dispose : true });

  collector.on('collect', async (reaction, user) => {
    if (reaction.emoji.toString() !== reactionEmoji) {
      return;
    }
    if (user.bot) {
      return;
    }

    try {
      var guildUser = await guild.members.fetch({ user, cache: true });

      if (guildUser == null) {
        return;
      }
    }
    catch (e) {
      console.log("Failed to get user by id: \'" + user.id + "\' From guild.");
    }

    if (guildUser.roles.cache.find(r => r.id === readTheRulesRole)) {
      return;
    }
    else {
      console.log("User, \'" + guildUser.displayName + "\' has accepted the rules.");
      guildUser.roles.add(guild.roles.cache.get(readTheRulesRole).id).then(
      reaction.users.remove(user));
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

  if (message.channel.name === channelName)
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
      message.channel.send("Please use the RuleCode command in the <#" + message.guild.channels.cache.find(channel => channel.name === channelName).id + "> channel.").then(msg => { console.log(message.author.tag + " sent the rule code command in the wrong channel."); msg.delete({ timeout: 10000 }); });
    }
    console.log(message.content);
    if (message.content.includes(ruleCode)) {
      message.delete();
      console.log(message.author.tag + " sent the rule code in a different channel");
    }
  }
});*/

client.login(token);
