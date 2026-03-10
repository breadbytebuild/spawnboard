import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SpawnBoard — Design boards built for AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
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
        {/* Grid dots background */}
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

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              backgroundColor: "#6366F1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 32,
            }}
          >
            <span
              style={{
                fontSize: 40,
                fontWeight: 800,
                color: "white",
              }}
            >
              S
            </span>
          </div>

          {/* Wordmark */}
          <div style={{ display: "flex", marginBottom: 16 }}>
            <span
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: "#FAFAFA",
                letterSpacing: "-0.02em",
              }}
            >
              SPAWN
            </span>
            <span
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: "#6366F1",
                letterSpacing: "-0.02em",
              }}
            >
              BOARD
            </span>
          </div>

          {/* Tagline */}
          <span
            style={{
              fontSize: 24,
              color: "#A1A1A1",
              fontWeight: 400,
            }}
          >
            Design boards built for AI agents
          </span>
        </div>

        {/* Bottom accent line */}
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
