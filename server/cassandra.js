import cassandra from "cassandra-driver";
import * as bcrypt from "./password.js";

const client = new cassandra.Client({
  contactPoints: ["localhost"],
  localDataCenter: "datacenter1",
  keyspace: "sharkbait",
});

export const getTables = () => {
  console.log("...getting tables");

  const query = "DESCRIBE Tables";

  return new Promise((resolve) => {
    client.execute(query, undefined, undefined, (err, result) => {
      if (err) return resolve({ ...err, ...{ error: 1 } });

      const results = result.rows;
      let res = [];

      for (let i = 0; i < results.length; i++) {
        res.push(results[i].name);
      }

      resolve(res);
    });
  });
};

export const selectAllFrom = (table) => {
  console.log("...getting data from", table);

  const query = "SELECT * FROM " + table;

  return new Promise((resolve) => {
    client.execute(query, undefined, undefined, (err, result) => {
      if (err) return resolve({ ...err, ...{ error: 1 } });

      var res = {
        columns: [],
        data: [],
      };

      const columns = result.columns;

      for (let i = 0; i < columns.length; i++) {
        res.columns.push(columns[i].name);
      }

      const rows = result.rows;

      for (let i = 0; i < rows.length; i++) {
        res.data.push(rows[i]);
      }

      resolve(res);
    });
  });
};

export const selectAll = (table) => {
  console.log("...getting data from", table);

  const query = "SELECT * FROM " + table;

  return new Promise((resolve) => {
    client.execute(query, undefined, undefined, (err, result) => {
      if (err) return resolve({ ...err, ...{ error: 1 } });

      var res = [];

      const rows = result.rows;

      for (let i = 0; i < rows.length; i++) {
        res.push(rows[i]);
      }

      resolve(res);
    });
  });
};

export const select = (table, data, secure = false) => {
  console.log("...select data from", table);

  if(data.uid) data.uid = data.uid.toLowerCase();

  const keys = Object.keys(data);
  const values = Object.values(data);
  const where = keys.map((key) => key + "=?").join(" AND ");

  const query = "SELECT * FROM " + table + " WHERE " + where;

  return new Promise((resolve) => {
    client.execute(query, values, { prepare: true }, (err, res) => {
      if (err) resolve({ ...err, ...{ error: 1 } });

      if (!res || res.rows.length <= 0) return resolve({ notfound: 1 });

      res = res.rows[0];

      if (res.password && !secure) delete res.password;
      if (res.salt && !secure) delete res.salt;

      resolve(res);
    });
  });
};

export const selectSome = (table, data, cols = null) => {
  console.log("...select data from", table);

  if(data.uid) data.uid = data.uid.toLowerCase();

  const keys = Object.keys(data);
  const values = Object.values(data);
  const where = keys.map((key) => key + "=?").join(" AND ");
  const params = cols ? cols.join(", ") : "*";

  const query = "SELECT " + params + " FROM " + table + " WHERE " + where;

  return new Promise((resolve) => {
    client.execute(query, values, { prepare: true }, (err, res) => {
      if (err) resolve({ ...err, ...{ error: 1 } });

      if (!res || res.rows.length <= 0) return resolve({ notfound: 1 });

      res = res.rows[0];
      console.log(res);

      resolve(res);
    });
  });
};

export const insert = async (table, data) => {
  console.log("...inserting data into", table);

  if (data.password)
    [data.password, data.salt] = await bcrypt.hash(data.password);

  const keys = Object.keys(data);
  const values = Object.values(data);
  const q = values.map((x) => "?");

  const query =
    "INSERT INTO " +
    table +
    " (" +
    keys.toString() +
    ") VALUES (" +
    q.toString() +
    ")";

  return new Promise((resolve) => {
    client.execute(query, values, { prepare: true }, (err, res) => {
      if (err) resolve({ ...err, ...{ error: 1 } });
      else resolve({ success: 1 });
    });
  });
};

