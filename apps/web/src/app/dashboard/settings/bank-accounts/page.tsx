"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyBankAccountsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/bank-accounts");
  }, [router]);

  return null;
}
