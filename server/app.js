import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import { swaggerUi, specs } from "./config/swagger.js";
import cors from "cors";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// CORS 설정
app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);

// Routes
app.get("/", (req, res) => {
    res.send("PROOV Backend Server is running!");
});

app.get("/projects", (req, res) => {
    res.send("프로젝트 테스트 중...");
});

app.use("/auth", authRoutes);

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
