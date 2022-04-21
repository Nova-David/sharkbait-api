import * as db from "./controller.js";
import express from "express";
import cors from "cors";
import * as http from "http";
import subdomain from "express-subdomain";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { Server } from 'socket.io';

const app = express();
const port = 80;
const router = express.Router();
const server = http.createServer(app);
const io = new Server(server)

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(cors());

/*WEBSITE*/

app.use("/db", express.static(join(__dirname, '..', 'public')));

app.get("/db/*", (req, res) => {
  res.sendFile("index.html", { root: join(__dirname, '..', "public") });
});

/*API*/

router.get("/", (req, res) => {
  res.send("Sharkbait API home. For more information, contact @David.");
});

/***************************
Get Database Information
****************************/

router.get("/tables", db.getTables);
router.post("/tables", db.getDataFromTable);

/****************
User functions
*****************/

router.get("/users/:id/friends", db.getAllFriends);
router.get("/users/:id/chats", db.getChats);
router.get("/users/:id", db.selectUser);
router.post("/users/:id", db.updateUser);
router.post("/verify", db.verifyUser);
router.post("/register", db.createUser);

/*************************
Friend System functions
**************************/

router.post("/friends/add", db.addFriend);
router.post("/friends/accept", db.acceptRequest);
router.post("/friends/reject", db.rejectRequest);
router.post("/friends/sent", db.checkRequest);
router.post("/friends/remove", db.unfriend);

/********************
Interests functions
********************/

router.post('/interests/add', db.addInterest);
router.post('/interests/remove', db.removeInterest);

/********************
Chat functions 
********************/

router.post('/chats/init', db.startChat)
router.get('/chats/:chat', db.selectChat)

/***********************************
SELECT and INSERT from/to any table
************************************/

router.get("/:table", db.selectAll);
router.post("/:table", db.insert);
router.delete("/:table", db.deleteData);
router.post("/:table/find", db.select);
router.patch("/:table", db.update);

app.use(subdomain("api", router));

/*******
SOCKET
*******/

io.on('connection', socket => {
  console.log("A user connected");

  /*************************
  Chat Socket Functions
  *************************/

  socket.on('getMessages', (chatID, res) => {
    db.getMessages(chatID, res).then(data => {
      socket.join(data);
    });
  });

  socket.on('sendMessage', (req, res) => {
    console.log("...sending a message");
    const chatID = req.chat_id
    db.newMessage(req, res).then(data => {
      io.to(chatID).emit('newMessage', req)

      db.getChat(req.chat_id, (data) => {
        if (data.error) {
          console.log(data);
          return;
        }
        for (let i = 0; i < data.members.length; i++) {
          
          io.to(data.members[i].uid).emit("chatUpdate", {...data, ...{members: data.members.filter(member => member.uid != data.members[i].uid)}}, data.members[i].uid);
        }
      })
    })
  });

  socket.on('typing', (req) => {
    io.to(req.chat_id).emit("typing", req);
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  })

  /**********************
  User Socket Functions
  **********************/

  socket.on("userConnection", uid => {
    console.log(uid, "joined");
    socket.join(uid);
  });

})

server.listen(port, function () {
  console.log("Server started on port", port);
});
