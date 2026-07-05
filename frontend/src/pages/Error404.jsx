export default function Error404({ navegar }) {
  return (
    <div className="error-page">
      <div className="error-container">
        <img
          src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png"
          alt="Logo" className="logo"
        />
        <h1>404</h1>
        <h2>Página no encontrada</h2>
        <p>
          Lo sentimos, la página que buscas no existe o ha sido movida.<br />
          Por favor, verifica la dirección o regresa al inicio de sesión.
        </p>
        <a
          href="#"
          className="btn-volver"
          onClick={(e) => { e.preventDefault(); navegar("login"); }}
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
