import { isRating, strengthLabels } from "./volleyballValues.js";

export function RatingStepper({ id, label, value, onChange }) {
  const number = Number(value);
  const valid = isRating(value);

  function step(direction) {
    onChange(String(valid ? Math.max(1, Math.min(10, number + direction)) : 5));
  }

  return (
    <>
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="beach-stepper">
        <button type="button" className="beach-stepper-button" aria-label={`${label}: verringern`}
          disabled={valid && number <= 1} onClick={() => step(-1)}>▼</button>
        <input id={id} className="field beach-stepper-value" type="number" inputMode="numeric"
          min="1" max="10" step="1" value={value}
          onChange={(event) => onChange(event.target.value)} />
        <button type="button" className="beach-stepper-button" aria-label={`${label}: erhöhen`}
          disabled={valid && number >= 10} onClick={() => step(1)}>▲</button>
      </div>
    </>
  );
}

export function StrengthStepper({ value, options, onChange }) {
  const index = options.indexOf(value);

  return (
    <div className="beach-strength-field" role="group" aria-label="Gegnerstärke im Verhältnis zu euch">
      <span className="field-label">Gegnerstärke im Verhältnis zu euch</span>
      <div className="beach-stepper">
        <button type="button" className="beach-stepper-button" aria-label="Gegnerstärke verringern"
          disabled={index <= 0} onClick={() => onChange(options[index - 1])}>▼</button>
        <output className="beach-stepper-display" aria-live="polite">{strengthLabels[value]}</output>
        <button type="button" className="beach-stepper-button" aria-label="Gegnerstärke erhöhen"
          disabled={index >= options.length - 1} onClick={() => onChange(options[index + 1])}>▲</button>
      </div>
    </div>
  );
}
