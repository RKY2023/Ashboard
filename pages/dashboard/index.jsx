import React, { useEffect, useState } from 'react'
import { Table } from 'react-bootstrap'

function Dashboard() {
  const [tableContent, setTableContent] = useState();
  async function addMeetupHandler (enteredMeetupData) {
    console.log(enteredMeetupData);
    const response = await fetch('/api/ipaddress'
      // , 
      // {
      //   method: 'GET',
      //   body: JSON.stringify(enteredMeetupData),
      //   headers: {
      //       'Content-Type': 'application/json'
      //   }
      // }
    );
    const data = await response.json();
    console.log(data);
    setTableContent(tableContentHandler(data));
    // getMeetupHandler();
  };

  const tableContentHandler = (data) => {
    return data.map(item => (
      <tr>
        <td>{item.date}</td>
        <td>{item.public}</td>
        <td>{item.private}</td>
      </tr>
    ));
  }

  useEffect(() => {
    console.log('uef');
    addMeetupHandler();
  },[]);

  return (
    <>
    <div>
      <h1>
        Dashboard
      </h1>
      <div>
        <div>
          0 task in progress
        </div>
        <div>
          0 task executed
        </div>
      </div>
    </div>

    <div>
      <div>
        IP address updation
      </div>
      <div>
        <Table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Public</th>
              <th>Private</th>
            </tr>
          </thead>
          <tbody>
            {tableContent}
          </tbody>
        </Table>
      </div>
    </div>
    </>
  )
}

export default Dashboard