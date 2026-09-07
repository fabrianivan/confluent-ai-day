import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KRAKATAU SENTINEL — Real-Time Disaster & Seismic Intelligence",
  description: "Real-Time AI for Disaster & Megathrust Intelligence with Early Warning. Streaming intelligence platform powered by Confluent Cloud, Apache Flink, and Google Gemini AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
