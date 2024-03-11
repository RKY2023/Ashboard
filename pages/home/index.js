// import React from "react";
import Link from 'next/link';
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
    </>
    

    );

};
export default home;