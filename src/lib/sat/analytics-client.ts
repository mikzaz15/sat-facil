export type SatAnalyticsEventName =
  | "validation_run"
  | "validation_error_detected"
  | "corrected_xml_downloaded"
  | "batch_validation_run"
  | "batch_corrected_zip_downloaded";

export type TrackSatAnalyticsEventInput = {
  event_name: SatAnalyticsEventName;
  source_page: string;
  mode?: string;
  error_code?: string;
  detected_rule?: string;
  file_count?: number;
};

export async function trackSatAnalyticsEvent(
  input: TrackSatAnalyticsEventInput,
): Promise<void> {
  const response = await fetch("/api/sat/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let message = "No se pudo registrar evento de analytics.";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Ignore JSON parsing errors to keep analytics best-effort.
    }
    throw new Error(message);
  }
}
