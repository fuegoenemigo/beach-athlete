export const strengthOptions = [
  "weaker3", "weaker2", "weaker1", "equal", "stronger1", "stronger2", "stronger3",
];

export const strengthLabels = {
  weaker3: "3 Stufen schwächer",
  weaker2: "2 Stufen schwächer",
  weaker1: "1 Stufe schwächer",
  equal: "Gleich stark",
  stronger1: "1 Stufe stärker",
  stronger2: "2 Stufen stärker",
  stronger3: "3 Stufen stärker",
};

export const isRating = (value) => value !== "" && Number.isInteger(Number(value))
  && Number(value) >= 1 && Number(value) <= 10;
