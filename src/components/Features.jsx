import { features } from '../data/content'

const Features = () => (
  <section id="features" className="section">
    <div className="container">
      <h2>Core Features</h2>
      <div className="grid">
        {features.map((feature) => (
          <div key={feature.title} className="card">
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default Features
