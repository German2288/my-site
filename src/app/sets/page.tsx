import type { Metadata } from "next";
import SetsExplorer from "@/components/sets/SetsExplorer";

export const metadata: Metadata = {
  title: "Парные сеты аватар + баннер — Discord Profile Designer",
  description: "Готовые бесшовные сеты: аватарка продолжается из баннера без шва.",
};

export default function SetsPage() {
  return <SetsExplorer />;
}