export const update = async (table, data) => {
  console.log("...updating data from", table);

  if (!data.keys)
    return new Promise((resolve) =>
      resolve({
        error: 1,
        message: "Primary keys are required to update data.",
      })
    );

  let keys = Object.keys(data.keys);
  const changeValues = Object.values(data.keys);
  const where = keys.map((key) => key + "=?").join(" AND ");

  delete data.keys;

  if (data.password)
    [data.password, data.salt] = await bcrypt.hash(data.password);

  keys = Object.keys(data);
  const values = Object.values(data);
  const sets = keys.map((key) => key + "=?").join(", ");

  values.push(...changeValues);

  const query =
    "UPDATE " + table + " SET " + sets + " WHERE " + where + " IF EXISTS";

  return new Promise((resolve) => {
    client.execute(query, values, { prepare: true }, (err, res) => {
      if (err) resolve({ ...err, ...{ error: 1 } });
      else resolve({ success: 1 });
    });
  });
};

export const deleteFrom = async (table, data) => {
  console.log("...deleting data from", table);

  const keys = Object.keys(data);
  const values = Object.values(data);
  const where = keys.map((key) => key + "=?").join(" AND ");

  const query = "DELETE FROM " + table + ' WHERE ' + where;

  return new Promise((resolve) => {
    client.execute(query, values, { prepare: true }, (err, res) => {
      if (err) resolve({ ...err, ...{ error: 1 } });
      else resolve({ success: 1 });
    });
  });
}

export const insertUser = async (data) => {
  if (!data.uid || !data.password) return new Promise(resolve => resolve({error: 1, message: "uid and password keys are required."}));
  data.uid = data.uid.toLowerCase();
  return await insert('users', data);
}

export const checkPassword = async (data) => {
  const user = await select("users", { uid: data.uid }, true);

  console.log("...checking user credentials");

  if (user.error) return new Promise((resolve) => resolve(user));
  if (user.notfound)
    return new Promise((resolve) => resolve({ notfound: 1, valid: false }));
  else if (!data.password)
    return new Promise((resolve) => resolve({ valid: false }));

  const [password, salt] = await bcrypt.hash(data.password, user.salt);

  const userPassword = user.password;
  delete user.password;
  delete user.salt;

  if (user.chats) {
    const chats = {};

    for (let i = 0; i < user.chats.length; i++) {
      let key = user.chats[i];
      key = key.includes(":") ? key.split(":")[1] : key;
      
      chats[key] = await getChat({chat_id: key});
      chats[key].members = chats[key].members.filter(member => member.uid != user.uid);
    }

    user.chats = chats;
  }

  if (user.friends) {
    for (let i = 0; i < user.friends.length; i++) {
      user.friends[i] = await selectSome('users', { uid: user.friends[i] }, ['uid', 'displayname']);
    }
  }

  if (user.requests) {
    for (let i = 0; i < user.requests.length; i++) {
      user.requests[i] = await selectSome('users', { uid: user.requests[i] }, ['uid', 'displayname']);
    }
  }

  return new Promise((resolve) => {
    let result = password == userPassword ? { valid: true, data: user } : { valid: false };
    resolve(result);
  });
};

export const addFriend = async (uid, friend) => {
  console.log("...adding a friend");

  const query = "UPDATE users SET friends = friends + ? WHERE uid = ?";

  return new Promise((resolve) => {
    client.execute(query, [[friend], uid], {prepare: true}, (err, res) => {
      if (err) resolve({...err, ...{ error: 1 }});
      else resolve({ success: 1 });
    });
  });
}

export const deleteFriend = async (uid, friend) => {
  console.log("...adding a friend");

  const query = "UPDATE users SET friends = friends - ? WHERE uid = ?";

  return new Promise((resolve) => {
    client.execute(query, [[friend], uid], {prepare: true}, (err, res) => {
      if (err) resolve({...err, ...{ error: 1 }});
      else resolve({ success: 1 });
    });
  });
}

