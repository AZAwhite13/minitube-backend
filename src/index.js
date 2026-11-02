import express from "express";
import cors from "cors";
import pool from "./db.js";
import authRoutes from "./routes/auth.routes.js";
import videoRoutes from "./routes/video.routes.js";
import { verifyEmailConnection } from "./utils/mailer.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/videos", videoRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({ message: "MiniTube Backend is working!" });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      message: "Database connected successfully!",
      time: result.rows[0].now
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Database connection failed"
    });
  }
});
app.get("/api/test-email", async (req, res) => {
    try {
        console.log("EMAIL_USER:", process.env.EMAIL_USER);
        console.log(
            "EMAIL_PASSWORD exists:",
            Boolean(process.env.EMAIL_PASSWORD)
        );

        await verifyEmailConnection();

        res.json({
            message: "Email connection successful!"
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Email connection failed",
            error: error.message
        });
    }
});

app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        message: "Internal Server Error"
    });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});