import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuestGo — A little closer. A little more adventure.",
  description: "Turn a nearby hello into a shared real-world adventure. Explore the QuestGo experience.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
