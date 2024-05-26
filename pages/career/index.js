import Link from "next/link";
import classes from './career.module.css';
export default function careerPage () {
    return (
        <>
        

        <Link href='/career/plans' className={classes['link']}>Plans</Link>
        
        

        <Link href='/career/sharpener' className={classes['link']}>sharpener</Link>
        
        <Link href='/career/calendar' className={classes['link']}>calendar for GATE EXAM</Link>
        
        </>
    );
};