import { useState } from "react";

export default function Navbar({ titulo, subtitulo, navegar }) {
  const [abierto, setAbierto] = useState(false);
  const usuario = localStorage.getItem("usuario") || "Usuario";

  const cerrarSesion = () => {
    localStorage.clear();
    navegar("login");
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <img
          src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png"
          className="logo-hospital" alt="Logo"
        />
        <div className="titulo">
          <strong>Hospital Vida Sana</strong>
          {subtitulo && <span>{subtitulo}</span>}
        </div>
      </div>

      {!subtitulo && <span className="navbar-title">{titulo}</span>}

      <div className="user-menu">
        <img
          src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
          className="user-img" alt="Usuario"
          onClick={() => setAbierto(!abierto)}
        />
        {abierto && (
          <div className="user-dropdown">
            <p className="titulo-menu">{usuario}</p>
            <button onClick={cerrarSesion}>Cerrar sesión</button>
          </div>
        )}
      </div>
    </header>
  );
}
