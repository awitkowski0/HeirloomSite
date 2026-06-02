const steps = [
  {
    number: '01',
    icon: 'forest',
    title: 'Wood Selection',
    description: "Your 24-hour cancellation period isn't just paperwork. It's when we hand-select the perfect wood for your crib. Brown Maple, Cherry, or Red Oak, chosen grain by your family.",
  },
  {
    number: '02',
    icon: 'handyman',
    title: 'The Build',
    description: 'Once the deposit processes and your order is confirmed, the building begins. Every dovetail and mortise-and-tenon joint is cut by hand—built.',
  },
  {
    number: '03',
    icon: 'palette',
    title: 'Expert Staining',
    description: 'When the build is complete, your crib moves to our master stainer. The finish you chose is applied by hand using organic, child-safe oils. The remaining 50% is then processed.',
  },
  {
    number: '04',
    icon: 'local_shipping',
    title: 'White-Glove Delivery',
    description: 'Shipped directly to your door. Our carrier will contact you to schedule a delivery date that works for you.',
  },
];

export default function JourneyTimeline() {
  return (
    <section className="container" style={{ padding: '80px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <span className="label-caps text-secondary">A Handcrafted Experience</span>
        <h2 className="headline-xl text-primary" style={{ marginTop: '8px' }}>Your Heirloom's Journey</h2>
      </div>

      <div className="journey-timeline">
        {steps.map(step => (
          <div key={step.number} className="journey-step">
            <div className="journey-step-icon">
              <span className="material-symbols-outlined">{step.icon}</span>
            </div>
            <div className="journey-step-content">
              <div className="journey-step-header">
                <span className="journey-step-number">{step.number}</span>
                <h3>{step.title}</h3>
              </div>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
