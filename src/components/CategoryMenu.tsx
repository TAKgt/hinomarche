"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { Category } from "@/lib/types";

export function CategoryMenu({ categories }: { categories: Category[] }) {
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusFirstItem = useRef(false);

  useEffect(() => {
    function closeOnOutside(event: Event) {
      if (event.target && !menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener("pointerdown", closeOnOutside);
      document.addEventListener("keydown", closeOnEscape);
    }
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !focusFirstItem.current) return;
    focusFirstItem.current = false;
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
  }, [isOpen]);

  function closeMenu() {
    setIsOpen(false);
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={`${menuId}-panel`}
        aria-haspopup="true"
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            focusFirstItem.current = true;
            setIsOpen(true);
          }
        }}
        className="relative z-40 flex items-center gap-1.5 whitespace-nowrap py-2 transition-colors hover:text-hinomaru focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hinomaru"
      >
        <span>ジャンル</span>
        <span
          aria-hidden
          className={`text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      <div
        ref={panelRef}
        id={`${menuId}-panel`}
        hidden={!isOpen}
        className="absolute right-0 top-[calc(100%+0.75rem)] z-40 max-h-[calc(100vh-5rem)] w-[min(28rem,calc(100vw-2.5rem))] overflow-y-auto border border-line bg-washi p-4 shadow-[0_14px_36px_rgba(34,31,26,0.16)] md:p-5"
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
