export async function GET() {
  const rebates = {
    "9000": 1728,
    "12000": 1728,
    "18000": 1836,
    "24000": 1836,
    "30000": 2144,
    "36000": 2144,
    "48000": 2632,
    "60000": 2872,
    updated: "2026-04-22",
  };

  return new Response(JSON.stringify(rebates), {
    headers: { "Content-Type": "application/json" },
  });
}
