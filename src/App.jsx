import { useState } from "react";  /* es nuestra login*/
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import PanelMedico from "./pages/PanelMedico";
import PanelAdmin from "./pages/PanelAdmin";
import PanelEnfermero from "./pages/PanelEnfermero";
import Error404 from "./pages/Error404";
import "./index.css";

export default function App() {
  const [pagina, setPagina] = useState("login");

  const navegar = (ruta) => setPagina(ruta);

  const rutas = {
    login: <Login navegar={navegar} />,
    registro: <Registro navegar={navegar} />,
    panel_medico: <PanelMedico navegar={navegar} />,
    panel_admin: <PanelAdmin navegar={navegar} />,
    panel_enfermero: <PanelEnfermero navegar={navegar} />,
    error404: <Error404 navegar={navegar} />,
  };

  return rutas[pagina] || <Error404 navegar={navegar} />;
}
