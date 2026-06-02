interface Props {
  email: string;
  onChange: (email: string) => void;
}

export default function ContactForm({ email, onChange }: Props) {
  return (
    <section>
      <h2 className="headline-md" style={{ marginBottom: '24px' }}>Contact Information</h2>
      <div>
        <label className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }} htmlFor="email">EMAIL ADDRESS</label>
        <input id="email" type="email" placeholder="email@example.com" value={email}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
      </div>
    </section>
  );
}
