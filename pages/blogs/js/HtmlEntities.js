import { useEffect, useState } from "react";

const HtmlEntities = (props) => {
  const [val, setVal] = useState([]);
  const [startVal, setStartVal] = useState(0);
  const [endVal, setEndVal] = useState(200);

  const addVal = () => {
    let valTemp = val;
    for(let i = startVal; i <= endVal; i++) {
      valTemp.push(i);
    }
    setVal(valTemp);
  };

  const entities = val.map( i => {
    return (
      <>
      <div style={{margin: '1rem'}}>
        {`&#${i};`}&#163;
      </div>
      </>
    )
  });

  useEffect(() => {
    addVal();
  },[]);

  return (
    <>
    a{entities}
    </>
  );
};

export default HtmlEntities;