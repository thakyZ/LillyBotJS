const constants = require("./constants.js");
const { promises: fs, existsSync } = require("fs");
const { join } = require("path");

const deleteMessagesInRulesChannel = () => new Promise((resolve, reject) => {
  const guild = constants.client.guilds.cache.find(guild => guild.id === constants.config.guildId);
  const channel = guild.channels.cache.find(channel => channel.id === constants.config.rules.channelId);
  channel.messages.fetch({ limit: 10, cache: false }).then(messages => {
    for (const [key, value] of messages) {
      if (value.bulkDeletable) {
        value.delete();
      } else {
        console.error(`Message with id: '${key}' is not bulk deletable.`);
        reject(new Error(`Message with id: '${key}' is not bulk deletable.`));
      }
    }

    resolve(true);
  }).catch(error => {
    if (error) {
      reject(error);
    }
  });
});

const sendFile = obj => {
  try {
    if (existsSync(obj.imagePath)) {
      return {
        files: [{
          attachment: obj.imagePath,
          name: obj.imageFile,
          description: obj.description
        }]
      };
    }
  } catch (error) {
    console.error(error);
    return { b: false, error };
  }

  return { content: "Could not find image..." };
};

const writeMessagesInRulesChannel = async rulesBlocks => {
  let guild;
  let channel;
  try {
    guild = constants.client.guilds.cache.find(guild => guild.id === constants.config.guildId);
    channel = guild.channels.cache.find(channel => channel.id === constants.config.rules.channelId);
  } catch (error) {
    console.error(error);
    return { b: false, error };
  }

  let previousWasButton = false;
  try {
    let index = 0;
    const sendMessage = () => {
      if (index < rulesBlocks.length) {
        const entry = rulesBlocks[index];
        if (entry.startsWith("#[img](")) {
          const imageFile = entry.replaceAll(/#\[img\]\((.*\..*)\)/gi, "$1");
          const imagePath = join(__dirname, "..", "config", "images", imageFile);
          channel.send(sendFile({ imagePath, imageFile, description: constants.config.rules.images[imageFile] })).then(() => {
            ++index;
            sendMessage();
          }).catch(error => {
            console.error(error);
            return { b: false, error };
          });
        } else if (entry.startsWith("#[button](")) {
          const buttonId = entry.replaceAll(/#\[button\]\((.+)\)/gi, "$1");
          channel.send({
            content: rulesBlocks[parseInt(index, 10) + 1],
            components: [constants.buttons[buttonId]]
          }).then(() => {
            ++index;
            previousWasButton = true;
            sendMessage();
          }).catch(error => {
            console.error(error);
            return { b: false, error };
          });
        } else if (previousWasButton === false) {
          channel.send(entry).then(() => {
            ++index;
            sendMessage();
          }).catch(error => {
            console.error(error);
            return { b: false, error };
          });
        } else if (previousWasButton === true) {
          previousWasButton = false;
          ++index;
          const sent = sendMessage();
          if (sent.b === false) {
            return { b: sent.b, error: sent.error };
          }
        }
      }
    };

    const sent = sendMessage();
    if (sent.b === false) {
      return { b: sent.b, error: sent.error };
    }
  } catch (error) {
    console.error(error);
    return { b: false, error };
  }

  return { b: true, error: null };
};

const buildRulesPage = async () => {
  let rules = "";
  try {
    const rulesFile = await fs.readFile(join(__dirname, "..", "config", constants.config.rules.file), { encoding: "utf-8", flag: "r+" });
    rules = rulesFile.toString();
  } catch (error) {
    console.error(`Failed to read rules file at: '${join(__dirname, "..", "config", constants.config.rules.file)}' on file system.`);
    console.error(error);
  }

  const rulesLines = rules.replaceAll(/\r\n/g, "\n").split("\n");
  const rulesBlocks = [];

  const setBlock = { index: 0, is: false };

  for (let i = 0; i < rulesLines.length; i++) {
    const channelMatches = rulesLines[i].match(/#\[channel\]\(\d+\)/gi);
    if (rulesLines[i].startsWith("#[img](") && setBlock.is === false) {
      rulesBlocks.push(rulesLines[i]);
    } else if (rulesLines[i].startsWith("#[button](") && setBlock.is === false) {
      rulesBlocks.push(rulesLines[i]);
    } else if (channelMatches !== null && channelMatches.length > 0 && setBlock.is === true) {
      rulesBlocks[setBlock.index] += `${rulesLines[i].replaceAll(/#\[channel\]\((\d+)\)/gi, "<#$1>")}\n`;
    } else if (rulesLines[i].endsWith("#[") && setBlock.is === false) {
      setBlock.index = rulesBlocks.length;
      setBlock.is = true;
      rulesBlocks[setBlock.index] = "";
    } else if (rulesLines[i].endsWith("#]") && setBlock.is === true) {
      rulesBlocks[setBlock.index] = rulesBlocks[setBlock.index].replace(/\n$/gi, "");
      setBlock.index = 0;
      setBlock.is = false;
    } else if (setBlock.is === true) {
      rulesBlocks[setBlock.index] += `${rulesLines[i]}\n`;
    }
  }

  const deleted = await deleteMessagesInRulesChannel();
  if (deleted.b === false) {
    return { b: false, error: deleted.error };
  }

  const wrote = await writeMessagesInRulesChannel(rulesBlocks);
  if (wrote.b === false) {
    return { b: false, error: wrote.error };
  }

  return { b: true, error: null };
};

module.exports = { buildRulesPage };
