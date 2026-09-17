import { useEffect, useRef, useState } from "react";

import { api, getErrorMessage } from "../api";

// Below this, a query matches half the country and still costs a call.
const MIN_CHARS = 3;
// Long enough that a normal typing burst is one request, short enough that the
// list feels attached to the keyboard.
const DEBOUNCE_MS = 350;

/**
 * A place field: type it, pick where it is.
 *
 * Two lists, deliberately, and the order matters:
 *
 *   - **TUS LUGARES** — read from our own table on every keystroke. Instant,
 *     free, and the only place a finca with no address can come from.
 *   - **GOOGLE** — suggestions while typing.
 *
 * ## The session token is the whole economy of this component
 *
 * Google bills autocomplete per *session*, not per request: every keystroke sent
 * under one token, plus the details lookup for whatever gets picked, counts once.
 * So the token is minted when somebody starts typing and **thrown away the moment
 * they pick**. Rotate it per keystroke and the cost becomes one call per letter;
 * never rotate it and later sessions ride on a stale token.
 *
 * The text input remains the thing that gets saved. A trip whose origin Google
 * has never heard of still saves, which is why this stays a text field with
 * suggestions rather than a picker.
 */
export default function PlaceAutocomplete({
  id,
  label,
  value,
  placeId,
  onTextChange,
  onPlaceChange,
  required = false,
}) {
  const [own, setOwn] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const debounce = useRef(null);
  const session = useRef(null);

  /** One token for one field being filled in. */
  function currentSession() {
    if (!session.current) {
      session.current =
        globalThis.crypto?.randomUUID?.() || `s-${Date.now()}-${Math.random()}`;
    }
    return session.current;
  }

  useEffect(() => {
    if (!isOpen) return undefined;
    clearTimeout(debounce.current);

    debounce.current = setTimeout(async () => {
      const query = (value || "").trim();

      // Ours first, always, and whatever happens to Google.
      try {
        const { data } = await api.get("/owner/places", {
          params: { q: query, limit: 6 },
        });
        setOwn(data);
      } catch {
        setOwn([]);
      }

      if (query.length < MIN_CHARS) {
        setPredictions([]);
        return;
      }
      try {
        const { data } = await api.get("/owner/places/autocomplete", {
          params: { q: query, session: currentSession(), limit: 5 },
        });
        setPredictions(data);
        setError("");
      } catch (err) {
        // The field underneath still works, so this is a note, not a failure.
        setPredictions([]);
        setError(getErrorMessage(err, ""));
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounce.current);
  }, [value, isOpen]);

  function close(place) {
    onTextChange(place.label);
    onPlaceChange(place.id);
    setPredictions([]);
    setIsOpen(false);
    // The session ends with the pick. The next field, or the next edit, buys a
    // new one.
    session.current = null;
  }

  async function choosePrediction(prediction) {
    try {
      const { data } = await api.post("/owner/places/from-prediction", {
        place_id: prediction.place_id,
        session: currentSession(),
        label: prediction.main_text,
      });
      close(data);
    } catch (err) {
      setError(getErrorMessage(err, "No fue posible guardar el lugar."));
    }
  }

  const hasList = own.length > 0 || predictions.length > 0;

  return (
    <div className="field place-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        value={value}
        required={required}
        autoComplete="off"
        onChange={(event) => {
          onTextChange(event.target.value);
          // The text no longer describes the pinned place, so the pin goes.
          onPlaceChange(null);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        // A click on a suggestion has to land before the list closes.
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      />

      {placeId ? <span className="place-pinned">Ubicacion guardada</span> : null}
      {error ? <span className="hint hint-warning">{error}</span> : null}

      {isOpen && hasList ? (
        <ul className="place-suggestions">
          {own.length > 0 ? (
            <li className="place-group">Tus lugares</li>
          ) : null}
          {own.map((place) => (
            <li key={`own-${place.id}`}>
              <button type="button" onMouseDown={() => close(place)}>
                <strong>{place.label}</strong>
                {place.formatted_address ? <small>{place.formatted_address}</small> : null}
              </button>
            </li>
          ))}

          {predictions.length > 0 ? <li className="place-group">Google</li> : null}
          {predictions.map((prediction) => (
            <li key={`new-${prediction.place_id}`}>
              <button type="button" onMouseDown={() => choosePrediction(prediction)}>
                <strong>{prediction.main_text}</strong>
                {prediction.secondary_text ? <small>{prediction.secondary_text}</small> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
