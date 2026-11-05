"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Tone = "default" | "error";
type Toast = { id: number; message: string; tone: Tone };
type ShowToast = (message: string, options?: { tone?: Tone }) => void;

const ToastContext = createContext<ShowToast | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const toast = useCallback<ShowToast>((message, options) => {
    const id = nextId.current++;
    setToasts((current) => [
      ...current,
      { id, message, tone: options?.tone ?? "default" },
    ]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-40px)] flex-col gap-2 sm:max-w-sm"
      >
        {toasts.map((t) => (
          <p
            key={t.id}
            className={`rounded-small border bg-surface px-4 py-3 font-arial text-sm shadow-raised animate-in fade-in-0 slide-in-from-bottom-2 duration-200 ${
              t.tone === "error"
                ? "border-l-4 border-l-danger text-danger"
                : "border-l-4 border-l-teal text-ink"
            }`}
          >
            {t.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used inside ToastProvider");
  return toast;
}
