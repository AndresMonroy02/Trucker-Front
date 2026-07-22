import Button from "./Button";

export default function AuthForm({
  title,
  fields,
  values,
  errors,
  submitLabel,
  onChange,
  onSubmit,
  footer,
}) {
  return (
    <form onSubmit={onSubmit} className="panel">
      <h2>{title}</h2>
      {fields.map((field) => (
        <div className="field" key={field.name}>
          <label htmlFor={field.name}>{field.label}</label>
          {field.type === "select" ? (
            <select
              id={field.name}
              value={values[field.name]}
              onChange={(e) => onChange(field.name, e.target.value)}
            >
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={field.name}
              type={field.type}
              placeholder={field.placeholder}
              value={values[field.name]}
              onChange={(e) => onChange(field.name, e.target.value)}
              required={field.required}
            />
          )}
          {errors[field.name] ? <small className="field-error">{errors[field.name]}</small> : null}
        </div>
      ))}
      <Button type="submit">{submitLabel}</Button>
      {footer}
    </form>
  );
}
