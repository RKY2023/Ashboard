import Link from "next/link";
import classes from './Header.module.css';
import ThemeButton from "./ThemeButton";
import dynamic from 'next/dynamic';
const Container = dynamic(() => import('react-bootstrap').then(mod => mod.Container), { ssr: false });
const Nav = dynamic(() => import('react-bootstrap').then(mod => mod.Nav), { ssr: false });
const Navbar = dynamic(() => import('react-bootstrap').then(mod => mod.Navbar), { ssr: false });

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