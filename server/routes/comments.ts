import { Router } from "express";
import type { SQLInputValue } from "node:sqlite";
import { db, isCoverUrl, isOptionalText, isPosition, isSongId, isText } from "../db.ts";
import type { Author } from "../user.ts";

const router = Router();
// Each comment with how many likes it has, whether the signed-in user ($user) is one of them, and how many replies.
const columns = `id, authorID, authorName, authorImage, songID, songName, songArtist, songImage, commentBody, timestamp, createdAt, parentID,
  (SELECT COUNT(*) FROM comment_likes WHERE commentID = comments.id) AS likes,
  EXISTS (SELECT 1 FROM comment_likes WHERE commentID = comments.id AND userID = $user) AS liked,
  (SELECT COUNT(*) FROM comments AS reply WHERE reply.parentID = comments.id) AS replies`;

// SQLite has no booleans: `liked` comes back as 1 or 0.
const find = (author: Author, where: string, ...params: SQLInputValue[]) =>
  (db.prepare(`SELECT ${columns} FROM comments ${where}`).all({ user: author.id }, ...params) as { liked: number }[]).map((comment) => ({
    ...comment,
    liked: comment.liked === 1,
  }));

// The feed: the newest 100, without replies (they're read under their comment, on the song's page).
router.get("/all", (_req, res) => {
  res.send({ comments: find(res.locals.author, "WHERE parentID IS NULL ORDER BY id DESC LIMIT 100") });
});

// The Social feed: the same, by the people the signed-in user follows on Spotify, whatever their likes.
router.get("/feed", (_req, res) => {
  res.send({ comments: find(res.locals.author, "WHERE parentID IS NULL AND authorID IN (SELECT followee FROM follows WHERE follower = $user) ORDER BY id DESC LIMIT 100") });
});

// A song's comments and their replies.
router.get("/song/:song", (req, res) => {
  res.send({ comments: find(res.locals.author, "WHERE songID = ? ORDER BY id", req.params.song) });
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

// With a parentID, a reply: under a top-level comment on the same song (one level deep, like a thread under a tweet),
// and about its moment in the song, whatever timestamp is sent.
router.post("/add", (req, res) => {
  const { songID, songName, songArtist, songImage, commentBody, timestamp, parentID = null } = req.body ?? {};
  const parent =
    parentID !== null && isSongId(songID) && Number.isSafeInteger(parentID)
      ? (db.prepare("SELECT timestamp FROM comments WHERE id = ? AND songID = ? AND parentID IS NULL").get(parentID, songID) as { timestamp: number } | undefined)
      : undefined;
  const at = parent?.timestamp ?? timestamp;
  if (
    !isSongId(songID) ||
    !isOptionalText(songName, 300) ||
    !isOptionalText(songArtist, 300) ||
    !isCoverUrl(songImage) ||
    !isText(commentBody, 2000) ||
    (parentID !== null && !parent) ||
    !isPosition(at)
  ) {
    res.sendStatus(400);
    return;
  }
  const author: Author = res.locals.author;
  const { lastInsertRowid } = db
    .prepare(
      "INSERT INTO comments (authorID, authorName, authorImage, songID, songName, songArtist, songImage, commentBody, timestamp, createdAt, parentID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(author.id, author.name, author.image, songID, songName ?? null, songArtist ?? null, songImage ?? null, commentBody, at, Date.now(), parentID);
  res.status(201).send({ comment: find(author, "WHERE id = ?", lastInsertRowid)[0] });
});

// Sets or clears the signed-in user's like, { "liked": true | false }, however often it's sent.
router.post("/:id/like", (req, res) => {
  const id = Number(req.params.id);
  const { liked } = req.body ?? {};
  if (!db.prepare("SELECT 1 FROM comments WHERE id = ?").get(id)) {
    res.sendStatus(404);
    return;
  }
  if (typeof liked !== "boolean") {
    res.sendStatus(400);
    return;
  }
  const author: Author = res.locals.author;
  if (liked) db.prepare("INSERT OR IGNORE INTO comment_likes (commentID, userID, createdAt) VALUES (?, ?, ?)").run(id, author.id, Date.now());
  else db.prepare("DELETE FROM comment_likes WHERE commentID = ? AND userID = ?").run(id, author.id);
  const { likes } = db.prepare("SELECT COUNT(*) AS likes FROM comment_likes WHERE commentID = ?").get(id) as { likes: number };
  res.send({ likes, liked });
});

export default router;
