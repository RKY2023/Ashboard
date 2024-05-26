import React from "react"
const Album = (props) => {
    return (
        <>
        <h1>Album</h1>
        <img src="/workplace.jpg" alt="Workplace" usemap="#workmap"/>

        <map name="workmap">
            <area shape="rect" coords="34,44,270,350" alt="Computer" href="album/computer"/>
            <area shape="rect" coords="290,172,333,250" alt="Phone" href="phone.htm"/>
            <area shape="circle" coords="337,300,44" alt="Coffee" href="coffee.htm"/>
        </map>
        </>
    );
};
export default Album