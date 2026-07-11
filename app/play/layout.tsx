"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SoundProvider } from "@/features/sound/SoundProvider";
import { SoundControls } from "@/features/sound/SoundControls";
import { Asteroids } from "@/features/anim/Asteroids";
import "@/features/anim/anim.css";

/**
 * Play-area shell: mounts the sound engine + controls, the galaxy asteroid
 * backdrop, and animates route transitions. Server page components are passed
 * straight through as children.
 */
export default function PlayLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <SoundProvider>
      <Asteroids />
      <div key={pathname} className="page-enter">
        {children}
      </div>
      <SoundControls />
    </SoundProvider>
  );
}
