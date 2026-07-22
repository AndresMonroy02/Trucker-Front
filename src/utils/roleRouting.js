export const ROLE_DASHBOARD_PATH = {
  owner_profile: "/dashboard/owner",
  driver_profile: "/dashboard/driver",
  admin: "/dashboard/admin",
  user: "/dashboard/general",
};

export function getDashboardPathByRole(role) {
  if (!role) {
    return "/dashboard";
  }

  return ROLE_DASHBOARD_PATH[role] || "/dashboard/general";
}

export function getRoleLabel(role) {
  const labels = {
    owner_profile: "owner_profile",
    driver_profile: "driver_profile",
    admin: "admin",
    user: "user",
  };

  return labels[role] || role || "sin perfil";
}
