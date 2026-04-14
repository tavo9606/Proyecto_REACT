import { useState } from "react";

export default function Registro({ navegar }) {
  const [form, setForm] = useState({
    nombres: "", cedula: "", usuario: "", email: "",
    fecha_nacimiento: "", role: "", clave: "",
  });

  const handleChange = (e) => setForm({ ...form, [e.target.id]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    alert("✅ Usuario registrado correctamente");
    navegar("login");
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
            placeholder="Usuario"
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
            value={form.fecha_nacimiento} onChange={handleChange} required
          />

          <select className="controls" id="role" value={form.role} onChange={handleChange} required>
            <option value="" disabled>-- Elija un rol --</option>
            <option value="admin">Administrador</option>
            <option value="medico">Médico</option>
            <option value="enfermero">Enfermero</option>
            <option value="paciente">Paciente</option>
          </select>

          <input
            className="controls" type="password" id="clave"
            placeholder="Contraseña"
            value={form.clave} onChange={handleChange}
          />

          <p>Estoy de acuerdo con <a href="#">Términos y Condiciones</a></p>

          <input className="botons" type="submit" value="Registrar" />
          <p><a href="#" onClick={(e) => { e.preventDefault(); navegar("login"); }}>¿Ya tengo cuenta?</a></p>
        </form>
      </section>
    </div>
  );
}
