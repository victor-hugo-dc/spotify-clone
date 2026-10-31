import { Router } from "express";
import Annotation from "../models/Annotation.ts";

const router = Router();

router.get("/song/:song", async (req, res) => {
  const f_annotation = await Annotation.find({ songID: req.params.song });
  res.send({ f_annotation });
});

router.post("/add", async (req, res) => {
  const { authorID, songID, annotatedText, noteBody, timestamp } = req.body;
  const annotation = await Annotation.create({ authorID, songID, annotatedText, noteBody, timestamp });
  res.status(201).send({ annotation });
});

export default router;
