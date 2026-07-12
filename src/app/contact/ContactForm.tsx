"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

const topics = [
  { value: "correction", label: "掲載内容の誤り" },
  { value: "removal", label: "掲載・画像削除の依頼" },
  { value: "feedback", label: "ご意見・ご要望" },
  { value: "other", label: "その他" },
];

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    setStatus("sending");
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      topic: String(formData.get("topic") ?? ""),
      message: String(formData.get("message") ?? ""),
      company: String(formData.get("company") ?? ""),
      pageUrl: window.location.href,
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("send_failed");
      }

      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
      setError("送信できませんでした。時間をおいて再度お試しください。");
    }
  }

  return (
    <form onSubmit={onSubmit} className="border border-line bg-white/60 p-5 md:p-6 space-y-5">
      <div className="hidden" aria-hidden="true">
        <label>
          会社名
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          <span>お名前</span>
          <input
            name="name"
            maxLength={80}
            autoComplete="name"
            className="w-full border border-line bg-washi px-3 py-2 text-base outline-none focus:border-hinomaru"
          />
        </label>

        <label className="space-y-2 text-sm font-medium">
          <span>返信先メールアドレス</span>
          <input
            name="email"
            type="email"
            maxLength={254}
            autoComplete="email"
            className="w-full border border-line bg-washi px-3 py-2 text-base outline-none focus:border-hinomaru"
          />
        </label>
      </div>

      <label className="space-y-2 text-sm font-medium block">
        <span>お問い合わせ種別</span>
        <select
          name="topic"
          required
          defaultValue="correction"
          className="w-full border border-line bg-washi px-3 py-2 text-base outline-none focus:border-hinomaru"
        >
          {topics.map((topic) => (
            <option key={topic.value} value={topic.value}>
              {topic.label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm font-medium block">
        <span>内容</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={3000}
          rows={8}
          className="w-full resize-y border border-line bg-washi px-3 py-2 text-base leading-relaxed outline-none focus:border-hinomaru"
        />
      </label>

      <label className="flex gap-3 text-xs leading-relaxed text-sumi-soft">
        <input required type="checkbox" className="mt-1 size-4 accent-hinomaru" />
        <span>
          入力内容はお問い合わせ対応のために利用されます。プライバシーポリシーを確認しました。
        </span>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={status === "sending"}
          className="bg-sumi px-8 py-3 text-sm font-medium tracking-[0.18em] text-washi transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending" ? "送信中" : "送信"}
        </button>
        {status === "sent" && (
          <p className="text-sm text-hinomaru">送信しました。内容を確認いたします。</p>
        )}
        {status === "error" && <p className="text-sm text-hinomaru">{error}</p>}
      </div>
    </form>
  );
}
