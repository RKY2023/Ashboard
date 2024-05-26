import { Container, Row ,Col, Card, Table  } from 'react-bootstrap';

const DUMMY_COLOR = [
    {
        hexCode: '#9400D3',
        name: 'Violet',
        value: {
            r: 144,
            g: 0,
            b: 83,
        },
        wavelength: 12,
    },
    {
        hexCode: '#4B0082',
        name: 'Indigo',
        value: {
            r: 75,
            g: 0,
            b: 211,
        },
        wavelength: 0,
    },
    {
        hexCode: '#0000FF',
        name: 'Blue',
        value: {
            r: 0,
            g: 0,
            b: 255,
        },
        wavelength: 0,
    },
    {
        hexCode: '#00FF00',
        name: 'Green',
        value: {
            r: 0,
            g: 255,
            b: 0,
        },
        wavelength: 0,
    },
    {
        hexCode: '#FFFF00',
        name: 'Yellow',
        value: {
            r: 255,
            g: 255,
            b: 0,
        },
        wavelength: 0,
    },
    {
        hexCode: '#FF7F00',
        name: 'Orange',
        value: {
            r: 255,
            g: 127,
            b: 0,
        },
        wavelength: 0,
    },
    {
        hexCode: '#FF0000',
        name: 'Red',
        value: {
            r: 255,
            g: 0,
            b: 0,
        },
        wavelength: 0,
    },
]
const DUMMY_COLOR_Blue = [
    {
        hexCode: '#00FFFF',
        name: 'Aqua',
        value: {
            r: 0,
            g: 255,
            b: 255,
        },
        wavelength: 12,
    },
    {
        hexCode: '#FF00FF',
        name: 'Pink',
        value: {
            r: 255,
            g: 0,
            b: 255,
        },
        wavelength: 12,
    },
    {
        hexCode: '#8F8FFF',
        name: 'Indigo',
        value: {
            r: 127,
            g: 127,
            b: 255,
        },
        wavelength: 0,
    },
    {
        hexCode: '#008FFF',
        name: 'Dodger Blue',
        value: {
            r: 0,
            g: 127,
            b: 255,
        },
        wavelength: 0,
    },
    {
        hexCode: '#8F00FF',
        name: 'Closer to Violet',
        value: {
            r: 127,
            g: 0,
            b: 255,
        },
        wavelength: 0,
    },
]
const DUMMY_COLOR_Green = [
    {
        hexCode: '#00FFFF',
        name: 'Aqua',
        value: {
            r: 0,
            g: 255,
            b: 255,
        },
        wavelength: 12,
    },
    {
        hexCode: '#FFFF00',
        name: 'Yellow',
        value: {
            r: 255,
            g: 255,
            b: 0,
        },
        wavelength: 12,
    },
    {
        hexCode: '#8FFF8F',
        name: 'Light Green',
        value: {
            r: 127,
            g: 255,
            b: 127,
        },
        wavelength: 0,
    },
    {
        hexCode: '#00FF8F',
        name: 'Sea Green',
        value: {
            r: 0,
            g: 255,
            b: 127,
        },
        wavelength: 0,
    },
    {
        hexCode: '#8FFF00',
        name: 'Pickle',
        value: {
            r: 127,
            g: 255,
            b: 0,
        },
        wavelength: 0,
    },
]
const DUMMY_COLOR_Red = [
    {
        hexCode: '#FF00FF',
        name: 'Pink',
        value: {
            r: 255,
            g: 0,
            b: 255,
        },
        wavelength: 12,
    },
    {
        hexCode: '#FFFF00',
        name: 'Yellow',
        value: {
            r: 255,
            g: 255,
            b: 0,
        },
        wavelength: 12,
    },
    {
        hexCode: '#FF8F8F',
        name: 'Peach',
        value: {
            r: 255,
            g: 127,
            b: 127,
        },
        wavelength: 0,
    },
    {
        hexCode: '#FF008F',
        name: 'Magenta',
        value: {
            r: 255,
            g: 0,
            b: 127,
        },
        wavelength: 0,
    },
    {
        hexCode: '#FF8F00',
        name: 'Orange',
        value: {
            r: 255,
            g: 127,
            b: 0,
        },
        wavelength: 0,
    },
]

const colorsPage = (props) => {
    const colorBoxContent = DUMMY_COLOR.map((color) => (
        <Col key={color.hexCode}>
            <Card>
                <Card.Header>{color.name}</Card.Header>
                <Card.Body>
                    <Card.Title>{color.value.r} {color.value.g} {color.value.b}</Card.Title>
                    <Card.Text style={{backgroundColor: color.hexCode }} className='p-2'>{" "}</Card.Text>
                </Card.Body>
            </Card>
        </Col>
    ));

    const colorBoxBlueContent = DUMMY_COLOR_Blue.map((color) => (
        <Col key={color.hexCode}>
            <Card>
                <Card.Header>{color.name}</Card.Header>
                <Card.Body>
                    <Card.Title>{color.value.r} {color.value.g} {color.value.b}</Card.Title>
                    <Card.Text style={{backgroundColor: color.hexCode }} className='p-2'>{" "}</Card.Text>
                </Card.Body>
            </Card>
        </Col>
    ));

    const colorBoxGreenContent = DUMMY_COLOR_Green.map((color) => (
        <Col key={color.hexCode}>
            <Card>
                <Card.Header>{color.name}</Card.Header>
                <Card.Body>
                    <Card.Title>{color.value.r} {color.value.g} {color.value.b}</Card.Title>
                    <Card.Text style={{backgroundColor: color.hexCode }} className='p-2'>{" "}</Card.Text>
                </Card.Body>
            </Card>
        </Col>
    ));

    const colorBoxRedContent = DUMMY_COLOR_Red.map((color) => (
        <Col key={color.hexCode}>
            <Card>
                <Card.Header>{color.name}</Card.Header>
                <Card.Body>
                    <Card.Title>{color.value.r} {color.value.g} {color.value.b}</Card.Title>
                    <Card.Text style={{backgroundColor: color.hexCode }} className='p-2'>{" "}</Card.Text>
                </Card.Body>
            </Card>
        </Col>
    ));


    const colorContent = (
        <Table className='table'>
            <tbody>
                <tr>
                    <td>
                    <Row>
                        {colorBoxContent}
                    </Row>
                    </td>
                </tr>
                <tr>
                    <td>
                    <Row>
                        {colorBoxBlueContent}
                    </Row>
                    </td>
                </tr>
                <tr>
                    <td>
                    <Row>
                        {colorBoxGreenContent}
                    </Row>
                    </td>
                </tr>
                <tr>
                    <td>
                    <Row>
                        {colorBoxRedContent}
                    </Row>
                    </td>
                </tr>
            </tbody>
        </Table>
    )

    return (
        <div className='container'>
        <div className='table-responsive-lg'>
            {colorContent}    
        </div>
        </div>
    );
};
export default colorsPage;