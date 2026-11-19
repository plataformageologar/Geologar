"use client";

import Script from "next/script";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

import { TURNSTILE_ACTION } from "@/lib/contact/turnstile";

type TurnstileOptions = {
  sitekey: string;
  action: string;
  language: string;
  theme: "light" | "dark" | "auto";
  size: "normal" | "flexible" | "compact";
  "refresh-expired": "auto" | "manual" | "never";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "timeout-callback": () => void;
  "error-callback": () => boolean;
};

type TurnstileApi = {
  render(container: HTMLElement, options: TurnstileOptions): string | null | undefined;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileHandle = {
  /** Gera um novo token (cada token vale uma única vez). */
  reset(): void;
};

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Widget do Cloudflare Turnstile em modo explícito. O token chega por
 * `onToken` ("" quando expira ou falha); o servidor o valida no siteverify.
 */
export function TurnstileWidget({
  siteKey,
  onToken,
  onUnavailable,
  ref,
}: {
  siteKey: string;
  onToken: (token: string) => void;
  onUnavailable: () => void;
  ref?: Ref<TurnstileHandle>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const callbacks = useRef({ onToken, onUnavailable });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    callbacks.current = { onToken, onUnavailable };
  });

  useImperativeHandle(ref, () => ({
    reset() {
      callbacks.current.onToken("");
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    },
  }));

  useEffect(() => {
    const api = window.turnstile;
    if (!ready || !api || !container.current) return;

    try {
      const id = api.render(container.current, {
        sitekey: siteKey,
        action: TURNSTILE_ACTION,
        language: "pt-br",
        theme: "light",
        size: "flexible",
        "refresh-expired": "auto",
        callback: (token) => callbacks.current.onToken(token),
        "expired-callback": () => callbacks.current.onToken(""),
        "timeout-callback": () => callbacks.current.onToken(""),
        "error-callback": () => {
          // O widget tenta de novo sozinho; até lá o envio fica sem token.
          callbacks.current.onToken("");
          return true;
        },
      });
      widgetId.current = id ?? null;
    } catch {
      callbacks.current.onUnavailable();
    }

    return () => {
      if (widgetId.current) api.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [ready, siteKey]);

  return (
    <>
      <Script
        id="cf-turnstile-api"
        src={SCRIPT_URL}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => callbacks.current.onUnavailable()}
      />
      <div ref={container} className="min-h-[65px] w-full" />
    </>
  );
}
