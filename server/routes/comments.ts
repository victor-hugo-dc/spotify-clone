import { Router } from "express";
import { db, isCoverUrl, isOptionalText, isPosition, isSongId, isText } from "../db.ts";
import type { Author } from "../user.ts";

const router = Router();
const columns = "id, authorID, authorName, authorImage, songID, songName, songArtist, songImage, commentBody, timestamp, createdAt";

// The feed: the newest 100.
router.get("/all", (_req, res) => {
  res.send({ comments: db.prepare(`SELECT ${columns} FROM comments ORDER BY id DESC LIMIT 100`).all() });
});

router.get("/song/:song", (req, res) => {
  res.send({ comments: db.prepare(`SELECT ${columns} FROM comments WHERE songID = ? ORDER BY id`).all(req.params.song) });
});

// How many comments each of up to 100 songs has, for track lists: GET /counts?songs=id1,id2,...
router.get("/counts", (req, res) => {
  const songs = typeof req.query.songs === "string" ? req.query.songs.split(",") : [];
  if (songs.length > 100 || !songs.every(isSongId)) {
    res.sendStatus(400);
    return;
  }
  const rows = songs.length
    ? (db
        .prepare(`SELECT songID, COUNT(*) AS count FROM comments WHERE songID IN (${songs.map(() => "?").join(",")}) GROUP BY songID`)
        .all(...songs) as { songID: string; count: number }[])
    : [];
  res.send({ counts: Object.fromEntries(rows.map((row) => [row.songID, row.count])) });
});

router.post("/add", (req, res) => {
  const { songID, songName, songArtist, songImage, commentBody, timestamp } = req.body ?? {};
  if (
    !isSongId(songID) ||
    !isOptionalText(songName, 300) ||
    !isOptionalText(songArtist, 300) ||
    !isCoverUrl(songImage) ||
    !isText(commentBody, 2000) ||
    !isPosition(timestamp)
  ) {
    res.sendStatus(400);
    return;
  }
  const author: Author = res.locals.author;
  const song = { songName: songName ?? null, songArtist: songArtist ?? null, songImage: songImage ?? null };
  const createdAt = Date.now();
  const { lastInsertRowid } = db
    .prepare(
      "INSERT INTO comments (authorID, authorName, authorImage, songID, songName, songArtist, songImage, commentBody, timestamp, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(author.id, author.name, author.image, songID, song.songName, song.songArtist, song.songImage, commentBody, timestamp, createdAt);
  res.status(201).send({
    comment: { id: Number(lastInsertRowid), authorID: author.id, authorName: author.name, authorImage: author.image, songID, ...song, commentBody, timestamp, createdAt },
  });
});

export default router;
