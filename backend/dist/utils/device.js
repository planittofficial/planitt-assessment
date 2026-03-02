"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMobileOrTabletRequest = isMobileOrTabletRequest;
function isMobileOrTabletRequest(req) {
    const secChUaMobile = String(req.headers["sec-ch-ua-mobile"] || "").trim();
    if (secChUaMobile === "?1")
        return true;
    const userAgent = String(req.headers["user-agent"] || "");
    const mobileOrTabletPattern = /Android|iPhone|iPad|iPod|Mobile|Tablet|BlackBerry|IEMobile|Opera Mini|Silk|Kindle/i;
    return mobileOrTabletPattern.test(userAgent);
}
