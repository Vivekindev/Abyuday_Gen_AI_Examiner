export const DIFFICULTY_OPTIONS = Object.freeze([
  { value: 'easy', label: 'Easy', rating: 2 },
  { value: 'medium', label: 'Medium', rating: 5 },
  { value: 'hard', label: 'Hard', rating: 8 },
]);

// Text labels and older numeric clients use the same contract: integers 0–10.
export function difficultyRating(value) {
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    const option = DIFFICULTY_OPTIONS.find((item) => item.value === text);
    if (option) return option.rating;
    if (!/^\d{1,2}$/.test(text)) return null;
    value = Number(text);
  }
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10 ? value : null;
}

export function difficultyValue(value) {
  const rating = difficultyRating(value);
  return rating === null ? 'medium' : rating >= 7 ? 'hard' : rating >= 4 ? 'medium' : 'easy';
}

export function difficultyLabel(value) {
  return DIFFICULTY_OPTIONS.find((item) => item.value === difficultyValue(value)).label;
}
