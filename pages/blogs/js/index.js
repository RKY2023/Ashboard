import React from 'react';
import HtmlEntities from './htmlEntities';

const AboutJS = (props) => {
    return (
        <>
        <ul>
            
            <li>Step 1:
                <dl>
                    <dt>understand variables & functions</dt>
                    <dd>let const var</dd>
                    <dd>function , var function, fat arrow</dd>
                </dl>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>const</th>
                            <th>let</th>
                            <th>var</th>
                            <th>error</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>redeclare same variable</td>
                            <td>very strict</td>
                            <td>strict</td>
                            <td>lenient</td>
                            <td>syntax error</td>
                        </tr>
                    </tbody>
                    
                </table>

            </li>
            <li>Step 2:
                <dl>
                    <dt>hoisting</dt>
                    <dd>declaration of function, variable & class</dd>
                    <dt>temporal dead zone = error = reference error</dt>
                    <dd>time b/w hoisting of a variable till it is assigned.</dd>
                    <dt>Lexical scope - shadow variable in block scope</dt>
                    <dd></dd>
                                           GLobal execution context (EC)
                    <br/>

// Lexical exvironment(LE) is local memory along with it LE parent
<br/>
// Stack calls - Scope chain (Linked llst of a box of [variable & function])
<br/>// Error 3 types:
                </dl>

            </li>
            <li>
            Uses of Closures:
            <ul>
            <li>Module Design Pattern</li>
            <li>Currying </li>
            <li>Functions like once</li>
            <li>Memorize</li>
            <li>Maintaining state in async world</li>
            <li>setTimeouts</li>
            <li>Iterators</li>
            <li>and many more....</li>
            </ul>
        </li>
        <li>
        /* ======== Call apply and bind [Start] ======== */
            <ul>
            
// fun.call(obj)
// fun.call(obj, functionarguments)
// fun.apply(obj, array) // here array of arguments 
// fun.bind(obj) // upgrade of call i.e. it automatically binds parameter with function
// Bind returns a function with object attached to it
// Call and apply invokes the function with the object and arguments

            </ul>
        </li>
        </ul>
        <HtmlEntities/>
        </>
    );
};
export default AboutJS;