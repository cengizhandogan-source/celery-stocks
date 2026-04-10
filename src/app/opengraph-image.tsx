import { ImageResponse } from "next/og";

export const alt = "Celery Stocks — Professional Financial Terminal";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#1C1C1C",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "#eaeaea",
            letterSpacing: "0.05em",
          }}
        >
          CELERY STOCKS
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#888888",
            marginTop: 16,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Professional Financial Terminal
        </div>
        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 48,
            fontSize: 16,
            color: "#4ade80",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span>Stocks</span>
          <span style={{ color: "#555" }}>|</span>
          <span>Crypto</span>
          <span style={{ color: "#555" }}>|</span>
          <span>Portfolio</span>
          <span style={{ color: "#555" }}>|</span>
          <span>SEC Filings</span>
          <span style={{ color: "#555" }}>|</span>
          <span>AI Assistant</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
