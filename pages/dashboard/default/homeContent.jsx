import React, { useEffect, useState } from 'react'
import classes from './homeContent.module.css';

const INITIAL_REASON = [
  {
    title: "Singlular Platform",
    summary: "This"
  },
  {
    title: "Check Energy Consumption",
    summary: "This"
  },
  // {
  //   title: "Track Expenses",
  //   summary: "This"
  // },
  {
    title: "Discover way to optimize waste it",
    summary: "RRR (Reduce, Reuse, Recycle)"
  },
  {
    title: "Singlular Platform",
    summary: "This"
  },
]

function HomeContentDefaultDashboard() {
  const [data, setData] = useState([]);
  const tableContentHandler = () => {
    let htmlContent = INITIAL_REASON.map(item => (
      <div className={classes['card']}>
      <h3>{item.title}</h3>
      <p>
        {item.summary}
      </p>
  
      </div>
    ));
    setData(htmlContent);
  }
  useEffect(()=> {
    tableContentHandler();
  },[])

  return (
    <div>
      {/* features */}
      <section>
        <div className={classes['feature']}>
          <h1 className={classes['feature-headline']}>Why Ashboard?</h1>
          <div className={classes['feature-list']}>
          {data}
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomeContentDefaultDashboard