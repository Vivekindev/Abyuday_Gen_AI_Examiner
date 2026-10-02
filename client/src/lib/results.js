export function normalizeAttempts(rows, team = false) {
  return rows.map((row) => {
    const result = team ? row : row.results;
    const total = Number(result?.total) || 0;
    const score = Math.min(total, Math.max(0, Number(result?.score) || 0));
    const ended = team || row.isEnded;
    return {
      ...row,
      isEnded: ended,
      score,
      total,
      percentage: ended && total > 0 ? (score / total) * 100 : null,
      incorrect: Number.isFinite(result?.incorrect) ? result.incorrect : null,
      unanswered: Number.isFinite(result?.unanswered)
        ? result.unanswered
        : null,
      date: row.finishedAt || row.endedAt || row.startTime,
    };
  });
}
export function summarizeResults(rows) {
  const completed = rows.filter(
    (row) => row.isEnded && row.percentage !== null,
  );
  const total = completed.reduce((sum, row) => sum + row.total, 0);
  const correct = completed.reduce((sum, row) => sum + row.score, 0);
  const detailed = completed.every(
    (row) => row.incorrect !== null && row.unanswered !== null,
  );
  return {
    completed,
    total,
    correct,
    detailed,
    average: completed.length
      ? completed.reduce((sum, row) => sum + row.percentage, 0) /
        completed.length
      : null,
    best: completed.length
      ? Math.max(...completed.map((row) => row.percentage))
      : null,
    accuracy: total ? (correct / total) * 100 : null,
    incorrect: detailed
      ? completed.reduce((sum, row) => sum + row.incorrect, 0)
      : total - correct,
    unanswered: detailed
      ? completed.reduce((sum, row) => sum + row.unanswered, 0)
      : 0,
  };
}
export function rankScores(rows) {
  const sorted = rows
    .filter((row) => row.isEnded && row.percentage !== null)
    .sort(
      (a, b) =>
        b.percentage - a.percentage || new Date(b.date) - new Date(a.date),
    );
  let rank = 0;
  return sorted.map((row, index) => {
    if (
      index === 0 ||
      Math.abs(row.percentage - sorted[index - 1].percentage) > 0.000001
    )
      rank = index + 1;
    return { ...row, rank };
  });
}
export function withinPeriod(row, days, now = Date.now()) {
  if (!days || days === "all") return true;
  const date = new Date(row.date).getTime();
  return (
    Number.isFinite(date) &&
    date >= now - Number(days) * 86400000 &&
    date <= now
  );
}
export const percentageLabel = (value) =>
  value === null || !Number.isFinite(value) ? "—" : `${Math.round(value)}%`;
