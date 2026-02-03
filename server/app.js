import express from "express";

const app = express();

app.get("/", (req, res) => {
    res.send("CI/CD Test 배포 자동화 테스트");
});

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});