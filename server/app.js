import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoute from "./routes/authRoute.js";
import projectRoute from "./routes/projectRoute.js";
import { swaggerUi, specs } from "./config/swagger.js";
import cors from "cors";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS 설정
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:5002",
    "http://127.0.0.1:5002",
    "http://54.236.227.121:5002",
    "http://54.236.227.121.nip.io:5002",
];

app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true, // 쿠키 전송 허용
    }),
);

// Routes
app.get("/", (req, res) => {
    res.send("PROOV Backend Server is running!");
});

app.use("/auth", authRoute);
app.use("/projects", projectRoute);

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
