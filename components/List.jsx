import { React, useState } from 'react'
import data from "../data//ListData.json"

function List(props) {
    //create a new array by filtering the original array
    const filteredData = data.filter((el) => {
        //if no input the return the original
        if (props.input === '') {
            return el;
        }
        //return the item which contains the user input
        else {
            return el.prefix.toLowerCase().includes(props.input)
        }
    })
    return (
        <ul>
            {filteredData.map((item) => (
                <li key={item.id}>
                    <div className='w-full flex-row'>
                        <div className='title '>
                            <div className='title_icon'>
                                UIcon
                            </div>
                            <div className='title_name'>
                                Ironwood Treant {item.prefix}
                            </div>
                        </div>
                        <div className='content'>
                            <div>{item.meaning}</div>
                            <div>{item.language}</div>
                            <div>{item.words}</div>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    )
}

export default List