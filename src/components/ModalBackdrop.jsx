import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/* How many modals are open. The expense edit flow stacks a confirm on top of a
   form, so the scroll lock is released by the last one to close, not the first,
   and Escape only reaches the one on top. */
let openCount = 0;

/**
 * The overlay every modal renders into, mounted on document.body.
 *
 * It has to escape the dashboard layout: `.dashboard-content` sets
 * `backdrop-filter`, which makes it the containing block for `position: fixed`
 * descendants and its own stacking context. A backdrop left inside it centers
 * on the whole scrollable card instead of the viewport - so on a long page the
 * dialog lands halfway down the document, with the panels below it painting on
 * top. Rendering through a portal puts it back on the viewport.
 */
export default function ModalBackdrop({ onClick, children }) {
  const depth = useRef(0);

  useEffect(() => {
    openCount += 1;
    depth.current = openCount;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      openCount -= 1;
      if (openCount === 0) {
        document.body.style.overflow = previous;
      }
    };
  }, []);

  useEffect(() => {
    if (!onClick) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && depth.current === openCount) onClick(event);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClick]);

  return createPortal(
    <div className="modal-backdrop" role="presentation" onClick={onClick}>
      {children}
    </div>,
    document.body,
  );
}
