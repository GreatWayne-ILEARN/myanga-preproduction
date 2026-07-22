import React, { useMemo, useState, useEffect } from "react";

/**
 * Numbered page breaks matching myyanga.com Shop:
 * ‹  1  2  3  4  ›   — rectangular, maroon active, no infinite scroll.
 */
export function Pager({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="pager" aria-label="Pagination">
      <ul className="pagination">
        <li className={"page-item" + (page <= 1 ? " disabled" : "")}>
          <button
            type="button"
            className="page-link"
            aria-label="Previous"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
          >
            ‹
          </button>
        </li>
        {start > 1 && (
          <li className="page-item">
            <button type="button" className="page-link" onClick={() => onChange(1)}>
              1
            </button>
          </li>
        )}
        {start > 2 && (
          <li className="page-item disabled">
            <span className="page-link">…</span>
          </li>
        )}
        {pages.map((n) => (
          <li key={n} className={"page-item" + (n === page ? " active" : "")}>
            {n === page ? (
              <span className="page-link" aria-current="page">
                {n}
              </span>
            ) : (
              <button type="button" className="page-link" onClick={() => onChange(n)}>
                {n}
              </button>
            )}
          </li>
        ))}
        {end < totalPages - 1 && (
          <li className="page-item disabled">
            <span className="page-link">…</span>
          </li>
        )}
        {end < totalPages && (
          <li className="page-item">
            <button type="button" className="page-link" onClick={() => onChange(totalPages)}>
              {totalPages}
            </button>
          </li>
        )}
        <li className={"page-item" + (page >= totalPages ? " disabled" : "")}>
          <button
            type="button"
            className="page-link"
            aria-label="Next"
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
          >
            ›
          </button>
        </li>
      </ul>
    </nav>
  );
}

/** Slice a list into pages (default 12 = live Shop). Resets to page 1 when list identity changes. */
export function usePaged(items, perPage = 12) {
  const [page, setPage] = useState(1);
  const list = items || [];
  const totalPages = Math.max(1, Math.ceil(list.length / perPage));

  useEffect(() => {
    setPage(1);
  }, [list.length, perPage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const slice = useMemo(() => {
    const start = (page - 1) * perPage;
    return list.slice(start, start + perPage);
  }, [list, page, perPage]);

  const go = (n) => {
    const next = Math.min(totalPages, Math.max(1, n));
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return { page, totalPages, slice, setPage: go, perPage, total: list.length };
}
