import { Link } from 'react-router-dom'

const NotFound = () => (
  <section className="section">
    <div className="container page">
      <div className="card">
        <h1>Page not found</h1>
        <p>The page you requested doesn’t exist.</p>
        <Link className="btn primary" to="/">
          Back to Home
        </Link>
      </div>
    </div>
  </section>
)

export default NotFound
