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

export const getMessages = (chatID, res) => {
  cassandra
    .getMessages({chat_id: chatID})
    .then(data => res(data))

  return new Promise(resolve => resolve(chatID))
}

export const newMessage = async (req, res) => {
  const data = await cassandra
    .insertMessageEverywhere(req)  
    res(req);
  
  return new Promise(resolve => resolve(req));
  
}

export const addInterest = (req, res) => {
  cassandra
    .addInterest(req.body)
    .then(data => handle(data, res));
}

export const removeInterest = (req, res) => {
  cassandra
    .removeInterest(req.body)
    .then(data => handle(data, res));
}

export const startChat = (req, res) => {
  cassandra
    .startChat(req.body)
    .then(data => handle(data, res));
}

export const selectChat = (req, res) => {
  cassandra
    .select('chats', {chat_id: req.params.chat})
    .then(data => handle(data, res));
}

export const getChats = (req, res) => {
  cassandra
    .getChats({uid: req.params.id})
    .then(data => handle(data, res));
}

export const getChat = (chatID, res) => {
  cassandra
    .getChat({chat_id: chatID})
    .then(data => res(data));
}

export const getAllFriends = (req, res) => {
  cassandra
    .allFriends({uid: req.params.id})
    .then(data => handle(data, res));
}