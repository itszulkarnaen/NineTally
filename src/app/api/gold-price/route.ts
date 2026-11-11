import { NextResponse } from "next/server";

const TROY_OUNCE_IN_GRAMS = 31.1034768;

export async function GET() {
  // Primary: Gold Spot XAU/USD (gold-api.com) + USD/IDR (open.er-api.com)
  try {
    const [goldRes, fxRes] = await Promise.all([
      fetch("https://api.gold-api.com/price/XAU", {
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 300 },
      }),
      fetch("https://open.er-api.com/v6/latest/USD", {
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 300 },
      }),
    ]);

    if (goldRes.ok && fxRes.ok) {
      const goldJson = await goldRes.json();
      const fxJson = await fxRes.json();
      const xauUsd = Number(goldJson?.price);
      const usdIdr = Number(fxJson?.rates?.IDR);

      if (xauUsd > 0 && usdIdr > 0) {
        const pricePerGramIdr = Math.round((xauUsd * usdIdr) / TROY_OUNCE_IN_GRAMS);
        return NextResponse.json({
          pricePerGramIdr,
          xauUsd,
          usdIdr,
          source: "Spot Dunia (XAU/IDR)",
          updatedAt: goldJson?.updatedAt || new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn("Primary gold price fetch failed, trying fallback:", err);
  }

  // Fallback: CoinGecko PAX Gold (1 PAXG = 1 troy ounce of physical gold)
  try {
    const cgRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=idr",
      {
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 300 },
      }
    );

    if (cgRes.ok) {
      const cgJson = await cgRes.json();
      const paxgIdr = Number(cgJson?.["pax-gold"]?.idr);
      if (paxgIdr > 0) {
        const pricePerGramIdr = Math.round(paxgIdr / TROY_OUNCE_IN_GRAMS);
        return NextResponse.json({
          pricePerGramIdr,
          source: "PAXG Gold Reference (IDR)",
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn("Fallback gold price fetch failed:", err);
  }

  return NextResponse.json(
    { error: "Gagal mengambil harga emas live saat ini. Silakan isi harga per gram secara manual." },
    { status: 502 }
  );
}

