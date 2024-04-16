import React from "react";
import { Button, Container, Table } from 'react-bootstrap';
import SwitchExample from "../UI/Layout/toggle";
// import { useDispatch, useSelector } from 'react-redux';
// import { dashboardActions } from "@/store/dashboardReducer";

const Profile = () =>{
  // const dispatch = useDispatch();

  const toggleThemeHandler = () =>{
    // dispatch(dashboardActions.toggleTheme());
    console.log('tt');
  }
  return (
    <>
    <Container className="table-responsive">
        <SwitchExample/>
        <Button  onClick={toggleThemeHandler}>Togg</Button>
    </Container>
    </>
  );
}

export default Profile;