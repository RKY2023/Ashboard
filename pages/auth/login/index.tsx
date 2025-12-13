import Header from "@/components/UI/Header/Header";
import { Button } from "@/components/ui/button";
import { useEffect, useCallback, useState, useRef } from "react";

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
        <div className="container mx-auto px-4 py-8 max-w-md">
            {error && <div className="text-red-600 mb-4">{error}</div>}
            <form onSubmit={submitHandler} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                        type="email"
                        placeholder="Enter Email"
                        ref={inputEmailRef}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Password</label>
                    <input
                        type="password"
                        placeholder="Password"
                        ref={inputPasswordRef}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <Button type="submit" className="w-full mt-4">
                    Login
                </Button>
            </form>
        </div>
        </>
    );
}

export default Login;
