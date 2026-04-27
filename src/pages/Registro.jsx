import { useState } from "react";

const API = "http://localhost:3000";

export default function Registro({ navegar }) {
  const [form, setForm] = useState({
    nombres: "", cedula: "", usuario: "", email: "",
    fecha_nacimiento: "", rol: "", password: "",
  });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.id]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.rol) { setError("⚠️ Debes seleccionar un rol"); return; }
    setCargando(true);
    try {
      const res = await fetch(`${API}/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: form.usuario,
          password: form.password,
          rol: form.rol,
          nombres: form.nombres,
          cedula: form.cedula,
          email: form.email,
          fecha_nacimiento: form.fecha_nacimiento || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ Usuario registrado correctamente");
        navegar("login");
      } else {
        setError("❌ " + (data.error || "Error al registrar"));
      }
    } catch {
      setError("🚫 No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="registro-page">
      <section className="form-registrer">
        <h4>Formulario Registro</h4>

        <form onSubmit={handleSubmit} className="col1" style={{ marginBottom: 0 }}>
          <input
            className="controls" type="text" id="nombres"
            placeholder="Nombres y apellidos"
            value={form.nombres} onChange={handleChange}
          />
          <input
            className="controls" type="text" id="cedula"
            placeholder="Cédula"
            value={form.cedula} onChange={handleChange}
          />
          <input
            className="controls" type="text" id="usuario"
            placeholder="Usuario" required
            value={form.usuario} onChange={handleChange}
          />
          <input
            className="controls" type="email" id="email"
            placeholder="Correo electrónico"
            value={form.email} onChange={handleChange}
          />

          <label htmlFor="fecha_nacimiento" className="label-fecha">Fecha de nacimiento:</label>
          <input
            className="controls" type="date" id="fecha_nacimiento"
            min="1900-01-01" max="2025-11-09"
            value={form.fecha_nacimiento} onChange={handleChange}
          />

          <select className="controls" id="rol" value={form.rol} onChange={handleChange} required>
            <option value="" disabled>-- Elija un rol --</option>
            <option value="administrador">Administrador</option>
            <option value="medico">Médico</option>
            <option value="enfermero">Enfermero</option>
            <option value="paciente">Paciente</option>
          </select>

          <input
            className="controls" type="password" id="password"
            placeholder="Contraseña" required
            value={form.password} onChange={handleChange}
          />

          {error && <p style={{ color: "red", fontSize: 13, textAlign: "center" }}>{error}</p>}

          <p>Estoy de acuerdo con <a href="#">Términos y Condiciones</a></p>

          <input className="botons" type="submit" value={cargando ? "Registrando..." : "Registrar"} disabled={cargando} />
          <p><a href="#" onClick={(e) => { e.preventDefault(); navegar("login"); }}>¿Ya tengo cuenta?</a></p>
        </form>
      </section>
    </div>
  );
}
