export function validateLogin(values) {
  const errors = {};

  // The login box accepts either a username or an email address.
  if (!values.username || values.username.trim().length < 3) {
    errors.username = "Ingresa tu usuario o correo.";
  }

  if (!values.password || values.password.length < 6) {
    errors.password = "La contrasena debe tener al menos 6 caracteres.";
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

  const allowedRoles = ["owner_profile", "driver_profile", "user", "admin"];
  if (!values.role || !allowedRoles.includes(values.role)) {
    errors.role = "Selecciona un perfil valido.";
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
