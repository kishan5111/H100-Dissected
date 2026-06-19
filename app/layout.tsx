import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "H100 Dissected",
  description: "An interactive guide to NVIDIA H100 hardware and its CUDA, Triton, and PyTorch execution model."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
