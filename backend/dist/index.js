"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const config_1 = __importDefault(require("./config"));
const auth_1 = __importDefault(require("./api/routes/auth"));
const attempt_1 = __importDefault(require("./api/routes/attempt"));
const db_1 = __importDefault(require("./config/db"));
const violation_1 = __importDefault(require("./api/routes/violation"));
const admin_1 = __importDefault(require("./api/routes/admin"));
const result_1 = __importDefault(require("./api/routes/result"));
const app = (0, express_1.default)();
// ---------- Middlewares ----------
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));
// ---------- Routes ----------
app.use("/api/auth", auth_1.default);
app.use("/api/attempts", attempt_1.default);
app.use("/api/violations", violation_1.default);
app.use("/api/admin", admin_1.default);
app.use("/api/results", result_1.default);
// ---------- Error Handler ----------
app.use((err, req, res, _next) => {
    console.error("❌ Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
});
// ---------- Start Server AFTER DB Ready ----------
async function startServer() {
    try {
        await db_1.default.query("SELECT 1");
        console.log("🚀 Database connected");
        app.listen(config_1.default.PORT, () => {
            console.log(`🚀 Server running on port ${config_1.default.PORT} (${config_1.default.NODE_ENV})`);
        });
    }
    catch (error) {
        console.error("❌ Database connection failed:", error);
        process.exit(1); // VERY IMPORTANT
    }
}
startServer();
