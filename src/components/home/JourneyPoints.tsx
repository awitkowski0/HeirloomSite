/**
 * A short list of plain statements inside a journey step.
 *
 * Deliberately not icons: these are facts about how the order works, and an
 * icon next to "nothing is charged today" adds decoration to the one line that
 * most needs to read as a plain statement.
 */
export default function JourneyPoints({ points }: { points: readonly string[] }) {
  return (
    <ul className="journey-points">
      {points.map(p => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  );
}
