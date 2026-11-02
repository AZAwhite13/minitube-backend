import express from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { videoSchema, commentSchema } from "../validators/schemas.js";
import { sendCommentNotification } from "../utils/mailer.js";

const router = express.Router();


router.post(
    "/:id/comments",
    authMiddleware,
    validate(commentSchema),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { text } = req.body;
            const userId = req.user.id;

            const videoResult = await pool.query(
                `SELECT
                    videos.title,
                    videos.user_id,
                    author.name AS author_name,
                    author.email AS author_email,
                    commenter.name AS commenter_name
                 FROM videos
                 JOIN users AS author ON videos.user_id = author.id
                 JOIN users AS commenter ON commenter.id = $2
                 WHERE videos.id = $1`,
                [id, userId]
            );

            if (videoResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Video not found"
                });
            }

            const video = videoResult.rows[0];

            const result = await pool.query(
                `INSERT INTO comments (video_id, user_id, text)
                 VALUES ($1, $2, $3)
                 RETURNING *`,
                [id, userId, text]
            );


            if (Number(video.user_id) !== Number(userId)) {
                try {
                    await sendCommentNotification(
                        video.author_email,
                        video.author_name,
                        video.title,
                        video.commenter_name,
                        text
                    );
                    console.log("Comment notification sent!");
                } catch (emailError) {
                    console.error(
                        "Comment notification failed:",
                        emailError.message
                    );
                }
            }

            res.status(201).json({
                message: "Comment added successfully",
                comment: result.rows[0]
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Server error"
            });
        }
    }
);

router.get("/:id/comments", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT
                comments.id,
                comments.text,
                comments.created_at,
                users.name AS author
             FROM comments
             JOIN users ON comments.user_id = users.id
             WHERE comments.video_id = $1
             ORDER BY comments.created_at ASC`,
            [id]
        );

        res.json({
            comments: result.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

router.post(
    "/",
    authMiddleware,
    validate(videoSchema),
    async (req, res) => {
        try {
            const { title, description, videoUrl } = req.body;
            const userId = req.user.id;

            const result = await pool.query(
                `INSERT INTO videos (user_id, title, description, video_url)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [userId, title, description, videoUrl]
            );

            res.status(201).json({
                message: "Video created successfully",
                video: result.rows[0]
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Server error"
            });
        }
    }
);

router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                videos.id,
                videos.title,
                videos.description,
                videos.video_url,
                videos.views,
                videos.created_at,
                users.name AS author
            FROM videos
            JOIN users ON videos.user_id = users.id
            ORDER BY videos.created_at DESC
        `); 

        res.json({
            videos: result.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({
                message: "Video not found"
            });
        }

        const result = await pool.query(
            `UPDATE videos
             SET views = views + 1
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Video not found"
            });
        }

        res.json({
            video: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const userId = req.user.id;

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({
                message: "Video not found"
            });
        }

        const videoResult = await pool.query(
            "SELECT * FROM videos WHERE id = $1",
            [id]
        );

        if (videoResult.rows.length === 0) {
            return res.status(404).json({
                message: "Video not found"
            });
        }

        if (Number(videoResult.rows[0].user_id) !== Number(userId)) {
            return res.status(403).json({
                message: "You cannot delete this video"
            });
        }

        await pool.query(
            "DELETE FROM videos WHERE id = $1",
            [id]
        );

        res.json({
            message: "Video deleted successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

router.delete("/:id/comments/:commentId", authMiddleware, async (req, res) => {
    try {
        const videoId = Number(req.params.id);
        const commentId = Number(req.params.commentId);
        const userId = req.user.id;

        if (
            !Number.isInteger(videoId) || videoId <= 0 ||
            !Number.isInteger(commentId) || commentId <= 0
        ) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        const result = await pool.query(
            `DELETE FROM comments
             WHERE id = $1
             AND video_id = $2
             AND user_id = $3
             RETURNING *`,
            [commentId, videoId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Comment not found or you are not the owner"
            });
        }

        res.json({
            message: "Comment deleted successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

router.delete("/me", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `DELETE FROM users
             WHERE id = $1
             RETURNING id, name, email`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json({
            message: "Account deleted successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

export default router;