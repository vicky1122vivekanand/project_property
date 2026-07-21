/**
 * Measures how long each request takes to handle and:
 *  - attaches an `X-Response-Time` header so callers/tools can see it
 *  - logs a warning if a request exceeds the ≤ 2 second performance KPI
 *
 * This doesn't make requests faster by itself - it makes response time
 * visible so slow endpoints can be spotted during development, and gives
 * `npm run benchmark` something consistent to check against.
 */
const RESPONSE_TIME_TARGET_MS = 2000;

const responseTimeLogger = (req, res, next) => {
  const start = process.hrtime.bigint();

  const originalEnd = res.end;
  res.end = function patchedEnd(...args) {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

    if (!res.headersSent) {
      res.setHeader("X-Response-Time", `${durationMs.toFixed(1)}ms`);
    }

    if (durationMs > RESPONSE_TIME_TARGET_MS) {
      console.warn(
        `[SLOW >${RESPONSE_TIME_TARGET_MS}ms] ${req.method} ${req.originalUrl} took ${durationMs.toFixed(1)}ms`
      );
    } else if (process.env.LOG_RESPONSE_TIMES === "true") {
      console.log(`${req.method} ${req.originalUrl} - ${durationMs.toFixed(1)}ms`);
    }

    originalEnd.apply(res, args);
  };

  next();
};

module.exports = responseTimeLogger;
