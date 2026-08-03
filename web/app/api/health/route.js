export function GET() {
  return Response.json({
    status: "ok",
    service: "humtrace-ai-web",
    phase: "phase-5-local-engineering",
    aiReleaseStatus: "disabled-until-approved-evaluation",
    generativeImages: false
  });
}
