import Accordion from 'react-bootstrap/Accordion';
import Govt_main from './govt_main';
import DataList from '@/components/DataList';

const INIT_DATA = [
    {
        id: 1,
        name: ''
    }
]
const Govt = () => {
    return (
<>
    {/* <Accordion defaultActiveKey="0">
    <Accordion.Item eventKey="0">
    <Accordion.Header>Manifesto 2019</Accordion.Header>
    <Accordion.Body>
    https://www.bjp.org/manifesto2019
    </Accordion.Body>
    </Accordion.Item>
    <Accordion.Item eventKey="1">
    <Accordion.Header>Election related</Accordion.Header>
    <Accordion.Body>
        No of seats per state  with Graph Analysis
    </Accordion.Body>
    </Accordion.Item>
    </Accordion> */}
    <DataList />
    <Govt_main/>
</>
    );
}

export default Govt;