export const addRequest = async (uid, friend) => {
  console.log("...receiving a friend request");

  const query = "UPDATE users SET requests = requests + ? WHERE uid = ?";

  return new Promise((resolve) => {
    client.execute(query, [[friend], uid], {prepare: true}, (err, res) => {
      if (err) resolve({...err, ...{ error: 1 }});
      else resolve({ success: 1 });
    });
  });
}

export const deleteRequest = async (uid, friend) => {
  console.log("...deleting a friend request");

  const query = "UPDATE users SET requests = requests - ? WHERE uid = ?";

  return new Promise((resolve) => {
    client.execute(query, [[friend], uid], {prepare: true}, (err, res) => {
      if (err) resolve({...err, ...{ error: 1 }});
      else resolve({ success: 1 });
    });
  });
}

export const friendRequest = async (data) => {
  console.log("...sending a friend request");

  if (!data.uid || !data.friend) return new Promise(resolve => resolve({error: 1, message: "uid and friend keys are required."}));

  data.fid = data.friend;
  delete data.friend;
  
  const received = await addRequest(data.fid, data.uid);
  if (received.error) return new Promise(resolve => resolve(received));

  data.status = 1;

  return await insert('friendship', data); 
};

export const acceptRequest = async (data) => {
  console.log("...accepting a friend request");

  if (!data.uid || !data.friend) return new Promise(resolve => resolve({error: 1, message: "uid and friend keys are required."}));

  data.fid = data.uid;
  data.uid = data.friend;
  delete data.friend;


  let received = await deleteRequest(data.fid, data.uid);
  if (received.error) return new Promise(resolve => resolve(received));

  received = await addFriend(data.uid, data.fid);
  if (received.error) return new Promise(resolve => resolve(received));

  received = await addFriend(data.fid, data.uid);
  if (received.error) return new Promise(resolve => resolve(received));

  return await deleteFrom('friendship', { uid: data.uid, fid: data.fid });
} 

export const rejectRequest = async (data) => {
  console.log("...rejecting a friend request");

  if (!data.uid || !data.friend) return new Promise(resolve => resolve({error: 1, message: "uid and friend keys are required."}));

  data.fid = data.uid;
  data.uid = data.friend;
  delete data.friend;

  const received = await deleteRequest(data.fid, data.uid);
  if (received.error) return new Promise(resolve => resolve(received));

  return await deleteFrom('friendship', { uid: data.uid, fid: data.fid });
}

export const checkRequest = async (data) => {
  console.log("...checking requests from friendship");

  if (!data.uid || !data.friend) return new Promise(resolve => resolve({error: 1, message: "uid and friend keys are required."}));

  data.fid = data.friend;
  delete data.friend;

  const query = "SELECT * FROM friendship WHERE uid = ? AND fid = ?";

  return new Promise((resolve) => {
    client.execute(query, Object.values(data), {prepare: true}, (err, result) => {
      if (err) return resolve({ ...err, ...{ error: 1 } });

      var res = result.rows.length >= 1 ? { sent: true } : { sent: false };

      resolve(res);
    });
  });
}

export const allFriends = async (data) => {
  console.log("...fetching all friends");

  if (!data.uid) return new Promise(resolve => resolve({error: 1, message: "uid key is required."}));

  const user = await select('users', { uid: data.uid });
  if (user.error) return new Promise(resolve => resolve(user));

  const friends = user.friends ? user.friends : Array();
  const requests = user.requests ? user.requests : Array();

  let res = {};
  let friend;

  for (let i = 0; i < friends.length; i++) {
    friend = await select('users', { uid: friends[i] });
    if (friend.error) return new Promise(resolve => resolve(friend));

    res[friends[i]] = friend;
  }

  let req = {};
  for (let i = 0; i < requests.length; i++) {
    friend = await select('users', { uid: requests[i] });
    if (friend.error) return new Promise(resolve => resolve(friend));

    req[requests[i]] = friend;
  }
  

  return new Promise(resolve => resolve({friends: res, requests: req}));
}

