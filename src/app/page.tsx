import { redirect } from "next/navigation";

// Einstieg fuehrt direkt ins Ziel-Cockpit.
export default function Home() {
  redirect("/ziele");
}
