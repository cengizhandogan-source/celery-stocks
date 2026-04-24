import { ImageResponse } from "next/og";

export const alt = "Coinly — Trade. Verify. Share.";
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
          background: "#060C0D",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Instrument Sans, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: "#FFD76A",
            letterSpacing: "-0.02em",
          }}
        >
          Coinly
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#A1A1AA",
            marginTop: 20,
            letterSpacing: "0.04em",
          }}
        >
          Trade. Verify. Share.
        </div>
        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 56,
            fontSize: 16,
            color: "#F5C542",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <span>Trades</span>
          <span style={{ color: "#52525B" }}>·</span>
          <span>Positions</span>
          <span style={{ color: "#52525B" }}>·</span>
          <span>Wallets</span>
          <span style={{ color: "#52525B" }}>·</span>
          <span>Chat</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
