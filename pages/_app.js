import "@/styles/globals.css";
import "../node_modules/react-bootstrap/dist/react-bootstrap";
import "../node_modules/bootstrap/dist/css/bootstrap.css";
import { Providers } from "../store/provider";

const App = ({ Component, pageProps }) => {
  return (
    // <Providers>
      <Component {...pageProps} />
    // </Providers>
  );
}
export default App;