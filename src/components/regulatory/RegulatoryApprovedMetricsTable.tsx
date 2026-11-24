"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  calculateRegulatoryValues,
  getRegulatoryTemplate,
} from "@/lib/regulatory/regulatoryTemplates";

type Props = { assessmentId: string; framework: "RCO" | "PAT" | "CCTS" };

type Submission = {
  status: string;
  templateId: string;
  values: Record<string, unknown>;
  version: number;
};

const columnLabels: Record<string, string> = {
  BASELINE: "Baseline year",
  ASSESSMENT: "Assessment year",
  TARGET: "Target year",
  VALUE: "Reported value",
  NOT_APPLICABLE: "Applicability",
};

export function RegulatoryApprovedMetricsTable({ assessmentId, framework }: Props) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/assessments/${encodeURIComponent(assessmentId)}/regulatory`,
        { cache: "no-store", credentials: "include" }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load approved metrics");
      setSubmission(
        payload.submission?.status === "APPROVED" ? payload.submission : null
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load approved metrics");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void load(true);
    const timer = window.setInterval(() => void load(false), 8000);
    return () => window.clearInterval(timer);
  }, [load]);

  const rows = useMemo(() => {
    if (!submission || submission.status !== "APPROVED") return [];
    const template = getRegulatoryTemplate(submission.templateId);
    if (!template || template.framework !== framework) return [];
    const calculated = {
      ...submission.values,
      ...calculateRegulatoryValues(submission.templateId, submission.values || {}),
    };
    return template.sections.flatMap((section) =>
      section.fields.map((field) => {
        const reportedParts = field.columns
          .map((column) => {
            const key = column === "VALUE" ? field.key : `${field.key}__${column}`;
            const raw = calculated[key];
            if (raw === undefined || raw === null || raw === "") return "";
            return field.columns.length === 1
              ? String(raw)
              : `${columnLabels[column] || column}: ${String(raw)}`;
          })
          .filter(Boolean);
        return {
          key: field.key,
          name: field.label,
          value: reportedParts.join(" | "),
          unit: field.unit,
          source: field.sourceRef || "Client-submitted summary sheet",
        };
      }).filter((row) => row.value !== "")
    );
  }, [submission, framework]);

  return (
    <section className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Structured Regulatory Compliance Metrics
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Approved and verified parameters, accounting basis, and calculation outcomes.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              <th className="py-3 px-4">Parameter</th>
              <th className="py-3 px-4">Reported Value</th>
              <th className="py-3 px-4">Source / Accounting Basis</th>
              <th className="py-3 px-4 text-center">Data Status</th>
              <th className="py-3 px-4 text-center">Version</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading approved metrics…</td></tr>
            ) : error ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-rose-600">{error}</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No approved regulatory values yet. Values will appear here after the client submits the summary sheet and the consultant completes final approval.
                </td>
              </tr>
            ) : rows.map((row: { key: string; name: string; value: string; unit: string; source: string }) => (
              <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">{row.name}</td>
                <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                  {row.value}{" "}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{row.unit}</span>
                </td>
                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{row.source}</td>
                <td className="py-3.5 px-4 text-center w-40">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Approved Final
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center font-mono text-slate-500">v{submission?.version || 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