export const unfriend = async (data) => {
  console.log("...removing friends");

  if (!data.uid || !data.friend) return new Promise(resolve => resolve({error: 1, message: "uid and friend keys are required."}));

  let received = await deleteFriend(data.uid, data.friend);
  if (received.error) return new Promise(resolve => resolve(received));

  return deleteFriend(data.friend, data.uid);
}

export const getMessages = async (data) => {
  console.log("...getting messages");

  const query = "SELECT * FROM messages WHERE chat_id = ?";

  return new Promise((resolve) => {
    client.execute(query, [data.chat_id], {prepare: true}, (err, result) => {
      if (err) return resolve({ ...err, ...{ error: 1 } });
      var res = [];
      
      const rows = result.rows;

      for (let i = 0; i < rows.length; i++) {
        res.push(rows[i]);
      }

      resolve(res);
    });
  });
}

export const insertMessage = async (data) => {
  console.log("...creating a message");

  const query =
    "INSERT INTO messages (chat_id, message_id, uid, msg) VALUES (?, now(), ?, ?)";

  return new Promise((resolve) => {
    client.execute(query, [data.chat_id, data.uid, data.msg], { prepare: true }, (err, res) => {
      if (err) resolve({ ...err, ...{ error: 1 } });
      else resolve({ success: 1 });
    });
  });
}

export const updateLatestChat = async (data) => {
  console.log("...updating latest chats");

  const query = "UPDATE chats SET msg = ?, last_update = dateof(now()) WHERE chat_id = ?";

  data.chat_id = cassandra.types.Uuid.fromString(data.chat_id);

  return new Promise((resolve) => {
    client.execute(query, [data.msg, data.chat_id], { prepare: true }, (err, res) => {
      if (err) resolve({ ...err, ...{ error: 1 } });
      else resolve({ success: 1 });
    });
  })
}

export const insertMessageEverywhere = async (data) => {
  console.log("...export message to chats and messages");

  let received = await insertMessage(data);
  if (received.error) return new Promise(resolve => resolve(received));

  return await updateLatestChat(data);
}

export const addInterest = async (data) => {
  console.log("...adding an interest");

  if (!data.uid || !data.interest) return new Promise(resolve => resolve({error: 1, message: "uid and interest keys are required."}));

  const query = "UPDATE users SET interests = interests + ? WHERE uid = ?";

  return new Promise((resolve) => {
    client.execute(query, [[data.interest], data.uid], {prepare: true}, (err, res) => {
      if (err) resolve({...err, ...{ error: 1 }});
      else resolve({ success: 1 });
    });
  });
}

export const removeInterest = async (data) => {
  console.log("...removing an interest");

  if (!data.uid || !data.interest) return new Promise(resolve => resolve({error: 1, message: "uid and interest keys are required."}));

  const query = "UPDATE users SET interests = interests - ? WHERE uid = ?";

  return new Promise((resolve) => {
    client.execute(query, [[data.interest], data.uid], {prepare: true}, (err, res) => {
      if (err) resolve({...err, ...{ error: 1 }});
      else resolve({ success: 1 });
    });
  });
}

export const chatExists = async (data) => {
  console.log("...checking if chat exists");

  if (!data.uid || !data.friend) return new Promise(resolve => resolve({error: 1, message: "1uid and friend keys are required."}));

  const user = await select('users', {uid: data.uid});
  const chats = user.chats;

  if (chats) {
    for (let i = 0; i < chats.length; i++) {
      if (chats[i].split(":")[0] == data.friend) return chats[i].split(":")[1];
    }
  }

  return false;
}

export const addChat = async (data) => {
  console.log("...adding a chat");

  if (!data.uid || !data.chat_id) return new Promise(resolve => resolve({error: 1, message: "uid and chat_id keys are required."}));

  const query = "UPDATE users SET chats = chats + ? WHERE uid = ?";

  return new Promise((resolve) => {
    client.execute(query, [[data.chat_id], data.uid], {prepare: true}, (err, res) => {
      if (err) resolve({...err, ...{ error: 1 }});
      else resolve({ success: 1 });
    });
  });
}

