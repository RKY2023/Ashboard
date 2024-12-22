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
                    
                    {/* <Link href='/blogs/govt' className="nav-link">
                        Govt
                    </Link> */}
                    {props.isLoggedIn &&
                    <Link href='/login' className="nav-link">
                        {props.userData.name || 'user'} 
                    </Link>
                    }
                    {!props.isLoggedIn &&
                    <Link href='/login' className="nav-link">
                        Login
                    </Link>
                    }
                    {/* <ThemeButton /> */}
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