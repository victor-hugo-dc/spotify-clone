import { Router } from "express";
import Comment from "../models/Comment.ts";

const router = Router();

router.get("/all", async (_req, res) => {
  const comments = await Comment.find();
  res.send({ comments });
});

router.get("/song/:song", async (req, res) => {
  const comments = await Comment.find({ songID: req.params.song });
  res.send({ comments });
});

router.post("/add", async (req, res) => {
  const { authorID, songID, commentBody, timestamp } = req.body;
  const comment = await Comment.create({ authorID, songID, commentBody, timestamp });
  res.status(201).send({ comment });
});

export default router;
