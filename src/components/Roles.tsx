import { roles } from '@/data/content'

const Roles = () => (
  <section id="roles" className="section alt">
    <div className="container">
      <h2>User Roles</h2>
      <div className="grid">
        {roles.map((role) => (
          <div key={role.title} className="card">
            <h3>{role.title}</h3>
            <ul>
              {role.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default Roles
