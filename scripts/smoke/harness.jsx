/**
 * The cases. See run.mjs for what this is and what it cannot see.
 *
 * Add one whenever a screen gains a prop or an option: the cost is four lines
 * and the bug it catches is a blank page.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { AccessContext, AccessProvider } from "../../src/access";
import DashboardShell from "../../src/components/DashboardShell";
import AttachmentField from "../../src/components/AttachmentField";
import InventoryFormModal from "../../src/components/modals/InventoryFormModal";
import ReportPickerModal from "../../src/components/modals/ReportPickerModal";
import PlaceAutocomplete from "../../src/components/PlaceAutocomplete";
import RouteMap from "../../src/components/manifest/RouteMap";
import ManifestFormModal from "../../src/components/modals/ManifestFormModal";
import ManifestScanReviewModal from "../../src/components/modals/ManifestScanReviewModal";
import CompanyFormModal from "../../src/components/modals/CompanyFormModal";
import VehiclePapersOption from "../../src/components/VehiclePapersOption";
import VehicleFormModal from "../../src/components/modals/VehicleFormModal";
import OwnerInventoriesPage from "../../src/pages/owner/OwnerInventoriesPage";
import OwnerMaintenancesPage from "../../src/pages/owner/OwnerMaintenancesPage";
import OwnerReportsPage from "../../src/pages/owner/OwnerReportsPage";
import OwnerVehiclesPage from "../../src/pages/owner/OwnerVehiclesPage";
import ProfilePage from "../../src/pages/auth/ProfilePage";

let failures = 0;

/** `expectations` is [needle] or [needle, false] for "must not appear". */
function check(name, element, expectations = []) {
  try {
    const html = renderToStaticMarkup(element);
    for (const [needle, shouldBeThere = true] of expectations) {
      if (html.includes(needle) !== shouldBeThere) {
        throw new Error(`${shouldBeThere ? "falta" : "sobra"} ${JSON.stringify(needle)}`);
      }
    }
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL ${name}: ${error.message}`);
  }
}

const maintenanceRows = [
  { id: 1, maintenance_date: "2026-03-01", name: "Frenos", amount: "100000", currency: "COP" },
  { id: 2, maintenance_date: "2026-03-05", name: "Turbo", amount: "200000", currency: "COP" },
];
const inventoryRows = [
  { id: 7, inventory_date: "2026-03-01", name: "Extintor", description: "Cabina" },
];

const checkbox = (label) => (
  <label className="owner-checkbox">
    <input type="checkbox" checked readOnly />
    {label}
  </label>
);

console.log("\nReportPickerModal");
check(
  "mantenimientos: montos y conductor",
  <ReportPickerModal
    isOpen
    title="Generar reporte de mantenimientos"
    subtitle="ABC123 · todos los registros"
    rows={maintenanceRows}
    columns={[
      { header: "Fecha", render: (row) => row.maintenance_date },
      { header: "Nombre", render: (row) => row.name },
      { header: "Monto", render: (row) => row.amount },
    ]}
    options={
      <>
        {checkbox("Mostrar los montos en el documento")}
        {checkbox("Mostrar los datos del conductor")}
      </>
    }
    onGenerate={() => {}}
    onClose={() => {}}
  />,
  [
    ["Mostrar los montos en el documento"],
    ["Mostrar los datos del conductor"],
    // Not "2 de 2": the default ticking happens in an effect, which a server
    // render does not run. In a browser it is immediate.
    ["de 2 seleccionados"],
    ["Frenos"],
    ["Generar PDF"],
  ]
);

check(
  "inventario: solo el conductor",
  <ReportPickerModal
    isOpen
    title="Generar reporte de inventario"
    rows={inventoryRows}
    columns={[
      { header: "Fecha", render: (row) => row.inventory_date },
      { header: "Nombre", render: (row) => row.name },
      { header: "Descripcion", render: (row) => row.description || "-" },
    ]}
    options={checkbox("Mostrar los datos del conductor")}
    onGenerate={() => {}}
    onClose={() => {}}
  />,
  [
    ["Extintor"],
    ["Mostrar los datos del conductor"],
    // No money on an inventory, so no switch for it.
    ["Mostrar los montos", false],
  ]
);

check(
  "sin filas, mensaje propio",
  <ReportPickerModal
    isOpen
    rows={[]}
    columns={[]}
    emptyMessage="No hay inventarios activos para los filtros seleccionados."
    onGenerate={() => {}}
    onClose={() => {}}
  />,
  [["No hay inventarios activos"], ["<table", false]]
);

check("cerrado no dibuja nada", <ReportPickerModal isOpen={false} rows={[]} columns={[]} />, [
  ["Generar PDF", false],
]);

console.log("\nVehiclePapersOption");
// It loads its list in an effect, which a server render does not run -- so what
// this case fixes is that it renders nothing rather than throwing when it has no
// papers yet. That is exactly the state the modal opens in.
check(
  "sin papeles todavia, no estorba",
  <VehiclePapersOption isOpen vehicleId="1" value={null} onChange={() => {}} />,
  [["report-option-group", false]]
);

console.log("\nPlaceAutocomplete");
// It reads its own suggestions in an effect, which a server render does not run,
// so what this fixes is the resting state: a text input, and a button that has to
// be pressed. Nothing here may imply a provider call on typing.
check(
  "campo de texto; las sugerencias llegan solas al teclear",
  <PlaceAutocomplete
    id="origin"
    label="Origen"
    value="Bogota"
    placeId={null}
    onTextChange={() => {}}
    onPlaceChange={() => {}}
  />,
  [
    ['value="Bogota"'],
    // El boton se fue: ahora sugiere mientras se escribe.
    ["Buscar en el mapa", false],
    // Las listas se cargan en un efecto, que un render de servidor no corre.
    ["place-suggestions", false],
  ]
);

check(
  "dice cuando la ubicacion quedo guardada",
  <PlaceAutocomplete
    id="destination"
    label="Destino"
    value="Medellin"
    placeId={7}
    onTextChange={() => {}}
    onPlaceChange={() => {}}
  />,
  [["Ubicacion guardada"]]
);

console.log("\nRouteMap");
// La imagen se pide en un efecto, que un render de servidor no corre, asi que
// esto NO ve el mapa. Lo que si prueba es lo que se decide antes de pedir nada:
// que con coordenadas se arma el marco y el enlace gratis a Google Maps, y que
// sin ellas el componente no dibuja -- ni pide -- absolutamente nada.
const placeBogota = { id: 1, label: "Bogota", lat: "4.710989", lng: "-74.072092", provider_place_id: "ChIJ-bogota" };
const placeMedellin = { id: 2, label: "Medellin", lat: "6.244203", lng: "-75.581212", provider_place_id: "ChIJ-medellin" };

check(
  "con coordenadas: marco, leyenda y enlace a Google Maps",
  <RouteMap
    manifest={{
      id: 9, origin: "Bogota", destination: "Medellin",
      origin_place: placeBogota, destination_place: placeMedellin,
    }}
    basePath="/owner"
  />,
  [
    ["route-map"],
    ["Trazado calculado por Google"],
    ["google.com/maps/dir"],
    // Los place_id del proveedor son lo que evita que el enlace abra la otra
    // Cartagena; si desaparecen, el enlace sigue funcionando y miente.
    ["origin_place_id=ChIJ-bogota"],
    ["destination_place_id=ChIJ-medellin"],
  ]
);

check(
  "una finca sin coordenadas no dibuja nada",
  <RouteMap
    manifest={{
      id: 9, origin: "Bogota", destination: "La Esperanza",
      origin_place: placeBogota,
      destination_place: { id: 3, label: "La Esperanza", lat: null, lng: null },
    }}
    basePath="/owner"
  />,
  [["route-map", false]]
);

check(
  "un viaje sin lugares tampoco",
  <RouteMap manifest={{ id: 9, origin: "Bogota", destination: "Medellin" }} basePath="/owner" />,
  [["route-map", false]]
);

console.log("\nFormularios");
check(
  "manifiesto: los dos lugares y la distancia",
  <ManifestFormModal
    isOpen
    form={{
      manifest_number: "M-001", origin: "Bogota", destination: "Medellin",
      departure_date: "2026-03-01", arrival_date: "", cargo_description: "",
      freight_value: "5000000", currency: "COP", vehicle_id: "", driver_id: "",
      status_id: "1", origin_place_id: 1, destination_place_id: 2,
      distance_km: "414.00", distance_source: "provider",
    }}
    vehicles={[]}
    drivers={[]}
    manifestStatuses={[{ id: 1, label: "Pendiente" }]}
    onChange={() => {}}
    onFieldChange={() => {}}
    onSubmit={() => {}}
    onClose={() => {}}
  />,
  [
    ["Distancia (km)"],
    ['value="414.00"'],
    ["Calculada desde el mapa"],
    ["Ubicacion guardada"],
  ]
);

check(
  "manifiesto: la distancia estimada se muestra como texto, no en el input",
  <ManifestFormModal
    isOpen
    previewKm="651.00"
    form={{
      manifest_number: "M-002", origin: "Cartagena", destination: "Medellin",
      departure_date: "2026-03-01", arrival_date: "", cargo_description: "",
      freight_value: "5000000", currency: "COP", vehicle_id: "", driver_id: "",
      status_id: "1", origin_place_id: 1, destination_place_id: 2,
      distance_km: "", distance_source: null,
    }}
    vehicles={[]}
    drivers={[]}
    manifestStatuses={[{ id: 1, label: "Pendiente" }]}
    onChange={() => {}}
    onFieldChange={() => {}}
    onSubmit={() => {}}
    onClose={() => {}}
  />,
  [
    ["Distancia estimada: 651.00 km"],
    // La trampa: si el numero acaba dentro del input, el servidor lo marca
    // "manual" y una cifra de Google queda registrada como escrita a mano.
    ['value="651.00"', false],
  ]
);
check(
  "inventario: solo imagenes, y se ven",
  <InventoryFormModal
    isOpen
    form={{ vehicle_id: "1", name: "Extintor", description: "", inventory_date: "2026-03-01" }}
    vehicles={[{ id: 1, plate: "ABC123" }]}
    file={{ name: "extintor.jpg", size: 2048, url: "https://ejemplo/firmada" }}
    onChange={() => {}}
    onSubmit={() => {}}
    onClose={() => {}}
    onFileChange={() => {}}
  />,
  [
    ["image/jpeg"],
    ["application/pdf", false],
    ["reporte de inventario"],
    // The picture itself, not just its filename.
    ["attachment-thumb"],
  ]
);

check(
  "vehiculo: la foto y el ano con enye",
  <VehicleFormModal
    isOpen
    isEditing
    form={{ plate: "ABC123", model: "Kenworth", year: "2020", status_id: "1", driver_id: "" }}
    vehicleStatuses={[{ id: 1, label: "Activo" }]}
    drivers={[]}
    photo={{ name: "camion.jpg", size: 2048, url: "https://ejemplo/firmada" }}
    onChange={() => {}}
    onSubmit={() => {}}
    onClose={() => {}}
    onPhotoChange={() => {}}
  />,
  [
    ["Año"],
    [">Ano<", false],
    ["attachment-thumb"],
    // Drawn, never downloaded -- so the picker must not offer a document.
    ["image/jpeg"],
    ["application/pdf", false],
  ]
);

console.log("\nCompanyFormModal");
check(
  "los campos del generador, con el NIT opcional",
  <CompanyFormModal
    isOpen
    form={{
      name: "Cementos Argos SA", tax_id: "890903938", contact_name: "Marta Ruiz",
      contact_phone: "3214209610", contact_email: "marta@argos.co",
      city: "Barranquilla", notes: "", is_active: true,
    }}
    onChange={() => {}}
    onSubmit={() => {}}
    onClose={() => {}}
  />,
  [["Nombre o razon social"], ["NIT o identificacion"], ["Cementos Argos SA"], ["Empresa activa"]]
);

console.log("\nManifestScanReviewModal");

// El borrador tal y como lo devuelve POST /owner/manifests/extract: la placa
// leida sin camion que le corresponda, y el origen en blanco en el papel.
const scanDraft = {
  source: "ocr",
  pages_read: 1,
  page_number: 1,
  manifest_number: { value: "06496", confidence: 0.96, raw_text: "06496" },
  origin: { value: null, confidence: 0, raw_text: null },
  destination: { value: "BARRANQUILLA (ATLANTICO)", confidence: 0.96, raw_text: "BARRANQUILLA (ATLANTICO)" },
  departure_date: { value: "2022-11-10", confidence: 0.96, raw_text: "2022/11/10" },
  cargo_description: { value: "PRODUCTOS PETROLEROS", confidence: 0.72, raw_text: "PRODUCTOS PETROLEROS" },
  freight_value: { value: "10000000.00", confidence: 0.96, raw_text: "10,000,000" },
  vehicle_plate: { value: "WGY123", confidence: 0.94, raw_text: "WGY123" },
  driver_name: { value: "JUAN PEREZ GOMEZ", confidence: 0.91, raw_text: "JUAN PEREZ GOMEZ" },
  driver_id_number: { value: "1077853308", confidence: 0.96, raw_text: "1077853308" },
  company_name: { value: "CEMENTOS ARGOS SA", confidence: 0.95, raw_text: "890903938 CEMENTOS ARGOS SA" },
  company_tax_id: { value: "890903938", confidence: 1, raw_text: "890903938 CEMENTOS ARGOS SA" },
  currency: "COP",
  vehicle_id: null,
  driver_id: null,
  company_id: null,
  needs_review: ["origin", "vehicle_plate", "cargo_description"],
};

const scanForm = {
  manifest_number: "06496", origin: "", destination: "BARRANQUILLA (ATLANTICO)",
  departure_date: "2022-11-10", arrival_date: "", cargo_description: "PRODUCTOS PETROLEROS",
  freight_value: "10000000.00", currency: "COP", vehicle_id: "", driver_id: "",
  status_id: "", company_id: "", origin_place_id: null, destination_place_id: null,
  distance_km: "", distance_source: null,
};

const scanModal = (overrides = {}) => (
  <ManifestScanReviewModal
    isOpen
    file={{ name: "manifiesto.pdf", size: 120000, type: "application/pdf" }}
    draft={scanDraft}
    form={scanForm}
    vehicles={[]}
    drivers={[]}
    companies={[]}
    manifestStatuses={[{ id: 1, label: "Pendiente" }]}
    onChange={() => {}}
    onFieldChange={() => {}}
    onSubmit={() => {}}
    onClose={() => {}}
    {...overrides}
  />
);

check("el documento y los campos salen juntos", scanModal(), [
  ["manifest-scan-grid"],
  ["manifest-scan-document"],
  ["Numero de manifiesto"],
  ['value="06496"'],
]);

check("los campos dudosos salen resaltados", scanModal(), [
  ["field-review"],
  // Lo que leyo la maquina, para poder compararlo sin abrir el papel aparte.
  ["Leimos «PRODUCTOS PETROLEROS»"],
]);

check("una placa sin camion registrado avisa en vez de inventarlo", scanModal(), [
  ["La placa "],
  ["WGY123"],
  ["no esta registrada"],
]);

check("una empresa que no esta en la lista se ofrece, no se crea sola", scanModal(), [
  ["El manifiesto nombra a "],
  ["CEMENTOS ARGOS SA"],
  ["NIT 890903938"],
]);

// Solo el aviso: la <img> cuelga de un object URL que se crea en un efecto, y
// renderToStaticMarkup no ejecuta efectos. Que la imagen salga girada de verdad
// se comprueba midiendo en un navegador, no aqui.
check("un documento girado lo dice", scanModal({
  file: { name: "m.jpg", size: 90000, type: "image/jpeg" },
  draft: { ...scanDraft, rotation: 270 },
}), [
  ["El documento venia girado"],
  ["270"],
  ["aqui lo mostramos derecho"],
]);

check("la distancia del borrador se muestra, nunca dentro del input", scanModal({
  previewKm: "414.00",
}), [
  ["Distancia estimada: 414.00 km"],
  // Escribirla en el input la marcaria como puesta a mano y el servidor
  // respetaria ese numero en vez de calcularlo.
  ['name="distance_km" type="number" min="0" step="0.01" value="414.00"', false],
]);

check("dice de que pagina del paquete salio", scanModal({
  draft: { ...scanDraft, source: "text_layer", pages_read: 3, page_number: 2 },
}), [
  ["El archivo tiene 3 paginas"],
  ["pagina 2"],
]);

check("un documento de una sola pagina no menciona paginas", scanModal(), [
  ["El archivo tiene", false],
]);

check("la moneda queda fija en COP y no se puede cambiar", scanModal(), [
  ["Por ahora todos los viajes se registran en COP"],
  ['name="currency"'],
  ["disabled"],
]);

check("sin giro no se menciona nada", scanModal(), [
  ["El documento venia girado", false],
  ["manifest-scan-turn-", false],
]);

check("un PDF digital no se anuncia como una lectura dudosa", scanModal({
  draft: { ...scanDraft, source: "text_layer", needs_review: [] },
}), [
  ["Leido del PDF original"],
  ["Todos los campos se leyeron con seguridad"],
  ["field-review", false],
]);

console.log("\nAttachmentField");
check(
  "con foto y preview",
  <AttachmentField
    id="vehicle_photo"
    label="Foto del vehiculo"
    preview
    file={{ name: "camion.jpg", size: 2048, url: "https://ejemplo/firmada" }}
    onFileChange={() => {}}
  />,
  [["attachment-thumb"], ["camion.jpg"]]
);

console.log("\nMenu lateral");

// A stand-in for what GET /me/access returns, in the order the API returns it.
//
// **This file does not test the order.** The order is the backend's -- it comes
// from GROUP_ORDER and is asserted in tests/test_permissions.py against
// screens_for(). Ordering this array by hand once made a check here look right
// while the real menu had Cuenta sitting third; an assertion over data written
// in the same file that asserts on it proves nothing.
//
// What this file does test is the rendering: that groups become foldable
// sections, that a group of one is just the link, that the items are links.
const ownerScreens = [
  { key: "dashboard", label: "Panel principal", path: "/dashboard/owner", group: "Resumen", can_write: false },
  { key: "trips", label: "Manifiestos", path: "/dashboard/owner/routes", group: "Operacion", can_write: true },
  { key: "expenses", label: "Gastos", path: "/dashboard/owner/expenses", group: "Operacion", can_write: true },
  { key: "finance", label: "Cartera y anticipos", path: "/dashboard/owner/finance", group: "Dinero", can_write: true },
  { key: "suppliers", label: "Proveedores", path: "/dashboard/owner/suppliers", group: "Dinero", can_write: true },
  { key: "vehicles", label: "Vehiculos", path: "/dashboard/owner/vehicles", group: "Flota", can_write: true },
  { key: "maintenances", label: "Mantenimientos", path: "/dashboard/owner/maintenances", group: "Flota", can_write: true },
  { key: "reports", label: "Reportes", path: "/dashboard/owner/reports", group: "Registros", can_write: true },
  { key: "emails", label: "Correos", path: "/dashboard/owner/emails", group: "Registros", can_write: false },
  { key: "team", label: "Equipo", path: "/dashboard/owner/team", group: "Cuenta", can_write: true },
];

function withAccess(screens, children) {
  return (
    <MemoryRouter>
      <AccessContext.Provider
        value={{
          screens,
          permissions: [],
          role: "owner_profile",
          roleLabel: "Propietario",
          loading: false,
          can: () => true,
          canSee: () => true,
          canEdit: () => true,
          reload: () => {},
        }}
      >
        {children}
      </AccessContext.Provider>
    </MemoryRouter>
  );
}

const shell = withAccess(
  ownerScreens,
  <DashboardShell {...{ me: { name: "Ana", role: "owner_profile" }, onLogout: () => {}, theme: "light", onToggleTheme: () => {} }}>
    <p>contenido</p>
  </DashboardShell>
);

check("cada grupo del payload sale como seccion", shell, [
  ["Operacion"],
  ["Dinero"],
  ["Flota"],
  ["Registros"],
  ["Cuenta"],
]);

check("cada grupo con dos o mas se puede plegar, y abre abierto", shell, [
  ['aria-expanded="true"'],
  ['aria-controls="sidebar-group-operacion"'],
  ['aria-controls="sidebar-group-dinero"'],
  ['aria-controls="sidebar-group-flota"'],
  ['aria-controls="sidebar-group-registros"'],
  // Nothing starts folded: a heading nobody opened is a screen nobody finds.
  // The bare attribute, not the substring -- the <aside> carries aria-hidden.
  ['hidden=""', false],
]);

check("un grupo de un solo item es el item", shell, [
  ["Panel principal"],
  // No heading and no toggle for it -- two rows to reach one screen.
  ['aria-controls="sidebar-group-resumen"', false],
]);

check("los enlaces siguen siendo enlaces", shell, [
  ['href="/dashboard/owner/maintenances"'],
  ['href="/dashboard/owner/reports"'],
  ["Mantenimientos"],
  ["Correos"],
]);

// El rail contraido. Se renderiza aparte porque el estado sale de localStorage,
// que run.mjs deja devolviendo null.
//
// **Esto no ve el desbordamiento que motivo el arreglo.** renderToStaticMarkup
// no calcula alturas, y el bug era justamente de alto: 996 px de rail contra 872
// de pantalla, sin desplazamiento, derramandose sobre el pie. Lo que si fija es
// la decision de la que sale esa altura -- contraido se muestra TODO, sin plegar
// nada -- porque si alguien la cambia, el calculo del CSS deja de valer.
const storage = globalThis.localStorage;
globalThis.localStorage = {
  getItem: (key) => (key.startsWith("dashboardSidebarCollapsed") ? "true" : null),
  setItem: () => {},
  removeItem: () => {},
};

const collapsedShell = withAccess(
  ownerScreens,
  <DashboardShell {...{ me: { name: "Ana", role: "owner_profile" }, onLogout: () => {}, theme: "light", onToggleTheme: () => {} }}>
    <p>contenido</p>
  </DashboardShell>
);

check("contraido no esconde ningun enlace", collapsedShell, [
  ["dashboard-shell-collapsed"],
  ["Panel principal"],
  ["Mantenimientos"],
  ["Correos"],
  ["Mi perfil"],
  // Nada plegado: contraido no hay encabezado que explique por que falta algo.
  ['hidden=""', false],
  ["sidebar-group-toggle", false],
]);

check("contraido el nombre viaja en title, que es el tooltip que queda", collapsedShell, [
  ['title="Mantenimientos"'],
  ['title="Cerrar sesion"'],
  // El tooltip dibujado se fue con el CSS: dentro de un nav que se desplaza
  // salia recortado a una astilla de 52 px.
  ["data-tooltip", false],
]);

globalThis.localStorage = storage;

console.log("\nPantallas completas");
const shellProps = {
  me: { name: "Ana", role: "owner_profile" },
  onLogout: () => {},
  theme: "light",
  onToggleTheme: () => {},
};
function page(name, Component, expectations) {
  check(
    name,
    <MemoryRouter>
      <AccessProvider token={null} me={null}>
        <Component {...shellProps} />
      </AccessProvider>
    </MemoryRouter>,
    expectations
  );
}

page("OwnerMaintenancesPage", OwnerMaintenancesPage, [["Generar reporte"], ["Mantenimientos"]]);
page("OwnerInventoriesPage", OwnerInventoriesPage, [["Generar reporte"], ["Inventarios"]]);
page("OwnerReportsPage", OwnerReportsPage, [["Documentos generados"], ["Inventario por vehiculo"]]);
page("OwnerVehiclesPage", OwnerVehiclesPage, [["Vehiculos"], ["Año"]]);

console.log("\nPerfil");

function profilePage(name, me, expectations) {
  check(
    name,
    withAccess(ownerScreens, <ProfilePage {...shellProps} me={me} />),
    expectations
  );
}

const perfil = {
  id: 1, username: "monroyan", full_name: "Andres Monroy",
  email: "andres@example.com", role: "owner_profile", is_active: true,
};

profilePage("los tres campos editables y el cambio de contrasena", perfil, [
  ['id="full_name"'],
  ['id="username"'],
  ['id="email"'],
  ["Cambiar contrasena"],
  ['id="password_confirm"'],
  // El rol crudo ya no sale en pantalla: se muestra la etiqueta de la cuenta.
  ["owner_profile", false],
]);

profilePage("sin tocar el usuario no pide la contrasena actual", perfil, [
  // El campo aparece solo cuando el usuario o el correo cambian; en el estado de
  // reposo pedirlo no tendria nada en pantalla que lo explique.
  ['id="current_password"', false],
  // El de la seccion de contrasena es otro y si esta siempre.
  ['id="password_current"'],
]);

profilePage("una cuenta sin activar no dice que esta activa", {
  ...perfil, full_name: null, is_active: false,
}, [
  // Antes decia "Activo" escrito a mano, pasara lo que pasara.
  ["Pendiente de activar"],
]);

console.log(failures === 0 ? "\nTODO OK\n" : `\n${failures} FALLAS\n`);
process.exit(failures === 0 ? 0 : 1);
