import RoomRow, { type RoomRowItem } from './RoomRow';

/** "In the room", with its heading. Renders nothing for fewer than two photos. */
export default function RoomSection({ items, label, id }: { items: RoomRowItem[]; label: string; id: string }) {
  if (items.length < 2) return null;
  return (
    <section className="room-section" aria-labelledby={id}>
      <h2 id={id} className="room-section-heading">
        In the room
      </h2>
      <RoomRow items={items} label={label} />
    </section>
  );
}
