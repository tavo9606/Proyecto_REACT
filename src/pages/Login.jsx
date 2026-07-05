import { useState } from "react";

const API = "http://localhost:3000";

export default function Login({ navegar }) {
  const [form, setForm] = useState({ usuario: "", rol: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.id]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.rol) { setError("⚠️ Debes seleccionar un rol"); return; }

    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("rol", form.rol);
        localStorage.setItem("usuario", form.usuario);

        const rutas = {
          medico: "panel_medico",
          enfermero: "panel_enfermero",
          administrador: "panel_admin",
          administrativo: "panel_admin",
          paciente: "panel_admin",
        };
        navegar(rutas[form.rol] || "error404");
      } else {
        setError("❌ " + (data.error || "Error al iniciar sesión"));
      }
    } catch {
      setError("🚫 No se pudo conectar con el servidor");
    }
  };

  return (
    <div className="login-page">
      <div className="formulario">
        <div className="logo-container">
          <img src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png" alt="Logo" />
        </div>
        <h2 className="nombre-hospital">Hospital Vida Sana</h2>
        <h1>Acceso al Sistema</h1>

        <form onSubmit={handleSubmit} className="col1" style={{ marginBottom: 0 }}>
          <div className="input-box">
            <input type="text" id="usuario" value={form.usuario} onChange={handleChange} required />
            <label>Usuario</label>
          </div>

          <div className="rol-container">
            <label htmlFor="rol">Identificarse como:</label>
            <select id="rol" value={form.rol} onChange={handleChange} required>
              <option value="">-- Selecciona un rol --</option>
              <option value="administrador">Administrador</option>
              <option value="administrativo">Personal Administrativo</option>
              <option value="medico">Médico</option>
              <option value="enfermero">Enfermero</option>
              <option value="paciente">Paciente</option>
            </select>
          </div>

          <div className="input-box">
            <input type="password" id="password" value={form.password} onChange={handleChange} required />
            <label>Contraseña</label>
          </div>

          {error && <p style={{ color: "red", fontSize: 13, textAlign: "center" }}>{error}</p>}

          <div className="recordar">
            <a href="#">¿Olvidó su contraseña?</a>
          </div>

          <button type="submit" className="btn-login">Entrar al Portal</button>

          <div className="registrarse">
            ¿No tienes cuenta?{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); navegar("registro"); }}>
              Regístrate
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
