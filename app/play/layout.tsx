"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SoundProvider } from "@/features/sound/SoundProvider";
import { SoundControls } from "@/features/sound/SoundControls";
import "@/features/anim/anim.css";

/**
 * Play-area shell: mounts the sound engine + controls and animates route
 * transitions. Server page components are passed straight through as children.
 */
export default function PlayLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <SoundProvider>
      <div key={pathname} className="page-enter">
        {children}
      </div>
      <SoundControls />
    </SoundProvider>
  );
}
