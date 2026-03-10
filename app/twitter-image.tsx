import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SpawnBoard — Design boards built for AI agents";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0A0A",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "radial-gradient(circle, #262626 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            opacity: 0.5,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: "#6366F1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 28,
            }}
          >
            <span style={{ fontSize: 36, fontWeight: 800, color: "white" }}>
              S
            </span>
          </div>

          <div style={{ display: "flex", marginBottom: 14 }}>
            <span
              style={{
                fontSize: 48,
                fontWeight: 800,
                color: "#FAFAFA",
                letterSpacing: "-0.02em",
              }}
            >
              SPAWN
            </span>
            <span
              style={{
                fontSize: 48,
                fontWeight: 800,
                color: "#6366F1",
                letterSpacing: "-0.02em",
              }}
            >
              BOARD
            </span>
          </div>

          <span style={{ fontSize: 22, color: "#A1A1A1", fontWeight: 400 }}>
            Design boards built for AI agents
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(to right, #6366F1, #818CF8, #6366F1)",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
