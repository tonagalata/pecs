import { readFileSync } from "fs";
import { join } from "path";

export const contentType = "image/svg+xml";

export default function AppleIcon() {
  const svg = readFileSync(join(process.cwd(), "public", "pecs-logo.svg"));
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}
