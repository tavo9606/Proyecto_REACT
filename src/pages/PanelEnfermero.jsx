import { useState } from "react";
import Navbar from "../components/Navbar";

const menuItems = [
  { id: "medicamentos", label: "💊 Medicamentos" },
  { id: "camas",        label: "🛏️ Gestión de Camas" },
  { id: "notas",        label: "📝 Notas" },
];

export default function PanelEnfermero({ navegar }) {
  const [activo, setActivo] = useState("medicamentos");

  return (
    <>
      <Navbar titulo="Panel Enfermería - SGIH" navegar={navegar} />

      <div className="layout">
        <aside className="sidebar">
          <h3>Enfermería</h3>
          <ul>
            {menuItems.map((item) => (
              <li
                key={item.id}
                className={activo === item.id ? "active" : ""}
                onClick={() => setActivo(item.id)}
              >
                {item.label}
              </li>
            ))}
          </ul>
        </aside>

        <div id="content">
          <div className={`panel ${activo === "medicamentos" ? "active" : ""}`}>
            <h2>💊 Medicamentos</h2>
            <p style={{ color: "#64748b" }}>Formulario de medicamentos...</p>
          </div>
          <div className={`panel ${activo === "camas" ? "active" : ""}`}>
            <h2>🛏️ Gestión de Camas</h2>
            <p style={{ color: "#64748b" }}>Formulario de camas...</p>
          </div>
          <div className={`panel ${activo === "notas" ? "active" : ""}`}>
            <h2>📝 Notas</h2>
            <p style={{ color: "#64748b" }}>Formulario de notas...</p>
          </div>
        </div>
      </div>
    </>
  );
}
