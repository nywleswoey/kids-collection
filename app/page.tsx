import { redirect } from "next/navigation";

export default function Home() {
  // Entry point → profile picker (middleware/requireParent bounce to /signin if needed).
  redirect("/play");
}
