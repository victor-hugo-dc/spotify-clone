import { Router } from "express";
import { db, isPosition, isText } from "../db.ts";

const router = Router();
const columns = "id AS _id, authorID, songID, commentBody, timestamp";

router.get("/all", (_req, res) => {
  res.send({ comments: db.prepare(`SELECT ${columns} FROM comments ORDER BY id`).all() });
});

router.get("/song/:song", (req, res) => {
  res.send({ comments: db.prepare(`SELECT ${columns} FROM comments WHERE songID = ? ORDER BY id`).all(req.params.song) });
});

router.post("/add", (req, res) => {
  const { authorID, songID, commentBody, timestamp } = req.body ?? {};
  if (!isText(authorID, 100) || !isText(songID, 100) || !isText(commentBody, 2000) || !isPosition(timestamp)) {
    res.sendStatus(400);
    return;
  }
  const { lastInsertRowid } = db
    .prepare("INSERT INTO comments (authorID, songID, commentBody, timestamp) VALUES (?, ?, ?, ?)")
    .run(authorID, songID, commentBody, timestamp);
  res.status(201).send({ comment: { _id: lastInsertRowid, authorID, songID, commentBody, timestamp } });
});

export default router;
