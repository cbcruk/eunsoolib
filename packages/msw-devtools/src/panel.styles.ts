/**
 * 패널의 shadow DOM 스타일.
 *
 * 호스트 앱의 스타일시트가 여기까지 닿지 못하므로 리셋 없이 전부 직접 적는다.
 */
export const PANEL_STYLES = /* css */ `
  :host {
    --surface: #0f1418;
    --raised: #161c22;
    --line: #232c33;
    --text: #c8d2d8;
    --dim: #6e7f8a;
    --steel: #5aa9c9;
    --amber: #d9a62e;
    --red: #d9605e;
    --green: #7fb069;

    position: fixed;
    bottom: 12px;
    left: 12px;
    z-index: 2147483000;
    font-family: ui-sans-serif, system-ui, sans-serif;
    color: var(--text);
  }
  * { box-sizing: border-box; }
  button, select, input, textarea {
    font: inherit;
    color: inherit;
    background: var(--raised);
    border: 1px solid var(--line);
    border-radius: 2px;
  }
  :focus-visible { outline: 2px solid var(--steel); outline-offset: 1px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

  /* The chip is the signature: it is the standing reminder that traffic is
     being tampered with, and it never hides while overrides are live. */
  .chip {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 6px 10px;
    cursor: pointer;
    letter-spacing: 0.08em;
    font-size: 10px;
    text-transform: uppercase;
  }
  .chip[data-live='true'] { border-color: var(--amber); color: var(--amber); }
  .count {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    padding: 0 5px;
    border-radius: 2px;
    background: var(--amber);
    color: #0f1418;
  }
  .chip[data-live='true'] .count { animation: pulse 1.4s ease-out 1; }
  @keyframes pulse { from { opacity: 0.35; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .chip[data-live='true'] .count { animation: none; }
  }

  .panel {
    width: min(440px, calc(100vw - 24px));
    height: min(560px, 70vh);
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 3px;
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.45);
  }
  header, footer {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 8px;
    border-bottom: 1px solid var(--line);
  }
  footer { border-bottom: 0; border-top: 1px solid var(--line); }
  header select { flex: 1; min-width: 0; padding: 3px 5px; font-size: 12px; }
  header button, footer button { padding: 3px 7px; font-size: 11px; cursor: pointer; }
  footer .spacer { flex: 1; }
  .danger { color: var(--red); }

  .list { flex: 1; overflow-y: auto; }
  .empty { padding: 24px 14px; color: var(--dim); font-size: 12px; line-height: 1.6; }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 9px 6px 7px;
    border: 0;
    border-bottom: 1px solid var(--line);
    border-left: 2px solid transparent;
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .row:hover { background: var(--raised); }
  .row[data-open='true'] { background: var(--raised); }
  .row[data-live='true'] { border-left-color: var(--amber); }
  .row[data-live='true'][data-mode='network-error'] { border-left-color: var(--red); }
  .row[data-live='true'][data-mode='passthrough'] { border-left-color: var(--dim); }

  .method {
    width: 46px;
    flex: none;
    font-size: 10px;
    letter-spacing: 0.06em;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .m-get { color: var(--steel); }
  .m-post { color: var(--green); }
  .m-put, .m-patch { color: var(--amber); }
  .m-delete { color: var(--red); }
  .path {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tag {
    flex: none;
    font-size: 10px;
    color: var(--dim);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .row[data-live='true'] .tag { color: var(--amber); }

  .editor { padding: 9px 10px 11px; border-bottom: 1px solid var(--line); background: #0c1013; }
  .fields { display: flex; gap: 6px; margin-bottom: 8px; }
  .field { display: flex; flex-direction: column; gap: 3px; }
  .field.grow { flex: 1; }
  label { font-size: 9px; letter-spacing: 0.09em; text-transform: uppercase; color: var(--dim); }
  .editor select, .editor input { padding: 3px 5px; font-size: 12px; width: 100%; }
  textarea {
    width: 100%;
    min-height: 104px;
    padding: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11.5px;
    line-height: 1.5;
    resize: vertical;
  }
  .error { margin-top: 5px; font-size: 11px; color: var(--red); }
  .hint { margin-top: 5px; font-size: 11px; color: var(--dim); line-height: 1.5; }
`
