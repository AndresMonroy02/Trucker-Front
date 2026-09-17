/**
 * Stand-in for ModalBackdrop while smoke-testing.
 *
 * The real one renders through a portal into `document.body`, and
 * `renderToStaticMarkup` can do neither: there is no document, and react-dom's
 * server renderer does not support portals. Swapping it keeps the modal itself
 * under test -- which is the part that has broken before.
 */
export default function ModalBackdrop({ children }) {
  return <div className="modal-backdrop">{children}</div>;
}
