import type { CSSProperties, ReactNode } from "react";
import { usePagination } from "./use-pagination";
import { DOTS } from "./pagination.utils";
import type { PaginationProps } from "./types";

export function Pagination({
  pagination,
  showInfo = false,
  size = "md",
  className = "",
}: PaginationProps): ReactNode {
  const p = usePagination({ pagination });

  const dims =
    size === "sm"
      ? { btn: "1.75rem", font: "0.75rem", gap: "0.25rem" }
      : { btn: "2.25rem", font: "0.875rem", gap: "0.375rem" };

  const baseBtn: CSSProperties = {
    minWidth: dims.btn,
    height: dims.btn,
    padding: "0 0.5rem",
    borderRadius: "0.5rem",
    border: "1px solid #e5e7eb",
    background: "white",
    color: "#374151",
    fontSize: dims.font,
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
    fontFamily: "inherit",
  };

  const arrow = (disabled: boolean): CSSProperties => ({
    ...baseBtn,
    color: disabled ? "#d1d5db" : "#374151",
    cursor: disabled ? "not-allowed" : "pointer",
  });

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}
    >
      {showInfo && (
        <span style={{ fontSize: dims.font, color: "#6b7280" }}>
          전체 <b style={{ color: "#111827" }}>{p.total.toLocaleString()}</b>개 중{" "}
          <b style={{ color: "#111827" }}>
            {p.range.start.toLocaleString()}–{p.range.end.toLocaleString()}
          </b>
        </span>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: dims.gap }}>
        <button
          onClick={p.prev}
          disabled={p.isFirst}
          style={arrow(p.isFirst)}
          aria-label="이전 페이지"
        >
          ‹
        </button>

        {p.items.map((item, idx) =>
          item === DOTS ? (
            <span
              key={`dots-${idx}`}
              style={{
                minWidth: dims.btn,
                textAlign: "center",
                color: "#9ca3af",
                fontSize: dims.font,
                userSelect: "none",
              }}
            >
              …
            </span>
          ) : (
            <button
              key={item}
              onClick={() => p.goTo(item)}
              aria-current={item === p.page ? "page" : undefined}
              style={{
                ...baseBtn,
                ...(item === p.page
                  ? {
                      background:
                        "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      borderColor: "transparent",
                      color: "white",
                      boxShadow: "0 1px 3px rgba(217, 119, 6, 0.4)",
                    }
                  : {}),
              }}
            >
              {item}
            </button>
          )
        )}

        <button
          onClick={p.next}
          disabled={p.isLast}
          style={arrow(p.isLast)}
          aria-label="다음 페이지"
        >
          ›
        </button>
      </div>
    </div>
  );
}
