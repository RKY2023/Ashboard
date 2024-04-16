import React from "react";
import { Container, Table } from "react-bootstrap";

const discipline = [
    {
        time: '03:45',
        action: [
            {
                0: 'Wake up',
            },
            {
                1: 'Meditate',
            }
        ]
    },
    {
        time: '06:00',
        action: [
            {
                0: 'Drink warm Water || Protein Shake',
            },
            {
                1: 'Museli + Milk',
            }
        ]
    },
    {
        time: '07:00',
        action: [
            {
                0: 'Drink warm Water',
            },
            {
                1: 'Exercise',
            }
        ]
    },
    {
        time: '08:00',
        action: [
            {
                0: 'Take Bath',
            },
            {
                1: '',
            }
        ]
    },
    {
        time: '08:30',
        action: [
            {
                0: 'Schedule Work ',
            },
            {
                1: '',
            }
        ]
    },
    {
        time: '09:00',
        action: [
            {
                0: 'Typing Practice | Mapping Work Objective',
            },
            {
                1: '',
            }
        ]
    },
    {
        time: '11:30',
        action: [
            {
                0: 'Eat Food || Lunch',
            },
            {
                1: 'Work Lunch',
            }
        ]
    },
    {
        time: '12:00',
        action: [
            {
                0: 'Sun Bath',
            },
            {
                1: 'Echos',
            }
        ]
    },
    {
        time: '18:00',
        action: [
            {
                0: 'Exercise || Yoga',
            },
            {
                1: 'Echos',
            }
        ]
    },
    {
        time: '19:00',
        action: [
            {
                0: 'Food',
            },
            {
                1: 'Bath',
            }
        ]
    },
    {
        time: '23:00',
        action: [
            {
                0: 'Bath',
            },
            {
                1: 'Meditate Today || Goals || Universe',
            }
        ]
    },
];

const Routine = (props) => {
    const actionMap = (action) => {
        let tt = action.map((act,i) => (
            <div>{act[i]}</div>
        ));
        return tt;
    };
    
    const tableContent = discipline.map((el) => (
        <tr>
            <td>{el.time}</td>
            {actionMap(el.action)}
        </tr>
    ));

   

    return (
        <>
        <Container>
            <Table>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>State/Action</th>
                    </tr>
                </thead>
                <tbody>
                    {tableContent}
                </tbody>
            </Table>
        </Container>
        </>
    );
};

export default Routine;