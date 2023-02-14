const returnUsersLoop = (results, callback) => {
  try {
    console.log(results);
    callback(results);
  } catch (error) {
    console.error(error);
  }
};

const usersLoop = async (guild, users, callback) => {
  const results = [];
  for (const [key,] of Object.entries(users)) {
    // Good: all asynchronous operations are immediately started.
    results.push(guild.members.fetch(key).catch(() => null));
  }

  // Now that all the asynchronous operations are running, here we wait until they all complete.
  return returnUsersLoop(await Promise.all(results), callback);
};

module.exports = {
  usersLoop
};
