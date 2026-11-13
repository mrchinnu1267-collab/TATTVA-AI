"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RecoveryRedirectGuard() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const search = window.location.search;
    const hash = window.location.hash;

    const isRecovery =
      search.includes("type=recovery") ||
      hash.includes("type=recovery") ||
      search.includes("error_code=otp_expired") ||
      hash.includes("error_code=otp_expired") ||
      search.includes("next=%2Freset-password") ||
      search.includes("next=/reset-password") ||
      search.includes("token_hash=") ||
      (search.includes("error=access_denied") && search.includes("expired")) ||
      (hash.includes("error=access_denied") && hash.includes("expired"));

    if (isRecovery) {
      router.replace("/reset-password" + search + hash);
    }
  }, [router]);

  return null;
}
