const crypto = require("crypto");

const comments = new Map();

function createComment({
  userId,
  username,
  profilePicture = "",
  location = "",
  videoId,
  text,
  parentId = null,
  language = "en",
}) {
  const now = new Date().toISOString();

  const comment = {
    id: crypto.randomUUID(),

    userId,
    username,
    profilePicture,
    location,

    videoId,
    parentId,

    text,
    language,

    createdAt: now,
    updatedAt: now,
    edited: false,

    likes: [],
    dislikes: [],

    mentions: [],

    reports: [],

    deleted: false,
    deletedAt: null,

    history: [
      {
        action: "created",
        text,
        timestamp: now,
      },
    ],
  };

  comments.set(comment.id, comment);

  return comment;
}

function getComment(commentId) {
  return comments.get(commentId) || null;
}

function getCommentsByVideo(videoId) {
  return Array.from(comments.values()).filter(
    (comment) =>
      comment.videoId === videoId &&
      !comment.deleted
  );
}

function updateComment(commentId, userId, newText) {
  const comment = comments.get(commentId);

  if (!comment) {
    return {
      success: false,
      message: "Comment not found.",
    };
  }

  if (comment.userId !== userId) {
    return {
      success: false,
      message: "You can edit only your own comment.",
    };
  }

  const now = new Date();

  const createdTime = new Date(comment.createdAt);

  const minutesPassed =
    (now - createdTime) / (1000 * 60);

  // Edit allowed for 15 minutes
  if (minutesPassed > 15) {
    return {
      success: false,
      message:
        "Edit time limit has expired.",
    };
  }

  comment.history.push({
    action: "edited",
    text: newText,
    timestamp: now.toISOString(),
  });

  comment.text = newText;
  comment.updatedAt = now.toISOString();
  comment.edited = true;

  return {
    success: true,
    comment,
  };
}

function deleteComment(commentId, userId) {
  const comment = comments.get(commentId);

  if (!comment) {
    return {
      success: false,
      message: "Comment not found.",
    };
  }

  if (comment.userId !== userId) {
    return {
      success: false,
      message:
        "You can delete only your own comment.",
    };
  }

  const now = new Date();

  const createdTime = new Date(comment.createdAt);

  const minutesPassed =
    (now - createdTime) / (1000 * 60);

  // Delete allowed for 15 minutes
  if (minutesPassed > 15) {
    return {
      success: false,
      message:
        "Delete time limit has expired.",
    };
  }

  comment.deleted = true;
  comment.deletedAt = now.toISOString();

  comment.history.push({
    action: "deleted",
    timestamp: now.toISOString(),
  });

  return {
    success: true,
    comment,
  };
}

function addLike(commentId, userId) {
  const comment = comments.get(commentId);

  if (!comment) {
    return null;
  }

  comment.dislikes = comment.dislikes.filter(
    (id) => id !== userId
  );

  if (!comment.likes.includes(userId)) {
    comment.likes.push(userId);
  } else {
    comment.likes = comment.likes.filter(
      (id) => id !== userId
    );
  }

  return comment;
}

function addDislike(commentId, userId) {
  const comment = comments.get(commentId);

  if (!comment) {
    return null;
  }

  comment.likes = comment.likes.filter(
    (id) => id !== userId
  );

  if (!comment.dislikes.includes(userId)) {
    comment.dislikes.push(userId);
  } else {
    comment.dislikes = comment.dislikes.filter(
      (id) => id !== userId
    );
  }

  return comment;
}

function addReport(commentId, report) {
  const comment = comments.get(commentId);

  if (!comment) {
    return {
      success: false,
      message: "Comment not found.",
    };
  }

  const alreadyReported = comment.reports.some(
    (existing) =>
      existing.userId === report.userId
  );

  if (alreadyReported) {
    return {
      success: false,
      message:
        "You have already reported this comment.",
    };
  }

  comment.reports.push({
    id: crypto.randomUUID(),
    ...report,
    createdAt: new Date().toISOString(),
    status: "pending",
  });

  return {
    success: true,
    comment,
  };
}

module.exports = {
  createComment,
  getComment,
  getCommentsByVideo,
  updateComment,
  deleteComment,
  addLike,
  addDislike,
  addReport,
};