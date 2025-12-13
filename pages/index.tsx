import Head from "next/head";
import { Inter } from "next/font/google";
import styles from "@/styles/Home.module.css";
import { useEffect, useState } from "react";
import Dashboard from "./dashboard";
import Particle from "@/components/UI/Section/particle";
import { NavigationMenuDemo } from "@/components/navigation/Navigation";

const inter = Inter({ subsets: ["latin"] });

const Main = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  useEffect(() => {
    const bodyElement = document.body;
    bodyElement.setAttribute('data-bs-theme', 'dark');
  }, []);

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
      <NavigationMenuDemo className="w-full"/>
      <Particle className="" />
      <main className={` ${inter.className} ${styles.body_gradiant} w-full h-full`}>
        <Dashboard />     
      </main>
    </div>
    );
}

export default Main;