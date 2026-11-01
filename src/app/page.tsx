"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-detect mobile device via userAgent and viewport width
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent.toLowerCase()
    );
    const isSmallScreen = window.innerWidth <= 768;

    if (isMobileDevice || isSmallScreen) {
      router.replace("/mobile");
    } else {
      router.replace("/web");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#EAE2D6] flex flex-col items-center justify-center p-4">
      <div className="w-12 h-12 rounded-2xl bg-[#8B9A6E] flex items-center justify-center text-white text-xl font-bold shadow-sm animate-pulse mb-3">
        ₵
      </div>
      <p className="text-sm font-medium text-[#666E61]">Mendeteksi perangkat & memuat antarmuka...</p>
    </div>
  );
}
