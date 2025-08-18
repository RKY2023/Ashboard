import Header from "@/components/UI/Header/Header";
import React, { useEffect, useCallback, useState, useReducer, useRef } from "react";
import { Row, Col, FormGroup, FormLabel, FormControl, Form, Button} from 'react-bootstrap';

const Login = () => {
    const [error, setError] = useState();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userData, setUserData] = useState();
    const inputEmailRef = useRef();
    const inputPasswordRef = useRef();

    const submitHandler = (event) => {
        event.preventDefault();
        let userData;
        
        userData = {
            email: inputEmailRef.current.value,
            password: inputPasswordRef.current.value,
        }      
        // console.log('submit', userData);
        loginHandler(userData);
    }

    const loginHandler = useCallback( async (userData) => {
        let loginUrl, payload;
        loginUrl = '/api/login';
        payload = {
            email: userData.email,
            password: userData.password,
        };
         
        const response = await  fetch(loginUrl, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // console.log(response)
        const data = await response.json();
        // console.log('data',data);
        if(data.success){
            setIsLoggedIn(true);
            setUserData(data.data);
        }
    },[]);

    useEffect( () => {
        // console.log('useEffect');
        // console.log(process.env.API_URL);
        // datafetcher();
    },[]);

    async function addMeetupHandler (enteredMeetupData) {
        const response = await fetch('/api/user', {
            method: 'POST',
            body: JSON.stringify(enteredMeetupData),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        // console.log(data);
        // getMeetupHandler();
    };

    return (
        <>
        <Header isLoggedIn={isLoggedIn} userData={userData}/>
        <div className="container mt-5">
        <div>{error}</div>
        <Form onSubmit={submitHandler}>
            <Form.Group className="mt-2">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" placeholder="Enter Email" ref={inputEmailRef}/>
            </Form.Group>
            <Form.Group className="mt-2">
                <Form.Label>Password</Form.Label>
                <Form.Control type="password" placeholder="Password" ref={inputPasswordRef}/>
            </Form.Group>
            
            <Button variant="primary" type="submit" className="mt-3">
                Login
            </Button>
        </Form>
        </div>
        </>
    );
}

export default Login;
