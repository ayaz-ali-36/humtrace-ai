export function GET() {
  return Response.json({
    status: "ok",
    service: "humtrace-ai-web",
    phase: "phase-4.5-local-demo"
  });
}
