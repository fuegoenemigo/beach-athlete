import { strengthLabels } from "./volleyballValues.js";
import { NumberWheel, ChoiceWheel } from './WheelPicker.jsx';

export function RatingStepper({ id, label, value, onChange }) {
  return <NumberWheel label={label} value={value} onChange={onChange}
    min={1} max={10} step={1} className="rating-wheel" key={id} />;
}

export function StrengthStepper({ value, options, onChange }) {
  return <ChoiceWheel label="Gegnerstärke im Verhältnis zu euch" value={value}
    options={options.map((option) => ({ value: option, label: strengthLabels[option] }))}
    onChange={onChange} className="strength-wheel" />;
}

export function SetResultHeading({ number, won }) {
  return (
    <h4 className="set-result-heading">
      <span className={`set-result-mark ${won ? "is-win" : "is-loss"}`}
        role="img" aria-label={won ? "Gewonnen" : "Verloren"}>
        {won ? "✓" : "✕"}
      </span>
      Satz {number}
    </h4>
  );
}
