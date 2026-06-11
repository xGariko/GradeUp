// Vercel serverless function that serves the Angular SSR app.
// Angular's application builder (outputMode: "server") emits server/server.mjs,
// which exports `reqHandler` (created via createNodeRequestHandler in src/server.ts).
// Vercel invokes this default export as a Node (req, res) handler.
export default import('../dist/GradeUp/server/server.mjs').then((m) => m.reqHandler);
