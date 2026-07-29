import { ImageResponse } from "next/og";
import { getFeature } from "@/lib/features";

export const alt = "HINOMARCHE feature buying guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function FeatureOgImage({ params }: Props) {
  const { slug } = await params;
  const feature = getFeature(slug);
  const eyebrow = feature?.eyebrow ?? "BUYING GUIDE";
  const routeLabel = slug.replaceAll("-", " ").toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#f6f2e9",
          color: "#221f1a",
          padding: "72px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -190,
            right: -120,
            width: 500,
            height: 500,
            borderRadius: 500,
            backgroundColor: "rgba(188,0,45,0.1)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 10,
          }}
        >
          <span
            style={{
              display: "flex",
              width: 48,
              height: 48,
              borderRadius: 48,
              backgroundColor: "#bc002d",
            }}
          />
          HINOMARCHE
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#bc002d",
              fontWeight: 700,
              letterSpacing: 8,
            }}
          >
            FEATURE BUYING GUIDE
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 940,
              fontSize: 68,
              lineHeight: 1.08,
              fontWeight: 700,
              letterSpacing: 3,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: "#57534a",
              letterSpacing: 4,
            }}
          >
            {routeLabel}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid #d9d2c0",
            paddingTop: 24,
            fontSize: 20,
            color: "#57534a",
            letterSpacing: 5,
          }}
        >
          <span>JAPAN-RELATED GOODS</span>
          <span>HINOMARCHE.COM</span>
        </div>
      </div>
    ),
    size,
  );
}
