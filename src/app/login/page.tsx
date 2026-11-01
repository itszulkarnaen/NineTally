"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || isLoading) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Email atau password salah.");
        setIsLoading(false);
        return;
      }

      // Login sukses! Redirect ke root (yang bakal routing otomatis ke /mobile atau /web)
      window.location.href = "/";
    } catch {
      setErrorMessage("Koneksi gagal. Coba lagi beberapa saat.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E3F2FD] flex items-center justify-center p-4 text-[#242921]">
      <div className="w-full max-w-sm bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        {/* App Branding */}
        <div className="text-center space-y-2">
          <div className="inline-block relative w-16 h-16 rounded-2xl overflow-hidden shadow-xs border border-[#EEEEEE] mb-1">
            <Image
              src="/NineTally.png"
              alt="NineTally Logo"
              fill
              sizes="64px"
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#242921]">NineTally</h1>
          <p className="text-xs text-[#666E61]">
            Personal Finance & Net Worth Tracker
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center gap-2.5 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#666E61] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full bg-[#E3F2FD]/40 border border-[#EEEEEE] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#242921] focus:outline-none focus:border-[#2196F3] focus:ring-1 focus:ring-[#2196F3] transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#666E61] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#E3F2FD]/40 border border-[#EEEEEE] rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-medium text-[#242921] focus:outline-none focus:border-[#2196F3] focus:ring-1 focus:ring-[#2196F3] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666E61] hover:text-[#242921] transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#2196F3] hover:bg-[#1E88E5] active:scale-[0.98] text-white font-bold py-3 rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <span>Masuk ke NineTally</span>
            )}
          </button>
        </form>

        {/* Security Footer */}
        <div className="pt-2 border-t border-[#EEEEEE] flex items-center justify-center gap-1.5 text-[10px] text-[#666E61]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2196F3]" />
          <span>Single-User Private Cloud</span>
        </div>
      </div>
    </div>
  );
}

