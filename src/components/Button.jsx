export default function Button({ children, variant = "primary", type = "button", ...props }) {
  let className = "btn btn-primary";
  if (variant === "secondary") className = "btn btn-secondary";
  if (variant === "cancel") className = "btn btn-cancel";
  return (
    <button type={type} className={className} {...props}>
      {children}
    </button>
  );
}