export const insertChat = async (data) => {
  console.log("...creating a message");

  const uuid = cassandra.types.Uuid.random();

  const query =
    "INSERT INTO chats (chat_id, members, last_update) VALUES (?, ?, dateof(now()))";

  return new Promise((resolve) => {
    client.execute(query, [uuid, [data.uid, data.friend]], { prepare: true }, (err, res) => {
      if (err) resolve({ ...err, ...{ error: 1 } });
      else resolve({ uuid: uuid.toString() });
    });
  });
}

export const createChat = async data => {
  console.log("...creating a new chat");

  if (!data.uid || !data.friend) return new Promise(resolve => resolve({error: 1, message: "uid and friend keys are required."}));

  let uuid = await insertChat(data);
  if (uuid.error) return new Promise(resolve => resolve(uuid));

  data.chat_id = data.friend + ":" + uuid.uuid;

  let received = await addChat(data);
  if (received.error) return new Promise(resolve => resolve(received));

  data.chat_id = data.uid + ":" + uuid.uuid;
  data.uid = data.friend;

  received = await addChat(data);
  if (received.error) return new Promise(resolve => resolve(received));

  return new Promise(resolve => resolve({uuid: uuid.uuid}));
}

export const startChat = async data => {
  console.log("...starting a chat with someone");

  if (!data.uid || !data.friend) return new Promise(resolve => resolve({error: 1, message: "uid and friend keys are required."}));

  let uuid = await chatExists(data);
  if (uuid.error) return new Promise(resolve => resolve(uuid));
  else if (uuid) return new Promise(resolve => resolve({uuid: uuid}));
  else {
    uuid = await createChat(data)
    if (uuid.error) return new Promise(resolve => resolve(uuid));
    else return new Promise(resolve => resolve(uuid));
  }

}

export const getChats = async (data) => {
  console.log("...getting chats");

  if (!data.uid) return new Promise(resolve => resolve({error: 1, message: "uid key is required."}));

  const userInfo = await select('users', {uid: data.uid});
  if (userInfo.error) return new Promise(resolve => resolve(userInfo));

  const chats = userInfo.chats;
  if (chats == null) return new Promise(resolve => resolve([]));

  let res = [];

  for (let i = 0; i < chats.length; i++) {
    let chatId = (chats[i].includes(":")) ? chats[i].split(":")[1] : chats[i];
    let chat = await select('chats', {chat_id: chatId});
    if (chat.error) return new Promise(resolve => resolve(chat));

    chat.chat_id = chat.chat_id.toString();

    let members = [];

    for(let j = 0; j < chat.members.length; j++) {
      if (chat.members[j] != data.uid) {
        let memberInfo = await select('users', {uid: chat.members[j]});
        if (memberInfo.error) return new Promise(resolve => resolve(memberInfo));

        members.push(memberInfo);
      }
    }

    chat.members = members;
    res.push(chat);
  }

  return new Promise(resolve => resolve(res));
}

export const getChat = async (data) => {
  console.log("...getting a chat");

  if (!data.chat_id) return new Promise(resolve => resolve({error: 1, message: "chat_id key is required."}));

  const chat = await select('chats', {chat_id: data.chat_id});
  if (chat.error) return new Promise(resolve => resolve(chat));

  chat.chat_id = chat.chat_id.toString();

  let members = [];

  for(let j = 0; j < chat.members.length; j++) {
    let memberInfo = await selectSome('users', {uid: chat.members[j]}, ['uid', 'displayname']);
    if (memberInfo.error) return new Promise(resolve => resolve(memberInfo));

    members.push(memberInfo);
  }

  chat.members = members;

  return new Promise(resolve => resolve(chat));
}