import Head from "next/head";
import { Inter } from "next/font/google";
import styles from "@/styles/Home.module.css";
// import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useState } from "react";
// import Header from "@/components/UI/Header/Header";
// import Portfolio from "./profile/portfolio";
import Dashboard from "./dashboard";
import Particle from "@/components/UI/Section/particle";
// import { NavigationMenu } from "@radix-ui/react-navigation-menu";
import { NavigationMenuDemo } from "@/components/navigation/Navigation";
// import { dashboardActions } from "@/store/dashboardReducer";

const inter = Inter({ subsets: ["latin"] });

const Main = () => {
  const [isLoggedIn, SetIsLoggIn] = useState(false);
  // const dispatch = useDispatch();
  
  useEffect(() => {
    // dispatch(dashboardActions.setTheme());
    const bodyElement = document.getElementsByTagName('body')[0];
    bodyElement.setAttribute('data-bs-theme','dark');
  },[]);

  return (
    <div className="h-100 w-100">
      <Head>
        <title>Ashboard</title>
        <meta name="keywords" content="HTML, CSS, JavaScript, ReactJS, NextJS, Dashboard"></meta>
        <meta name="description" content="My dashboard" />
        <meta name="author" content="Raj Kumar yadav"></meta>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* <Header isLoggedIn={isLoggedIn}/> */}
      <NavigationMenuDemo className="w-full"/>
      <Particle className='' />
      <main className={` ${inter.className} ${styles.body_gradiant} w-full h-full`}>
        <div>
         {/* import dashboard  */}
         <Dashboard />
        </div>     
      </main>
    </div>
    );
}

export default Main;