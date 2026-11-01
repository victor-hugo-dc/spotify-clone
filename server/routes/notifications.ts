import { Router } from "express";
import { db } from "../db.ts";
import type { Author } from "../user.ts";

const router = Router();
const month = 30 * 24 * 60 * 60 * 1000;

// What's New's news from Shoutify for the signed-in user ($user), from the last 30 days, newest first, never their own
// doing: replies to their comments and likes on them, by anyone, and the top-level comments of the people they follow.
// Each says who (user*), when (at, ms since 1970), the comment to show (the reply, the liked one, the new one) and its
// song, taken from the thread's top comment where the comment itself doesn't carry it (replies don't).
router.get("/", (_req, res) => {
  const author: Author = res.locals.author;
  const notifications = db
    .prepare(
      `SELECT 'reply' AS kind, reply.createdAt AS at, reply.authorID AS userID, reply.authorName AS userName, reply.authorImage AS userImage,
          reply.id AS commentID, reply.commentBody, mine.songID, mine.songName, mine.songArtist, mine.songImage
        FROM comments AS reply JOIN comments AS mine ON mine.id = reply.parentID
        WHERE mine.authorID = $user AND reply.authorID != $user AND reply.createdAt >= $since
      UNION ALL
      SELECT 'like', comment_likes.createdAt, users.id, users.name, users.image, liked.id, liked.commentBody, liked.songID,
          COALESCE(liked.songName, thread.songName), COALESCE(liked.songArtist, thread.songArtist), COALESCE(liked.songImage, thread.songImage)
        FROM comment_likes JOIN users ON users.id = comment_likes.userID JOIN comments AS liked ON liked.id = comment_likes.commentID
          LEFT JOIN comments AS thread ON thread.id = liked.parentID
        WHERE liked.authorID = $user AND comment_likes.userID != $user AND comment_likes.createdAt >= $since
      UNION ALL
      SELECT 'comment', createdAt, authorID, authorName, authorImage, id, commentBody, songID, songName, songArtist, songImage
        FROM comments WHERE parentID IS NULL AND authorID IN (SELECT followee FROM follows WHERE follower = $user) AND createdAt >= $since
      ORDER BY at DESC LIMIT 100`,
    )
    .all({ user: author.id, since: Date.now() - month });
  // When they last opened What's New, for its "new" dots: null if they never have.
  const { seenAt = null } = (db.prepare("SELECT seenAt FROM users WHERE id = ?").get(author.id) ?? {}) as { seenAt?: number | null };
  res.send({ notifications, seenAt });
});

// Opening What's New: everything up to now has been seen.
router.post("/seen", (_req, res) => {
  const author: Author = res.locals.author;
  const seenAt = Date.now();
  db.prepare("UPDATE users SET seenAt = ? WHERE id = ?").run(seenAt, author.id);
  res.send({ seenAt });
});

export default router;
