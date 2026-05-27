export async function GET() {
  return Response.json({
    ok: true,
    app: "z-type",
    timestamp: new Date().toISOString(),
  });
}
