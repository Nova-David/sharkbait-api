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

  return new Promise((resolve) => {
    let result = password == user.password ? { valid: true } : { valid: false };
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

export const unfriend = async (data) => {
  console.log("...removing friends");

  if (!data.uid || !data.friend) return new Promise(resolve => resolve({error: 1, message: "uid and friend keys are required."}));

  let received = await deleteFriend(data.uid, data.friend);
  if (received.error) return new Promise(resolve => resolve(received));

  return deleteFriend(data.friend, data.uid);
}