import React, { useEffect, useState } from 'react'
import classes from './homeContent.module.css';

const INITIAL_REASON = [
  {
    title: "Energy Consumption",
    summary: "Electricity meter & devices usage"
  },
  {
    title: "Cooking Emission",
    summary: "Natural gas consumption & Litchen Ventillation"
  },
  {
    title: "Vehicle Emission",
    summary: "Distance travelled via petrol"
  },
]

function HomeContentDefaultDashboard() {
  const [data, setData] = useState([]);
  const tableContentHandler = () => {
    let htmlContent = INITIAL_REASON.map((item, idx) => (
      <div className={classes['card']} key={item.title || idx}>
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