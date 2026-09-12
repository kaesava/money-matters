"use client";

import React from "react";
import { t } from "@money-matters/i18n";

export function ProblemSection() {
  const problems = [
    {
      title: t("landing.problem1Title"),
      body: t("landing.problem1Body"),
      color: "text-rose-600 bg-rose-50 border-rose-200",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
    {
      title: t("landing.problem2Title"),
      body: t("landing.problem2Body"),
      color: "text-amber-600 bg-amber-50 border-amber-200",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: t("landing.problem3Title"),
      body: t("landing.problem3Body"),
      color: "text-blue-600 bg-blue-50 border-blue-200",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
    {
      title: t("landing.problem4Title"),
      body: t("landing.problem4Body"),
      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
    },
  ];

  return (
    <section
      id="why-us"
      className="bg-white border-y border-slate-200/80 py-20 scroll-mt-14"
      aria-label="Why Traditional Budgeting Fails"
    >
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 uppercase tracking-wider">
            {t("landing.problemSectionBadge")}
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
            {t("landing.problemSectionTitle")}
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">
            {t("landing.problemSectionSubtitle")}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((prob, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-[#F7F8FA] border border-slate-200/80 flex flex-col gap-3.5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all group"
            >
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold ${prob.color}`}
              >
                {prob.icon}
              </div>
              <h3 className="text-base font-extrabold text-[#1B2B4B] group-hover:text-[#2563eb] transition-colors leading-snug">
                {prob.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                {prob.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
