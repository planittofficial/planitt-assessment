import jwt from "jsonwebtoken";
import config from "../config";

export interface JwtPayload {
  userId: string;
  role: "ADMIN" | "CANDIDATE";
}

export function signJwt(payload: JwtPayload) {
  return jwt.sign(payload, config.JWT_SECRET, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expiresIn: config.JWT_EXPIRES_IN as any, // ❗ TS strictness vs jsonwebtoken types
  });
}
