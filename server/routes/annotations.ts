import { Router } from "express";
import { db, isPosition, isText } from "../db.ts";

const router = Router();

router.get("/song/:song", (req, res) => {
  const f_annotation = db
    .prepare("SELECT id AS _id, authorID, songID, annotatedText, noteBody, timestamp FROM annotations WHERE songID = ? ORDER BY id")
    .all(req.params.song);
  res.send({ f_annotation });
});

router.post("/add", (req, res) => {
  const { authorID, songID, annotatedText, noteBody, timestamp } = req.body ?? {};
  if (!isText(authorID, 100) || !isText(songID, 100) || !isText(annotatedText, 500) || !isText(noteBody, 2000) || !isPosition(timestamp)) {
    res.sendStatus(400);
    return;
  }
  const { lastInsertRowid } = db
    .prepare("INSERT INTO annotations (authorID, songID, annotatedText, noteBody, timestamp) VALUES (?, ?, ?, ?, ?)")
    .run(authorID, songID, annotatedText, noteBody, timestamp);
  res.status(201).send({ annotation: { _id: lastInsertRowid, authorID, songID, annotatedText, noteBody, timestamp } });
});

export default router;
