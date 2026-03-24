import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          borderRadius: 112,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 300,
        }}
      >
        🗣️
      </div>
    ),
    { ...size }
  );
}
