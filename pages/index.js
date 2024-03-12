import Head from "next/head";
import { Inter } from "next/font/google";
import styles from "@/styles/Home.module.css";
import Link from "next/link";
import { Container } from "react-bootstrap";
import Header from "@/components/UI/Header/Header";

const inter = Inter({ subsets: ["latin"] });

export default function Main() {
  return (
    <>
      <Head>
        <title>Ashboard</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      <main className={`${styles.main} ${inter.className}`}>
        
        <h1>
          Welcome User
        </h1>
        <Link href='/career/projects'>Go to Projects</Link>
        <Link href='/sharpener'>sharpener</Link>
        
      </main>
    </>
  );
}
