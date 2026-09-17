import { useEffect, useState } from "react";

import { api } from "../api";
import { formatDate } from "../utils/format";

/**
 * Which of the truck's papers go on the sheet.
 *
 * Only the ones a truck can hold **several of at once** are listed -- the polizas
 * today. Choosing among those is a real question: a workshop has no use for the
 * mercancias cover. The SOAT and the tecnomecanica are not offered, because the
 * report prints them either way; their absence is the answer somebody reads for,
 * and a line that could be withheld would make "Sin registrar" ambiguous.
 *
 * Which types those are comes from the API (`document_type.allows_multiple`), not
 * from a code spelled out here. This screen should not know what a poliza is.
 *
 * `value` is null until the list loads: null means "all of them" to the API, so a
 * failed fetch degrades to the old behaviour rather than to an empty selection.
 */
export default function VehiclePapersOption({ isOpen, vehicleId, value, onChange }) {
  const [papers, setPapers] = useState([]);

  useEffect(() => {
    if (!isOpen || !vehicleId) return;
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get("/owner/documents", {
          params: {
            page: 1,
            page_size: 50,
            status: "active",
            only_current: true,
            vehicle_id: vehicleId,
          },
        });
        if (cancelled) return;
        const several = data.filter((row) => row.document_type?.allows_multiple);
        setPapers(several);
        onChange(several.map((row) => row.id));
      } catch {
        // Silent on purpose: this is one optional block inside a modal that
        // already opened. Leaving `value` null prints every paper, which is what
        // the report did before there was anything to choose.
        if (!cancelled) setPapers([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, vehicleId]);

  if (papers.length === 0) return null;

  const selected = new Set(value ?? papers.map((row) => row.id));

  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  return (
    <div className="report-option-group">
      <span className="hint">Polizas a incluir</span>
      {papers.map((paper) => (
        <label key={paper.id} className="owner-checkbox">
          <input
            type="checkbox"
            checked={selected.has(paper.id)}
            onChange={() => toggle(paper.id)}
          />
          {paper.number || paper.issuer || paper.document_type?.label} · vence{" "}
          {formatDate(paper.expires_on)}
        </label>
      ))}
    </div>
  );
}
