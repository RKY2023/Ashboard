import { Container, Nav, Navbar } from "react-bootstrap";
import Link from "next/link";
import classes from './Header.module.css';
import ThemeButton from "./ThemeButton";

const Header = (props) => {
    return (
        <>
        <Navbar bg="dark" expand="sm" variant="dark">
            <Container>
                <Navbar.Brand>Ashboard</Navbar.Brand>
                <Nav>
                    {/* <Nav.Link href='/home'>Home</Nav.Link> */}
                    {/* <Link href='/home' className="nav-link">
                        Home
                    </Link> */}
                    <Link href='/career/projects' className="nav-link">
                        Projects
                    </Link>
                    <Link href='/blogs/anime' className="nav-link">
                        Anime
                    </Link>
                    <Link href='/blogs/routine' className="nav-link">
                        Routine
                    </Link>
                    <Link href='/blogs/colors' className="nav-link">
                        Colors
                    </Link>
                    <Link href='/blogs/govt' className="nav-link">
                        Govt
                    </Link>
                    <Link href='/login' className="nav-link">
                        Login
                    </Link>
                    <ThemeButton />
                    {/* <Link href='/profile' className="nav-link">
                        Profile
                    </Link>                   */}
                    
                </Nav>
            </Container>
        </Navbar>
        </>
    );
};
export default Header;