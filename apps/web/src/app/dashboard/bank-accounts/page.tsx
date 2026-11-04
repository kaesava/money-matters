"use client";

import { Suspense } from "react";
import { BankAccountsSection } from "../settings/components/BankAccountsSection";
import { Spinner } from "@money-matters/ui/web";

export default function BankAccountsDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[40vh]">
          <Spinner size="lg" />
        </div>
      }
    >
      <div data-tour="bank-accounts">
        <BankAccountsSection />
      </div>
    </Suspense>
  );
}

