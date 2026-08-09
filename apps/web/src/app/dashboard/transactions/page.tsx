"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyTransactionsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/settings/history");
  }, [router]);

  return null;
}
