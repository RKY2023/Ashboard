import "@/styles/globals.css";
import { Providers } from "../store/provider";
import { ThemeProvider } from "@/components/theme-provider"
import { Provider } from "react-redux";

const App = ({ Component, pageProps }) => {
  return (
    <>
     <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      >
      <Providers>
        <Component {...pageProps} />
      </Providers>
    </ThemeProvider>
    </>
  );
}
export default App;