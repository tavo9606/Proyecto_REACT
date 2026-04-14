import { useState } from "react";
import Navbar from "../components/Navbar";

const menuItems = [
  { id: "gestionCitas", label: "📅 Gestión Citas" },
  { id: "facturacion",  label: "💵 Facturación" },
  { id: "pagos",        label: "✅ Verificar Pagos" },
];

export default function PanelAdmin({ navegar }) {
  const [activo, setActivo] = useState("gestionCitas");

  return (
    <>
      <Navbar titulo="Panel Administrativo - SGIH" navegar={navegar} />

      <div className="layout">
        <aside className="sidebar">
          <h3>Administración</h3>
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
          <div className={`panel ${activo === "gestionCitas" ? "active" : ""}`}>
            <h2>📅 Gestión de Citas</h2>
            <p style={{ color: "#64748b" }}>Módulo en construcción...</p>
          </div>
          <div className={`panel ${activo === "facturacion" ? "active" : ""}`}>
            <h2>💵 Facturación</h2>
            <p style={{ color: "#64748b" }}>Módulo en construcción...</p>
          </div>
          <div className={`panel ${activo === "pagos" ? "active" : ""}`}>
            <h2>✅ Verificar Pagos</h2>
            <p style={{ color: "#64748b" }}>Módulo en construcción...</p>
          </div>
        </div>
      </div>
    </>
  );
}
