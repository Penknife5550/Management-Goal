import { redirect } from "next/navigation";

// Einstieg fuehrt auf die Startseite "Heute" (Gewinne ich?).
export default function Home() {
  redirect("/heute");
}
