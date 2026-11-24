"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { CarbonCrunchLoader } from "@/components/common/CarbonCrunchLoader";
import { RegulatoryMetricsPanel } from "@/components/regulatory/RegulatoryMetricsPanel";
import type { RegulatoryFramework } from "@/lib/regulatory/regulatoryTemplates";

type AssessmentInfo = {
  _id: string;
  facilityId: string;
  framework: RegulatoryFramework;
  period: string;
};

export default function ClientRegulatorySummarySheetPage() {
  const params = useParams<{ assessmentId: string }>();
  const assessmentId = params.assessmentId;
  const { currentRole } = useAuth();
  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (currentRole !== "CLIENT" || !assessmentId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/assessments/${encodeURIComponent(assessmentId)}/regulatory`,
          { cache: "no-store", credentials: "include" }
        );
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to open this summary sheet");
        if (!payload.submission) throw new Error("The consultant has not sent this summary-sheet request, or it is no longer available.");
        if (!["RCO", "PAT", "CCTS"].includes(payload.assessment?.framework)) {
          throw new Error("This assessment does not have a supported regulatory summary sheet.");
        }
        if (active) setAssessment({
          _id: payload.assessment._id,
          facilityId: payload.assessment.facilityId,
          framework: payload.assessment.framework,
          period: payload.assessment.period,
        });
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to open this summary sheet");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [assessmentId, currentRole]);

  if (currentRole !== "CLIENT") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          This summary-sheet page is available to client accounts only.
        </p>
        <Link href="/dashboard" className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-700">
          <ArrowLeft size={16} /> Return to workspace
        </Link>
      </main>
    );
  }

  if (loading) return <CarbonCrunchLoader message="Opening your regulatory summary sheet..." />;

  return (
    <main className="mx-auto max-w-8xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/portal/regulatory"
        className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
      >
        <ArrowLeft size={16} /> Back to regulatory requests
      </Link>
      <header className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          <FileSpreadsheet size={16} /> Client data entry
        </div>
        <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Complete regulatory summary sheet</h1>
        {assessment && (
          <p className="mt-1 text-sm text-slate-500">
            {assessment.framework} · Facility {assessment.facilityId} · Reporting period {assessment.period}
          </p>
        )}
      </header>
      {error ? (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : assessment ? (
        <RegulatoryMetricsPanel
          assessmentId={assessment._id}
          framework={assessment.framework}
          period={assessment.period}
          facilityId={assessment.facilityId}
        />
      ) : null}
    </main>
  );
}
