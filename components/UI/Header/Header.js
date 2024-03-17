import { Container, Nav, Navbar } from "react-bootstrap";

const Header = (props) => {
    return (
        <>
        <Navbar bg="dark" expand="sm" variant="dark">
            <Container>
                <Navbar.Brand>Ashboard</Navbar.Brand>
                <Nav>
                    <Nav.Link href='/home'>Home</Nav.Link>
                    <Nav.Link href='/career/projects'>Projects</Nav.Link>
                    <Nav.Link href='/anime'>Anime</Nav.Link>
                    {/* <Nav.Link href='/routine'>Routine</Nav.Link> */}
                    <Nav.Link href='/colors'>Colors</Nav.Link>
                    {/* <Nav.Link href='/govt'>Govt</Nav.Link> */}
                    <Nav.Link href='/login'>Login</Nav.Link>
                    <Nav.Link href='/profile'>Profile</Nav.Link>
                </Nav>
            </Container>
        </Navbar>
        </>
    );
};
export default Header;