import { Router } from "express";
import { db, isPosition, isSongId, isText } from "../db.ts";
import type { Author } from "../user.ts";

const router = Router();

router.get("/song/:song", (req, res) => {
  const annotations = db
    .prepare("SELECT id, authorID, authorName, authorImage, songID, annotatedText, noteBody, timestamp FROM annotations WHERE songID = ? ORDER BY id")
    .all(req.params.song);
  res.send({ annotations });
});

router.post("/add", (req, res) => {
  const { songID, annotatedText, noteBody, timestamp } = req.body ?? {};
  if (!isSongId(songID) || !isText(annotatedText, 500) || !isText(noteBody, 2000) || !isPosition(timestamp)) {
    res.sendStatus(400);
    return;
  }
  const author: Author = res.locals.author;
  const { lastInsertRowid } = db
    .prepare("INSERT INTO annotations (authorID, authorName, authorImage, songID, annotatedText, noteBody, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(author.id, author.name, author.image, songID, annotatedText, noteBody, timestamp);
  res.status(201).send({
    annotation: { id: Number(lastInsertRowid), authorID: author.id, authorName: author.name, authorImage: author.image, songID, annotatedText, noteBody, timestamp },
  });
});

export default router;
