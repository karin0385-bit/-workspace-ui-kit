/** 印刷対象（提案書 / 見積書） */
export type PrintTarget = "proposal" | "quote";

const PRINT_PORTAL_ID = "sake-print-portal";

/**
 * 指定ペインの内容だけを印刷する。
 * 印刷用 DOM を body 直下に複製し、@media print でアプリ本体を非表示にする。
 */
export function printDocument(target: PrintTarget): void {
  const source = document.querySelector<HTMLElement>(`[data-print-area="${target}"]`);
  if (!source) return;

  document.getElementById(PRINT_PORTAL_ID)?.remove();

  const portal = document.createElement("div");
  portal.id = PRINT_PORTAL_ID;
  portal.setAttribute("aria-hidden", "true");

  const clone = source.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (src?.startsWith("/")) {
      img.setAttribute("src", `${window.location.origin}${src}`);
    }
  });

  portal.appendChild(clone);
  document.body.appendChild(portal);
  document.body.classList.add("sake-printing");
  document.body.dataset.printTarget = target;

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.body.classList.remove("sake-printing");
    delete document.body.dataset.printTarget;
    document.getElementById(PRINT_PORTAL_ID)?.remove();
  };

  window.addEventListener("afterprint", cleanup, { once: true });

  window.requestAnimationFrame(() => {
    window.print();
  });
}
