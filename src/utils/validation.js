export function validateLogin(values) {
  const errors = {};

  if (!values.username || values.username.trim().length < 3) {
    errors.username = "El usuario debe tener al menos 3 caracteres.";
  }

  if (!values.password || values.password.length < 6) {
    errors.password = "La contrasena debe tener al menos 6 caracteres.";
  }

  return errors;
}

export function validateRegister(values) {
  const errors = validateLogin(values);

  if (!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
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
