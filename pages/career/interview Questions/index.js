import {Accordion, AccordionItem, Avatar} from "@nextui-org/react";
import { Table } from "react-bootstrap";
const INITIAL_DATA=[
  {
    id: 1,
    exam: 'BARC',
    regDate: [
      {
        start: '22/02/2024',
        end: '22/02/2024',
      }
    ],
    examDate: [
      {
        start: '22/02/2024',
        end: '22/02/2024',
      }
    ],
    info: '<strong>Learn</strong> Tailwind CSS, POST CSS, yarn, pnpm ,<code>system design</code>, ',
  },
  {
    id: 2,
    exam: 'NIELIT',
    regDate: [
      {
        start: '22/03/2024',
        end: '22/04/2024',
      }
    ],
    examDate: [
      {
        start: '22/02/2024',
        end: '22/02/2024',
      }
    ],
    info: '<strong>Probability</strong> It is hidden by default, until the collapse plugin adds the appropriate classes that we use to style each element. These classes control the overall appearance, as well as the showing and hiding via CSS transitions. You can modify any of this with custom CSS or overriding our default variables. It\'s also worth noting that just about any HTML can go within the <code>.accordion-body</code>, though the transition does limit overflow.',
  },
  {
    id: 3,
    exam: 'DRDO',
    regDate: [
      {
        start: '22/02/2024',
        end: '22/02/2024',
      }
    ],
    examDate: [
      {
        start: '22/02/2024',
        end: '22/02/2024',
      }
    ],
    info: '<strong>This is the third item\'s accordion body.</strong> It is hidden by default, until the collapse plugin adds the appropriate classes that we use to style each element. These classes control the overall appearance, as well as the showing and hiding via CSS transitions. You can modify any of this with custom CSS or overriding our default variables. It\'s also worth noting that just about any HTML can go within the <code>.accordion-body</code>, though the transition does limit overflow.',
  },
  {
    id: 4,
    exam: 'ISRO',
    regDate: [
      {
        start: '22/02/2024',
        end: '22/02/2024',
      }
    ],
    examDate: [
      {
        start: '22/02/2024',
        end: '22/02/2024',
      }
    ],
    info: '<strong>This is the third item\'s accordion body.</strong> It is hidden by default, until the collapse plugin adds the appropriate classes that we use to style each element. These classes control the overall appearance, as well as the showing and hiding via CSS transitions. You can modify any of this with custom CSS or overriding our default variables. It\'s also worth noting that just about any HTML can go within the <code>.accordion-body</code>, though the transition does limit overflow.',
  }
]

export default function (props) {
  const tableContent = INITIAL_DATA.map((item) => {
    return (
      <tr>
        <td>{item.exam}</td>
      </tr>
    )
  });
  const accordionContent = INITIAL_DATA.map( (item) => {
    return (
    <Table>
      <thead>
        <th>{item.title}</th>
      </thead>
      <tbody>
        {tableContent}
      </tbody>
    </Table>  
      
    
    )
  })

  return (
      <>
      <Accordion selectionMode="multiple">
      {accordionContent}
      </Accordion>
      </>
  );
};