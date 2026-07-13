"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import type { Category } from "@/lib/types";

export function CategoryMenu({ categories }: { categories: Category[] }) {
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function closeOnOutside(event: Event) {
      if (!toggleRef.current?.checked) return;
      if (event.target && !menuRef.current?.contains(event.target as Node)) {
        toggleRef.current.checked = false;
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && toggleRef.current?.checked) {
        toggleRef.current.checked = false;
        toggleRef.current.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function closeMenu() {
    if (toggleRef.current) toggleRef.current.checked = false;
  }

  return (
    <div ref={menuRef} className="relative">
      <input
        ref={toggleRef}
        id={menuId}
        type="checkbox"
        aria-label="ジャンルメニュー"
        aria-controls={`${menuId}-panel`}
        className="peer absolute inset-0 z-50 cursor-pointer opacity-0"
      />
      <div className="relative z-40 flex items-center gap-1.5 whitespace-nowrap py-2 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-hinomaru peer-hover:text-hinomaru">
        <span>ジャンル</span>
        <span aria-hidden className="text-xs">
          ▾
        </span>
      </div>
      <label
        htmlFor={menuId}
        aria-label="ジャンルメニューを閉じる"
        className="fixed left-0 top-0 z-30 hidden h-[100dvh] w-screen cursor-default peer-checked:block"
      />
      <div
        id={`${menuId}-panel`}
        className="absolute right-0 top-[calc(100%+0.75rem)] z-40 hidden max-h-[calc(100vh-5rem)] w-[min(28rem,calc(100vw-2.5rem))] overflow-y-auto border border-line bg-washi p-4 shadow-[0_14px_36px_rgba(34,31,26,0.16)] peer-checked:block md:p-5"
      >
        <p className="mb-3 font-mincho text-base font-semibold text-sumi">
          ジャンルから探す
        </p>
        <div className="grid grid-cols-2 gap-px border border-line bg-line">
          {categories.map((category, index) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              onClick={closeMenu}
              className={`bg-washi px-3 py-3 text-sumi transition-colors hover:bg-white hover:text-hinomaru ${
                categories.length % 2 === 1 && index === categories.length - 1
                  ? "col-span-2"
                  : ""
              }`}
            >
              {category.name}
            </Link>
          ))}
        </div>
        <Link
          href="/#categories"
          onClick={closeMenu}
          className="mt-4 inline-block text-sm text-hinomaru hover:underline"
        >
          ジャンル一覧を見る →
        </Link>
      </div>
    </div>
  );
}
