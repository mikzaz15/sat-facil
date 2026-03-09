"use client";

import { useEffect } from "react";

import { trackGaEvent } from "@/lib/ga";

type AuthFormGaTrackerProps = {
  formId: string;
  eventName: "login" | "sign_up";
};

export function AuthFormGaTracker({
  formId,
  eventName,
}: AuthFormGaTrackerProps) {
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) return;

    const onSubmit = () => {
      trackGaEvent(eventName, {
        method: "email_password",
        source_form: formId,
      });
    };

    form.addEventListener("submit", onSubmit);
    return () => {
      form.removeEventListener("submit", onSubmit);
    };
  }, [formId, eventName]);

  return null;
}
