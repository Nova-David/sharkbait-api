import * as cassandra from "./cassandra.js";

const handle = (data, res) => {
  if (data.error) res.send({ error: data.message });
  else res.send(data);
};

export const getTables = (req, res) =>
  cassandra.getTables().then((data) => handle(data, res));

export const getDataFromTable = (req, res) =>
  cassandra.selectAllFrom(req.body.table).then((data) => handle(data, res));

export const selectAll = (req, res) =>
  cassandra.selectAll(req.params.table).then((data) => handle(data, res));

export const insert = (req, res) =>
  cassandra
    .insert(req.params.table, req.body)
    .then((data) => handle(data, res));

export const deleteData = (req, res) =>
  cassandra
    .deleteFrom(req.params.table, req.body)
    .then((data) => handle(data, res));

export const select = (req, res) =>
  cassandra
    .select(req.params.table, req.body)
    .then((data) => handle(data, res));

export const selectUser = (req, res) =>
  cassandra
    .select("users", { uid: req.params.id })
    .then((data) => handle(data, res));

export const createUser = (req, res) =>
  cassandra.insertUser(req.body).then((data) => handle(data, res));

export const verifyUser = (req, res) =>
  cassandra.checkPassword(req.body).then((data) => handle(data, res));

export const update = (req, res) =>
  cassandra
    .update(req.params.table, req.body)
    .then((data) => handle(data, res));

export const updateUser = (req, res) =>
  cassandra
    .update("users", { keys: { uid: req.params.id }, ...req.body })
    .then((data) => handle(data, res));

export const addFriend = (req, res) =>
  cassandra
    .friendRequest(req.body)
    .then((data) => handle(data, res));

export const acceptRequest = (req, res) =>
  cassandra
    .acceptRequest(req.body)
    .then((data) => handle(data, res));

export const rejectRequest = (req, res) =>
  cassandra
    .rejectRequest(req.body)
    .then((data) => handle(data, res));

export const checkRequest = (req, res) =>
  cassandra
    .checkRequest(req.body)
    .then((data) => handle(data, res));

export const unfriend = (req, res) =>
  cassandra
    .unfriend(req.body)
    .then((data) => handle(data, res));