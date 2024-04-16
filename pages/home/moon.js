import { Table } from 'react-bootstrap';
const INITIAL_DATA = [
  {
    "Date": "01/01/25",
    "Name": "Wolf Moon",
    "US_EasternTime": "12:54 p.m.",
    "GMT": "17:54:00"
  },
  {
    "Date": "01/02/24",
    "Name": "Snow Moon",
    "US_EasternTime": "7:30 a.m.",
    "GMT": "12:30:00"
  },
  {
    "Date": "01/03/25",
    "Name": "Worm Moon",
    "US_EasternTime": "3:00 a.m.",
    "GMT": "07:00:00"
  },
  {
    "Date": "01/04/23",
    "Name": "Pink Moon",
    "US_EasternTime": "7:49 p.m.",
    "GMT": "23:49:00"
  },
  {
    "Date": "01/05/23",
    "Name": "Flower Moon",
    "US_EasternTime": "9:53 a.m.",
    "GMT": "13:53:00"
  },
  {
    "Date": "01/06/21",
    "Name": "Strawberry Moon",
    "US_EasternTime": "9:08 p.m.",
    "GMT": "01:08 on June 22"
  },
  {
    "Date": "01/07/21",
    "Name": "Buck Moon",
    "US_EasternTime": "6:17 a.m.",
    "GMT": "10:17:00"
  },
  {
    "Date": "01/08/19",
    "Name": "Sturgeon Moon",
    "US_EasternTime": "2:26 p.m.",
    "GMT": "18:26:00"
  },
  {
    "Date": "01/09/17",
    "Name": "Harvest Moon",
    "US_EasternTime": "10:34 p.m.",
    "GMT": "02:34 on Sept. 18"
  },
  {
    "Date": "01/10/17",
    "Name": "Hunter's Moon",
    "US_EasternTime": "7:26 a.m.",
    "GMT": "11:26:00"
  },
  {
    "Date": "01/11/15",
    "Name": "Beaver Moon",
    "US_EasternTime": "4:29 p.m.",
    "GMT": "21:29:00"
  },
  {
    "Date": "01/12/15",
    "Name": "Cold Moon",
    "US_EasternTime": "4:02 a.m.",
    "GMT": "09:02:00"
  }
 ]

const Moon = () => {
  const tableContent = INITIAL_DATA.map( t => {
    return (
      <tr>
        <td>{t.Date}</td>
        <td>{t.Name}</td>
        <td>{t.US_EasternTime}</td>
        <td>{t.GMT}</td>
      </tr>
    )
  })

  return (
      <>
      <Table striped bordered hover>
      <thead>
        <tr>
          <th>Date</th>
          <th>Name</th>
          <th>U.S. Eastern Time</th>
          <th>GMT</th>
        </tr>
      </thead>
      <tbody>
        {tableContent}
      </tbody>
    </Table>
      </>
  );
};
export default Moon;