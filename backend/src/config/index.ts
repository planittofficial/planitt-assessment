import dotenv from 'dotenv';
dotenv.config();

const config = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",

  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: "4h",

  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
  COOKIE_SECURE: process.env.NODE_ENV === "production",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "https://planitt-assessment.onrender.com",
};

export default config;
