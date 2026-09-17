/**
 * The cases. See run.mjs for what this is and what it cannot see.
 *
 * Add one whenever a screen gains a prop or an option: the cost is four lines
 * and the bug it catches is a blank page.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { AccessProvider } from "../../src/access";
import AttachmentField from "../../src/components/AttachmentField";
import InventoryFormModal from "../../src/components/modals/InventoryFormModal";
import ReportPickerModal from "../../src/components/modals/ReportPickerModal";
import VehiclePapersOption from "../../src/components/VehiclePapersOption";
import VehicleFormModal from "../../src/components/modals/VehicleFormModal";
import OwnerInventoriesPage from "../../src/pages/owner/OwnerInventoriesPage";
import OwnerMaintenancesPage from "../../src/pages/owner/OwnerMaintenancesPage";
import OwnerReportsPage from "../../src/pages/owner/OwnerReportsPage";
import OwnerVehiclesPage from "../../src/pages/owner/OwnerVehiclesPage";

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

console.log("\nFormularios");
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

console.log(failures === 0 ? "\nTODO OK\n" : `\n${failures} FALLAS\n`);
process.exit(failures === 0 ? 0 : 1);
