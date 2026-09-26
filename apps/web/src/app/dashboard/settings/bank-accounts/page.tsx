"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyBankAccountsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/settings?tab=bank-accounts");
  }, [router]);

  return null;
}
