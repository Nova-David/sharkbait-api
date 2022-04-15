import * as db from "./controller.js";
import express from "express";
import cors from "cors";
import * as http from "http";
import subdomain from "express-subdomain";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 80;
const router = express.Router();

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

router.get("/users/:id", db.selectUser);
router.post("/users/:id", db.updateUser);
router.post("/verify", db.verifyUser);

/***********************************
SELECT and INSERT from/to any table
************************************/

router.get("/:table", db.selectAll);
router.post("/:table", db.insert);
router.post("/:table/find", db.select);
router.patch("/:table", db.update);

app.use(subdomain("api", router));

http.createServer(app).listen(port, function () {
  console.log("Server started on port", port);
});
