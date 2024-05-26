import Head from "next/head";
import { Inter } from "next/font/google";
import styles from "@/styles/Home.module.css";
// import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from "react";
import Header from "@/components/UI/Header/Header";
// import { dashboardActions } from "@/store/dashboardReducer";

const inter = Inter({ subsets: ["latin"] });

const Main = () => {
  // const dispatch = useDispatch();
  
  useEffect(() => {
    // dispatch(dashboardActions.setTheme());
    const bodyElement = document.getElementsByTagName('body')[0];
    bodyElement.setAttribute('data-bs-theme','dark');
  },[]);

  return (
    <>
      <Head>
        <title>Ashboard</title>
        <meta name="keywords" content="HTML, CSS, JavaScript, ReactJS, NextJS, Dashboard"></meta>
        <meta name="description" content="My dashboard" />
        <meta name="author" content="Raj Kumar yadav"></meta>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      <main className={`${styles.main} ${inter.className} ${styles.body_gradiant}`}>
        <div>
        <h1  className="text-center">
          Welcome Rky
        </h1>
        </div>
        {/* <Link href='/career/projects'>Go to Projects</Link> */}
        
        
      </main>
    </>
    );
}

export default Main;