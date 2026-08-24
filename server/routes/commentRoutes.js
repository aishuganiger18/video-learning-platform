const express = require("express");

const {
  createComment,
  getComment,
  getCommentsByVideo,
  updateComment,
  deleteComment,
  addLike,
  addDislike,
  addReport,
} = require("../models/comment");

const router = express.Router();

// GET comments for a video
router.get("/:videoId", (req, res) => {
  const comments = getCommentsByVideo(
    req.params.videoId
  );

  res.json({
    success: true,
    comments,
  });
});

// CREATE comment / reply
router.post("/", (req, res) => {
  const {
    userId,
    username,
    profilePicture,
    location,
    videoId,
    text,
    parentId,
    language,
  } = req.body;

  if (!userId || !username || !videoId || !text) {
    return res.status(400).json({
      success: false,
      message:
        "userId, username, videoId and text are required.",
    });
  }

  const comment = createComment({
    userId,
    username,
    profilePicture,
    location,
    videoId,
    text: text.trim(),
    parentId: parentId || null,
    language: language || "en",
  });

  res.status(201).json({
    success: true,
    comment,
  });
});

// EDIT comment
router.put("/:commentId", (req, res) => {
  const { userId, text } = req.body;

  if (!userId || !text) {
    return res.status(400).json({
      success: false,
      message: "userId and text are required.",
    });
  }

  const result = updateComment(
    req.params.commentId,
    userId,
    text.trim()
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// DELETE comment
router.delete("/:commentId", (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "userId is required.",
    });
  }

  const result = deleteComment(
    req.params.commentId,
    userId
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// LIKE comment
router.post("/:commentId/like", (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "userId is required.",
    });
  }

  const comment = addLike(
    req.params.commentId,
    userId
  );

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: "Comment not found.",
    });
  }

  res.json({
    success: true,
    comment,
  });
});

// DISLIKE comment
router.post("/:commentId/dislike", (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "userId is required.",
    });
  }

  const comment = addDislike(
    req.params.commentId,
    userId
  );

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: "Comment not found.",
    });
  }

  res.json({
    success: true,
    comment,
  });
});

// REPORT comment
router.post("/:commentId/report", (req, res) => {
  const {
    userId,
    reason,
    details = "",
  } = req.body;

  const allowedReasons = [
    "spam",
    "harassment",
    "offensive",
    "malicious_link",
    "other",
  ];

  if (!userId || !reason) {
    return res.status(400).json({
      success: false,
      message: "userId and reason are required.",
    });
  }

  if (!allowedReasons.includes(reason)) {
    return res.status(400).json({
      success: false,
      message: "Invalid report reason.",
    });
  }

  const result = addReport(
    req.params.commentId,
    {
      userId,
      reason,
      details,
    }
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// GET one comment
router.get("/single/:commentId", (req, res) => {
  const comment = getComment(
    req.params.commentId
  );

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: "Comment not found.",
    });
  }

  res.json({
    success: true,
    comment,
  });
});

module.exports = router;