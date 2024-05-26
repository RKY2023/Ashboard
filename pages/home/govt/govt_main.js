import { React, useCallback, useState, useEffect } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import GovtDirectory from "./GovtDirectory";

const Govt_main = (props) => {
   
    return (
        <>
        <Container className="text-center">
            <Row>
                <h1> Welcome to Govt page</h1>
            </Row>            
        </Container>
        <div className="m-3 table-responsive-lg">
            <Row>
                <GovtDirectory />
            </Row>
        </div>
        </>
    );
};
export default Govt_main;