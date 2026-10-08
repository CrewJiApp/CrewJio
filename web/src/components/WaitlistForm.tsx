"use client";

import { CheckIcon, CopyIcon, ShareNetworkIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { useId, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { AIRLINES, ROLES, waitlistSchema, type WaitlistInput, type WaitlistResponse } from "@/lib/waitlist";

type FieldErrors = Partial<Record<keyof WaitlistInput, string>>;
type Phase =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "done"; already: boolean; firstName: string }
  | { kind: "failed"; message: string };

const FIELD_ORDER: (keyof WaitlistInput)[] = ["firstName", "email", "instagram", "role", "airline", "painPoint", "wantsBeta", "consent"];

const inputClass =
  "w-full min-h-12 rounded-2xl bg-night px-4 text-[16px] text-cloud placeholder:text-faint ring-1 ring-line transition-[box-shadow,background-color] duration-300 ease-fluid hover:ring-white/20 focus:outline-none focus:ring-2 focus:ring-amber aria-[invalid=true]:ring-danger";

export function WaitlistForm() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();

  function read(form: HTMLFormElement) {
    const fd = new FormData(form);
    const text = (k: string) => (fd.get(k) as string | null) ?? "";
    return {
      firstName: text("firstName"),
      email: text("email"),
      instagram: text("instagram") || undefined,
      role: text("role"),
      airline: text("airline"),
      painPoint: text("painPoint") || undefined,
      wantsBeta: text("wantsBeta") === "yes",
      wantsBetaAnswered: fd.has("wantsBeta"),
      consent: fd.get("consent") === "on",
      company: text("company") || undefined,
    };
  }

  function focusFirstError(errs: FieldErrors) {
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase.kind === "submitting") return;
    const { wantsBetaAnswered, ...values } = read(e.currentTarget);

    const parsed = waitlistSchema.safeParse(values);
    const errs: FieldErrors = {};
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>;
      for (const [k, v] of Object.entries(flat)) if (v?.[0]) errs[k as keyof WaitlistInput] = v[0];
    }
    if (!wantsBetaAnswered) errs.wantsBeta = "Pick yes or no";
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      focusFirstError(errs);
      return;
    }

    setPhase({ kind: "submitting" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await res.json()) as WaitlistResponse;
      switch (body.status) {
        case "joined":
        case "already_joined":
          setPhase({ kind: "done", already: body.status === "already_joined", firstName: values.firstName.trim() });
          break;
        case "invalid":
          setErrors(body.fieldErrors);
          focusFirstError(body.fieldErrors);
          setPhase({ kind: "idle" });
          break;
        case "rate_limited":
          setPhase({ kind: "failed", message: "Too many tries from this connection. Give it a few minutes, then try again." });
          break;
        default:
          throw new Error("server error");
      }
    } catch {
      setPhase({ kind: "failed", message: `Something went wrong on our side. Try again, or email ${CONTACT_EMAIL}.` });
    }
  }

  if (phase.kind === "done") return <ThankYou already={phase.already} firstName={phase.firstName} />;

  const err = (k: keyof WaitlistInput) =>
    errors[k] ? (
      <p id={`${id}-${k}-error`} className="text-sm text-danger">
        {errors[k]}
      </p>
    ) : null;
  const described = (k: keyof WaitlistInput, help?: string) =>
    [help, errors[k] ? `${id}-${k}-error` : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-firstName`} className="text-sm font-medium text-muted">
            First name
          </label>
          <input
            id={`${id}-firstName`}
            name="firstName"
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="next"
            className={inputClass}
            aria-invalid={!!errors.firstName}
            aria-describedby={described("firstName")}
          />
          {err("firstName")}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-email`} className="text-sm font-medium text-muted">
            Email
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            inputMode="email"
            autoComplete="email"
            className={inputClass}
            aria-invalid={!!errors.email}
            aria-describedby={described("email")}
          />
          {err("email")}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-instagram`} className="text-sm font-medium text-muted">
          Instagram handle <span className="text-faint">(optional)</span>
        </label>
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">
            @
          </span>
          <input
            id={`${id}-instagram`}
            name="instagram"
            enterKeyHint="next"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className={`${inputClass} pl-9`}
            aria-invalid={!!errors.instagram}
            aria-describedby={described("instagram")}
          />
        </div>
        {err("instagram")}
      </div>

      <Choice
        legend="I'm"
        name="role"
        options={ROLES}
        error={errors.role}
        errorId={`${id}-role-error`}
      />
      <Choice
        legend="Airline"
        name="airline"
        options={AIRLINES}
        error={errors.airline}
        errorId={`${id}-airline-error`}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-painPoint`} className="text-sm font-medium text-muted">
          Most annoying part of planning around rosters? <span className="text-faint">(optional)</span>
        </label>
        <textarea
          id={`${id}-painPoint`}
          name="painPoint"
          rows={3}
          maxLength={1000}
          className={`${inputClass} min-h-24 resize-y py-3 leading-relaxed`}
          aria-invalid={!!errors.painPoint}
          aria-describedby={described("painPoint")}
        />
        {err("painPoint")}
      </div>

      <Choice
        legend="Want to be a beta tester?"
        name="wantsBeta"
        options={[
          { value: "yes", label: "Yes, count me in" },
          { value: "no", label: "Not yet" },
        ]}
        error={errors.wantsBeta}
        errorId={`${id}-wantsBeta-error`}
      />

      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl p-1">
          <input
            type="checkbox"
            name="consent"
            className="peer sr-only"
            aria-invalid={!!errors.consent}
            aria-describedby={described("consent")}
          />
          <span
            aria-hidden
            className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-night ring-1 ring-line transition-colors duration-300 ease-fluid peer-checked:bg-amber peer-checked:ring-amber peer-focus-visible:ring-2 peer-focus-visible:ring-amber peer-checked:[&>svg]:opacity-100"
          >
            <CheckIcon size={14} weight="bold" className="text-on-amber opacity-0" />
          </span>
          <span className="text-sm leading-relaxed text-muted">
            I agree to CrewJio collecting and using these details to email me about CrewJio, as set out in the{" "}
            <a href="/privacy" className="text-cloud underline decoration-white/30 underline-offset-4 hover:decoration-amber">
              privacy policy
            </a>
            , in line with Singapore&apos;s PDPA. I can unsubscribe any time.
          </span>
        </label>
        {err("consent")}
      </div>

      {/* Honeypot: hidden from people and screen readers, tempting to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-company`}>Company</label>
        <input id={`${id}-company`} name="company" tabIndex={-1} autoComplete="off" />
      </div>

      {phase.kind === "failed" && (
        <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger ring-1 ring-danger/30">
          {phase.message}
        </p>
      )}

      <button
        type="submit"
        disabled={phase.kind === "submitting"}
        className="group inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-amber px-6 text-base font-semibold text-on-amber shadow-[0_10px_40px_-12px_rgb(245_182_66/0.55),inset_0_1px_0_rgb(255_255_255/0.35)] transition-[transform,background-color] duration-500 ease-fluid hover:bg-[#f8c25d] active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 sm:w-auto sm:self-start sm:pl-7 sm:pr-7"
      >
        {phase.kind === "submitting" ? (
          <>
            <SpinnerGapIcon size={18} className="animate-spin motion-reduce:animate-none" aria-hidden />
            Adding you
          </>
        ) : (
          "Join the waitlist"
        )}
      </button>
    </form>
  );
}

function Choice({
  legend,
  name,
  options,
  error,
  errorId,
}: {
  legend: string;
  name: string;
  options: readonly { value: string; label: string }[];
  error?: string;
  errorId: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-medium text-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className="relative">
            <input type="radio" name={name} value={o.value} className="peer sr-only" />
            <span className="flex min-h-11 cursor-pointer items-center rounded-full bg-night px-4 text-[15px] text-cloud ring-1 ring-line transition-[background-color,box-shadow,color] duration-300 ease-fluid hover:ring-white/20 peer-checked:bg-amber/12 peer-checked:text-amber peer-checked:ring-amber peer-focus-visible:ring-2 peer-focus-visible:ring-amber">
              {o.label}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function ThankYou({ already, firstName }: { already: boolean; firstName: string }) {
  const [copied, setCopied] = useState<"idle" | "copied" | "manual">("idle");
  // Phones get the native share sheet (WhatsApp, Telegram...). Desktops copy the link.
  const [canShare] = useState(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The thank-you is shorter than the form, so bring it into view (on a phone the
  // page would otherwise be left showing the footer), then focus it for screen readers.
  const focusOnMount = (el: HTMLHeadingElement | null) => {
    if (el && headingRef.current !== el) {
      headingRef.current = el;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.closest("[data-thank-you]")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopied("copied");
      setTimeout(() => setCopied("idle"), 2500);
    } catch {
      setCopied("manual");
    }
  }

  async function share() {
    if (!canShare) return copyLink();
    try {
      await navigator.share({
        title: "CrewJio",
        text: "Find the days you're both home. Join the CrewJio waitlist:",
        url: SITE_URL,
      });
    } catch (err) {
      // Closing the share sheet is not an error. Anything else: fall back to copying.
      if (!(err instanceof DOMException && err.name === "AbortError")) await copyLink();
    }
  }

  return (
    <div data-thank-you className="flex flex-col items-start gap-5 py-4" aria-live="polite">
      <span className="flex size-12 items-center justify-center rounded-full bg-teal/15 text-teal ring-1 ring-teal/30">
        <CheckIcon size={22} weight="bold" aria-hidden />
      </span>
      <h3 ref={focusOnMount} tabIndex={-1} className="text-3xl font-bold tracking-tight outline-none md:text-4xl">
        {already ? "You're already on the list" : `You're on the list, ${firstName}.`}
      </h3>
      <p className="max-w-[46ch] leading-relaxed text-muted">
        {already
          ? "No need to sign up twice. We'll email you when your spot is ready."
          : "Check your inbox for a note from hello@mail.crewjio.com. Want in faster? Get your batch on the list too."}
      </p>
      <button
        type="button"
        onClick={share}
        className="group inline-flex min-h-12 items-center gap-3 rounded-full bg-amber py-2 pl-6 pr-2 font-semibold text-on-amber transition-transform duration-500 ease-fluid active:scale-[0.97]"
      >
        {copied === "copied" ? "Link copied" : "Jio your crew"}
        <span className="flex size-8 items-center justify-center rounded-full bg-on-amber/10 transition-transform duration-500 ease-fluid group-hover:scale-105">
          {copied === "copied" ? (
            <CheckIcon size={16} weight="bold" aria-hidden />
          ) : canShare ? (
            <ShareNetworkIcon size={16} weight="bold" aria-hidden />
          ) : (
            <CopyIcon size={16} weight="bold" aria-hidden />
          )}
        </span>
      </button>
      <p className="sr-only" aria-live="polite">
        {copied === "copied" ? "Link copied to clipboard" : ""}
      </p>
      {copied === "manual" && (
        <p className="text-sm text-muted">
          Copy this link: <span className="select-all font-mono text-cloud">{SITE_URL.replace(/^https?:\/\//, "")}</span>
        </p>
      )}
    </div>
  );
}
