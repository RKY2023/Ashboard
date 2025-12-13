import Header from "@/components/UI/Header/Header";
import { Button } from "@/components/ui/button";
import { useEffect, useCallback, useState, useRef } from "react";


const CreateUser = () => {
    const [error, setError] = useState();
    const [backendData, setBackendData] = useState();
    const inputNameRef = useRef();
    const inputEmailRef = useRef();
    const inputPasswordRef = useRef();
    // const inputPhonenoRef = useRef();

    const submitHandler = (event) => {
        event.preventDefault();
        let userData;
        userData = {
            email: inputEmailRef.current.value,
            password: inputPasswordRef.current.value,
            name: inputNameRef.current.value,
            // phoneno: inputPhonenoRef.current.value
        }
        loginHandler(userData);
    }

    const loginHandler = useCallback( async (userData) => {
        let loginUrl, payload;
            loginUrl = '/api/createUser';
            payload = {
                email: userData.email,
                password: userData.password,
                name: userData.name,
                phoneno: userData.phoneno,
            };
        const response = await  fetch(loginUrl, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        setBackendData(data);
    },[]);

    useEffect( () => {
        // console.log('useEffect');
        // console.log(process.env.API_URL);
        // // datafetcher();
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
        // getMeetupHandler();
    };

    return (
        <>
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-md">
            {error && <div className="text-red-600 mb-4">{error}</div>}
            <form onSubmit={submitHandler} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                        type="text"
                        placeholder="Enter Name"
                        ref={inputNameRef}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

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
                    Sign Up
                </Button>
            </form>
        </div>
        </>
    );
}

export default CreateUser;
