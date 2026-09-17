// Inline stroke icons. They inherit `currentColor` and size from the parent, so the
// sidebar can restyle them per state without shipping an icon library.

function Svg({ children, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconDashboard(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="11" width="7" height="10" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </Svg>
  );
}

export function IconRoute(props) {
  return (
    <Svg {...props}>
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M8.5 18h6a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7h6" />
    </Svg>
  );
}

export function IconMoney(props) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 10v4M18 10v4" />
    </Svg>
  );
}

export function IconSupplier(props) {
  return (
    <Svg {...props}>
      <path d="M3.5 9.5 5 4.5h14l1.5 5" />
      <path d="M4 9.5h16V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V9.5Z" />
      <path d="M9.5 20.5v-5h5v5" />
    </Svg>
  );
}

export function IconTruck(props) {
  return (
    <Svg {...props}>
      <path d="M2.5 6.5h11v9h-11z" />
      <path d="M13.5 10h4l3 3v2.5h-7z" />
      <circle cx="7" cy="17.5" r="2" />
      <circle cx="17" cy="17.5" r="2" />
    </Svg>
  );
}

export function IconUser(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Svg>
  );
}

export function IconMail(props) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </Svg>
  );
}

export function IconWallet(props) {
  return (
    <Svg {...props}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A1.5 1.5 0 0 1 18 6.5V8" />
      <path d="M3 7.5V18a2 2 0 0 0 2 2h13.5a1.5 1.5 0 0 0 1.5-1.5V9.5A1.5 1.5 0 0 0 18.5 8H5.5" />
      <circle cx="16.5" cy="14" r="1.2" />
    </Svg>
  );
}

export function IconDocument(props) {
  return (
    <Svg {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </Svg>
  );
}

export function IconBox(props) {
  return (
    <Svg {...props}>
      <path d="M21 8.5 12 3.5 3 8.5v7L12 20.5l9-5v-7Z" />
      <path d="m3 8.5 9 5 9-5" />
      <path d="M12 13.5v7" />
    </Svg>
  );
}

export function IconWrench(props) {
  return (
    <Svg {...props}>
      <path d="M15.5 3.5a5 5 0 0 0-6.2 6.2L3.8 15.2a2 2 0 0 0 0 2.8l2.2 2.2a2 2 0 0 0 2.8 0l5.5-5.5a5 5 0 0 0 6.2-6.2l-3 3-2.8-.7-.7-2.8 3-3Z" />
    </Svg>
  );
}

export function IconHistory(props) {
  return (
    <Svg {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4.5V9h4.5" />
      <path d="M12 7.5V12l3 1.8" />
    </Svg>
  );
}

export function IconProfile(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 18.5a6 6 0 0 1 11 0" />
    </Svg>
  );
}

export function IconTeam(props) {
  return (
    <Svg {...props}>
      {/* Dos personas, no una. Equipo compartia IconProfile con "Mi perfil", asi
          que en el rail contraido -- donde solo hay iconos -- las dos entradas de
          Cuenta eran el mismo dibujo y no habia forma de distinguirlas. */}
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 6.1" />
      <path d="M17.5 14.2A6 6 0 0 1 21 19" />
    </Svg>
  );
}

export function IconShield(props) {
  return (
    <Svg {...props}>
      <path d="M12 3l7 3v5.5c0 4.2-2.9 7.9-7 9-4.1-1.1-7-4.8-7-9V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  );
}

export function IconSun(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </Svg>
  );
}

export function IconMoon(props) {
  return (
    <Svg {...props}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </Svg>
  );
}

export function IconLogout(props) {
  return (
    <Svg {...props}>
      <path d="M14.5 8.5V6a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2.5" />
      <path d="M10 12h11m0 0-3-3m3 3-3 3" />
    </Svg>
  );
}

export function IconChevronLeft(props) {
  return (
    <Svg {...props}>
      <path d="m14.5 6-6 6 6 6" />
    </Svg>
  );
}

export function IconChevronRight(props) {
  return (
    <Svg {...props}>
      <path d="m9.5 6 6 6-6 6" />
    </Svg>
  );
}

export function IconChevronDown(props) {
  return (
    <Svg {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </Svg>
  );
}

export function IconMenu(props) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function IconClose(props) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}
