import React from "react";
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
                        <Nav.Link href='/home'>Home</Nav.Link>
                        <Nav.Link href='/routine'>Routine</Nav.Link>
                        <Nav.Link href='/colors'>Colors</Nav.Link>
                        <Nav.Link href='/govt'>Govt</Nav.Link>
                        <Nav.Link href='/login'>Login</Nav.Link>
                        <Nav.Link href='/profile'>Profile</Nav.Link>
                    </Nav>
                </Container>
            </Navbar>
        </>
    )
}

export default Header;