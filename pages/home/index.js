// import React from "react";
import Link from 'next/link';
import HomeBody from './homebody';
function home () {
    return (
    <>
        <h1>The News page</h1>
        <ul>
            <li>
                <Link href='/news/news-next'>
                    NextJS News Link
                </Link>
            </li>
        </ul>
        {/* <Header /> */}
        <HomeBody />
    </>
    

    );

};
export default home;