"use client";

import { useRef, useState } from "react";
import HCaptcha, { type HCaptchaProps } from "@hcaptcha/react-hcaptcha";
import { Info, LoaderCircle, ShieldCheck } from "lucide-react";
import { HCAPTCHA_TEST_SITEKEY } from "@/lib/captcha";
import { useApp } from "./provider";

type Props = HCaptchaProps & {
  verified: boolean;
  disabled: boolean;
  onClear: () => void;
};

export function AuthCaptcha({ verified, disabled, onClear, ...props }: Props) {
  const { t } = useApp();
  const widget = useRef<HCaptcha>(null);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);

  // Only the explicitly configured public test key uses this local preview.
  // Real sitekeys retain hCaptcha's normal interactive widget.
  if (props.sitekey !== HCAPTCHA_TEST_SITEKEY) return <HCaptcha {...props} />;

  async function check(checked: boolean) {
    if (!checked) {
      widget.current?.resetCaptcha();
      onClear();
      return;
    }
    if (!ready || !widget.current || checking) return;
    setChecking(true);
    try {
      // Obtain an actual provider token; checking the box alone never verifies it.
      await widget.current.execute({ async: true });
    } catch {
      props.onError?.("verification-unavailable");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="captcha-preview" aria-busy={!ready || checking}>
      <div className="captcha-preview-control">
        <label className="captcha-preview-check">
          <input
            type="checkbox"
            checked={verified}
            disabled={disabled || !ready || checking}
            onChange={(event) => void check(event.target.checked)}
            aria-describedby="captcha-test-notice"
          />
          <span>{t("captchaLabel")}</span>
          {(!ready || checking) && (
            <LoaderCircle className="spin" size={17} aria-hidden="true" />
          )}
        </label>
        <span className="captcha-preview-brand">
          <ShieldCheck size={22} aria-hidden="true" />
          hCaptcha
        </span>
      </div>
      <div className="captcha-preview-notice" id="captcha-test-notice">
        <Info size={17} aria-hidden="true" />
        <div>
          <strong>{t("captchaTestMode")}</strong>
          <p>{t("captchaTestContact")}</p>
        </div>
      </div>
      <p className="captcha-preview-links">
        {t("captchaDisclosure")}{" "}
        <a
          href="https://www.hcaptcha.com/privacy"
          target="_blank"
          rel="noreferrer"
        >
          {t("privacy")}
        </a>
        <span aria-hidden="true"> · </span>
        <a
          href="https://www.hcaptcha.com/terms"
          target="_blank"
          rel="noreferrer"
        >
          {t("captchaTerms")}
        </a>
      </p>
      <HCaptcha
        {...props}
        ref={widget}
        size="invisible"
        onReady={() => {
          setReady(true);
          onClear();
          props.onReady?.();
        }}
        onLoad={() => {
          setReady(true);
          props.onLoad?.();
        }}
        onVerify={(token, key) => {
          setChecking(false);
          props.onVerify?.(token, key);
        }}
        onError={(error) => {
          setChecking(false);
          props.onError?.(error);
        }}
        onClose={() => {
          setChecking(false);
          props.onClose?.();
        }}
        onExpire={() => {
          setChecking(false);
          props.onExpire?.();
        }}
        onChalExpired={() => {
          setChecking(false);
          props.onChalExpired?.();
        }}
      />
    </div>
  );
}
