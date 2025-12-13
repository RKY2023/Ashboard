// import React from "react";
import Link from "next/link";
import HomeBody from "./homebody";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faTerminal,
  faVoicemail,
} from "@fortawesome/free-solid-svg-icons";
import { faAdn, faFacebook, faLinkedin } from "@fortawesome/free-brands-svg-icons";
import classes from "./index.module.css";
import Header from "@/components/UI/Header/Header";

function home() {
  return (
    <>
      <Header />
      <HomeBody />
      
      <section className={classes["section"]}>
        <div className="text-center">
          <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
            <text
              x="50%"
              y="50%"
              font-family="Arial"
              font-size="48"
              fill="white"
              text-anchor="middle"
            >
              Dashboard
            </text>
          </svg>
        </div>
      </section>
      <footer className={classes["footer"]}>
        <div className={classes["footer-body"]}>
          <div className={classes[("footer-logo", "logo")]}>
            <i className="fas fa-gamepad"></i>
            <h1>Ashboard</h1>
          </div>
          <ul className={classes["ul"]}>
            <h3>Short Links</h3>
            <li>Blog</li>
          </ul>
          <ul className={classes["ul"]}>
            <h3>Get In Touch</h3>
            <li>
              <FontAwesomeIcon icon={faLinkedin} size="lg" className="mx-2"/>
              Linkedin
            </li>
            <li>
              <FontAwesomeIcon icon={faFacebook} size="lg" className="mx-2"/> Blog
            </li>
          </ul>
        </div>
      </footer>
    </>
  );
}
export default home;
