import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "JengaNasi | Construction project management, together",
    template: "%s | JengaNasi",
  },
  description:
    "Bring your construction projects and people into one clear view. Build with confidence and keep your team moving forward with JengaNasi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
