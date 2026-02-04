import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import { swaggerUi, specs } from "./config/swagger.js";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// Routes
app.get("/", (req, res) => {
    res.send("PROOV Backend Server is running!");
});

app.use("/auth", authRoutes);

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
