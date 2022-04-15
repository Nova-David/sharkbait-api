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
