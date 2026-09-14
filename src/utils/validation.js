/** Keep in sync with MIN_PASSWORD_LENGTH in the backend config. */
export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(value) {
  if (!value || value.length < MIN_PASSWORD_LENGTH) {
    return `La contrasena debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return "";
}

export function validateLogin(values) {
  const errors = {};

  // The login box accepts either a username or an email address.
  if (!values.username || values.username.trim().length < 3) {
    errors.username = "Ingresa tu usuario o correo.";
  }

  // Existing accounts may predate the current minimum, so login only checks presence.
  if (!values.password) {
    errors.password = "Ingresa tu contrasena.";
  }

  return errors;
}

export function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateUsername(value) {
  const cleaned = (value || "").trim();
  if (cleaned.length < 3) {
    return "El usuario debe tener al menos 3 caracteres.";
  }
  if (/\s/.test(cleaned)) {
    return "El usuario no puede contener espacios.";
  }
  return "";
}

export function validateRegister(values) {
  const errors = validateLogin(values);

  const usernameError = validateUsername(values.username);
  if (usernameError) {
    errors.username = usernameError;
  } else {
    delete errors.username;
  }

  if (!isValidEmail(values.email)) {
    errors.email = "Ingresa un correo valido.";
  }

  const passwordError = validatePassword(values.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  // Registering only ever creates an owner; the backend enforces the same.
  if (values.role && values.role !== "owner_profile") {
    errors.role = "Solo puedes registrarte como propietario.";
  }

  return errors;
}

export function parseApiFieldErrors(detail) {
  if (!Array.isArray(detail)) {
    return {};
  }

  return detail.reduce((acc, issue) => {
    const field = issue?.loc?.[issue.loc.length - 1];
    if (typeof field === "string" && !acc[field]) {
      acc[field] = issue?.msg || "Valor invalido.";
    }
    return acc;
  }, {});
}
