import { ImageResponse } from "next/og";

/**
 * OGP画像(SNSシェア時のサムネイル)。
 * satoriの同梱フォントはラテン文字のみのため、日本語は使わずロゴ表現で構成。
 */

export const alt = "HINOMARCHE - Curated goods deeply connected to Japan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
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
          backgroundColor: "#f6f2e9",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: 480,
            backgroundColor: "rgba(188,0,45,0.08)",
          }}
        />
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: 160,
            backgroundColor: "#bc002d",
            boxShadow: "0 8px 40px rgba(188,0,45,0.35)",
          }}
        />
        <div
          style={{
            marginTop: 48,
            fontSize: 84,
            letterSpacing: 24,
            color: "#221f1a",
            fontWeight: 700,
          }}
        >
          HINOMARCHE
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 28,
            letterSpacing: 12,
            color: "#57534a",
          }}
        >
          MADE-IN-JAPAN FOCUSED SELECT SHOP
        </div>
      </div>
    ),
    size
  );
}
