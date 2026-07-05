import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";

const API = "http://localhost:3000/pacientes";

const menuItems = [
  { id: "registroPaciente", label: "👤 Registrar / Consultar Paciente" },
  { id: "historiaMedica",   label: "📄 Historia Clínica" },
  { id: "tratamientos",     label: "💊 Registrar Tratamiento" },
  { id: "hospitalizacion",  label: "🏥 Hospitalización" },
  { id: "reportes",         label: "📊 Reportes Médicos" },
];

export default function PanelMedico({ navegar }) {
  const [activo, setActivo] = useState("registroPaciente");
  const [pacientes, setPacientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [formPaciente, setFormPaciente] = useState({
    nombre: "", documento: "", edad: "", sexo: "Masculino", telefono: "", direccion: "",
  });

  // ── Cargar pacientes ──
  const cargar = async () => {
    try {
      const res = await fetch(API);
      const data = await res.json();
      setPacientes(data);
    } catch { setPacientes([]); }
  };

  useEffect(() => { cargar(); }, []);

  // ── Guardar paciente ──
  const guardarPaciente = async (e) => {
    e.preventDefault();
    try {
      await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formPaciente),
      });
      setFormPaciente({ nombre: "", documento: "", edad: "", sexo: "Masculino", telefono: "", direccion: "" });
      cargar();
    } catch { alert("Error al guardar paciente"); }
  };

  // ── Eliminar ──
  const eliminar = async (id) => {
    if (!window.confirm("¿Eliminar paciente?")) return;
    await fetch(`${API}/${id}`, { method: "DELETE" });
    cargar();
  };

  // ── Buscar ──
  const buscar = async () => {
    if (!busqueda) { cargar(); return; }
    try {
      const res = await fetch(`${API}?search=${busqueda}`);
      const data = await res.json();
      setPacientes(data);
    } catch { setPacientes([]); }
  };

  const handleFormChange = (e) =>
    setFormPaciente({ ...formPaciente, [e.target.id]: e.target.value });

  return (
    <>
      <Navbar subtitulo="Panel Médico - SGIH" navegar={navegar} />

      <div className="layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <h3 className="menu-title">Panel Médico</h3>
          <ul className="menu">
            {menuItems.map((item) => (
              <li
                key={item.id}
                className={`menu-item ${activo === item.id ? "active" : ""}`}
                onClick={() => setActivo(item.id)}
              >
                {item.label}
              </li>
            ))}
          </ul>
        </aside>

        {/* Main */}
        <main>
          {/* 👤 PACIENTES */}
          <div className={`panel ${activo === "registroPaciente" ? "active" : ""}`}>
            <h2>Registro de Pacientes</h2>
            <form onSubmit={guardarPaciente}>
              <input id="nombre"    placeholder="Nombre completo" value={formPaciente.nombre}    onChange={handleFormChange} required />
              <input id="documento" placeholder="Documento"       value={formPaciente.documento} onChange={handleFormChange} required />
              <input id="edad"      type="number" placeholder="Edad" value={formPaciente.edad}   onChange={handleFormChange} />
              <select id="sexo" value={formPaciente.sexo} onChange={handleFormChange}>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
              <input id="telefono"  placeholder="Teléfono"  value={formPaciente.telefono}  onChange={handleFormChange} />
              <input id="direccion" placeholder="Dirección" value={formPaciente.direccion} onChange={handleFormChange} />
              <button type="submit">Guardar Paciente</button>
            </form>

            <hr style={{ margin: "20px 0", border: "1px solid #f1f5f9" }} />
            <h3>Consulta de Pacientes</h3>

            <div className="buscador">
              <input
                placeholder="Buscar por nombre o documento"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ flex: 1 }}
              />
              <button onClick={buscar}>Buscar</button>
              <button onClick={cargar} className="btn-gray">Ver Todos</button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Nombre</th><th>Documento</th><th>Edad</th>
                  <th>Sexo</th><th>Teléfono</th><th>Dirección</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pacientes.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nombre}</td>
                    <td>{p.documento}</td>
                    <td>{p.edad || "—"}</td>
                    <td>{p.sexo}</td>
                    <td>{p.telefono || "—"}</td>
                    <td>{p.direccion || "—"}</td>
                    <td><button className="btn-delete" onClick={() => eliminar(p.id)}>Eliminar</button></td>
                  </tr>
                ))}
                {pacientes.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", color: "#94a3b8" }}>Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 📄 HISTORIA */}
          <div className={`panel ${activo === "historiaMedica" ? "active" : ""}`}>
            <h2>Historia Clínica</h2>
            <form className="col1">
              <input placeholder="Documento del paciente" />
              <input placeholder="Motivo de consulta" />
              <input placeholder="Signos vitales" />
              <textarea placeholder="Descripción clínica"></textarea>
              <textarea placeholder="Tratamiento"></textarea>
              <button type="button">Guardar</button>
            </form>
          </div>

          {/* 💊 TRATAMIENTOS */}
          <div className={`panel ${activo === "tratamientos" ? "active" : ""}`}>
            <h2>Tratamientos</h2>
            <form className="col1">
              <input placeholder="Documento del paciente" />
              <input placeholder="Medicamento" />
              <input placeholder="Dosis" />
              <textarea placeholder="Indicaciones"></textarea>
              <button type="button">Registrar</button>
            </form>
          </div>

          {/* 🏥 HOSPITALIZACIÓN */}
          <div className={`panel ${activo === "hospitalizacion" ? "active" : ""}`}>
            <h2>Hospitalización</h2>
            <form className="col1">
              <input placeholder="Documento del paciente" />
              <input placeholder="Número de cama" />
              <input type="date" />
              <select>
                <option>General</option>
                <option>UCI</option>
                <option>Observación</option>
              </select>
              <button type="button">Registrar</button>
            </form>
          </div>

          {/* 📊 REPORTES */}
          <div className={`panel ${activo === "reportes" ? "active" : ""}`}>
            <h2>Reportes</h2>
            <form className="col1">
              <input placeholder="Documento del paciente" />
              <select>
                <option>Historia Clínica</option>
                <option>Tratamientos</option>
                <option>Hospitalización</option>
              </select>
              <button type="button">Generar</button>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
