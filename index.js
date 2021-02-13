const Discord = require("discord.js");
const client = new Discord.Client();
const fs = require('fs-extra');
const _ = require('lodash');
const path = require('path');

process.on('exit', function(code) {
  return console.log(`About to exit with code ${code}`);
});

client.on("ready", () => {
  console.log("LillyBot is ready!");
});

const defaultConfig = {
  prefix: "_",
  ruleCode: "<string of the code>",
  channelName: "<name of the channel to be sent in>",
  readTheRulesRole: "<id of the role to give on correct>",
  token: "<token of the bot>"
};
let stringDefaultConfig = JSON.stringify(defaultConfig);
let config = null;

if(fs.existsSync(path.resolve(__dirname, "config.json")) == false)
{
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

console.log(`global.gConfig: ${JSON.stringify(global.gConfig, undefined, global.gConfig.json_indentation)}`);

const prefix = global.gConfig.prefix;

const ruleCode = global.gConfig.ruleCode;
const channelName = global.gConfig.channelName;
const readTheRulesRole = global.gConfig.readTheRulesRole;
const token = global.gConfig.token;

let varErrors = 0;

if (!client.guilds.cache.each(guild => { guild.channels.cache.find(channel => channel.name === channelName ) })) {
  console.log("Could not find channel by the name of, \"" + channelName + "\".");
  varErrors += 1;
}
if (prefix === "") {
  console.log("Command prefix cannot be blank");
  varErrors += 1;
}
if (ruleCode === "") {
  console.log("RuleCode cannot be blank.");
  varErrors += 1;
}
if (token === "" || token === defaultConfig.token) {
  console.log("Please change the token variable to a bot token.");
  varErrors += 1;
}
if (!client.guilds.cache.each(guild => { guild.roles.get(readTheRulesRole) })) {
  console.log("Could not find the readTheRulesRole.");
  varErrors += 1;
}

if (varErrors > 0) {
  console.log("Please fix all outstanding errors.");
  return process.exit(varErrors + 2);
}

client.on("message", (message) => {
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
});

client.login(token);
