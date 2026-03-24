import type { Metadata, Viewport } from "next";
import "./globals.css";
import SwRegister from "./sw-register";

export const metadata: Metadata = {
  title: "PECS Board",
  description: "Picture Exchange Communication System for children with autism",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PECS Board",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Baloo+2:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-nunito">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
