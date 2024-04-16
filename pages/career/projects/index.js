import Header from "@/components/UI/Header/Header";
import { dashboardActions } from "@/store/dashboardReducer";
import Link from "next/link";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import styles from "@/styles/Home.module.css";
import Accordion from 'react-bootstrap/Accordion';

const INITIAL_PROJECTS = [
  {
    id: 0,
    name: 'Ashboard',
    url: 'https://ashboard-ruby.vercel.app/',
  },
  {
    id: 1,
    name: 'Expense tracker',
    url: 'https://expensetracker-7505d.web.app/',
  },
  {
    id: 2,
    name: 'Mailbox',
    url: 'https://mailboxx-72dc0.web.app/',
  },
  {
    id: 3,
    name: 'Ecommerce',
    url: 'https://atomic-matrix-193707.web.app/',
  },
  {
    id: 4,
    name: 'Meetups',
    url: 'meetups1-seven.vercel.app',
  }
]

export default function projectPage () {
  // const dispatch = useDispatch();

  const content = INITIAL_PROJECTS.map(proj => {
    return (
    <Accordion.Item eventKey={proj.id} Key={proj.id}>
      <Accordion.Header>{proj.name}</Accordion.Header>
      <Accordion.Body>
        <Link href={proj.url}></Link>
      </Accordion.Body>
    </Accordion.Item>
    );
  })

  useEffect(() => {
    const bodyElement = document.getElementsByTagName('body')[0];
    bodyElement.setAttribute('data-bs-theme','dark');
    localStorage.setItem('theme','dark');        
  },[]);

  return (
<>
<Header />
<div className={`${styles.main} ${styles.body_gradiant}`}>
  {/* <h1 className='m-2 text-center'>
      Projects here
  </h1> */}    

  <Accordion defaultActiveKey="0">
    {content}
  </Accordion>
</div>
</>
    );
};