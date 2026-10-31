import { Router } from "express";
import { db, isPosition, isText } from "../db.ts";
import type { Author } from "../user.ts";

const router = Router();
const columns = "id, authorID, authorName, authorImage, songID, commentBody, timestamp";

router.get("/all", (_req, res) => {
  res.send({ comments: db.prepare(`SELECT ${columns} FROM comments ORDER BY id`).all() });
});

router.get("/song/:song", (req, res) => {
  res.send({ comments: db.prepare(`SELECT ${columns} FROM comments WHERE songID = ? ORDER BY id`).all(req.params.song) });
});

router.post("/add", (req, res) => {
  const { songID, commentBody, timestamp } = req.body ?? {};
  if (!isText(songID, 100) || !isText(commentBody, 2000) || !isPosition(timestamp)) {
    res.sendStatus(400);
    return;
  }
  const author: Author = res.locals.author;
  const { lastInsertRowid } = db
    .prepare("INSERT INTO comments (authorID, authorName, authorImage, songID, commentBody, timestamp) VALUES (?, ?, ?, ?, ?, ?)")
    .run(author.id, author.name, author.image, songID, commentBody, timestamp);
  res.status(201).send({
    comment: { id: Number(lastInsertRowid), authorID: author.id, authorName: author.name, authorImage: author.image, songID, commentBody, timestamp },
  });
});

export default router;
