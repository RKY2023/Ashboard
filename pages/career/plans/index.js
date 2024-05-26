import {Accordion, AccordionItem, Avatar} from "@nextui-org/react";
const INITIAL_DATA=[
  {
    id: 1,
    title: 'ReactJS',
    info: '<strong>Learn</strong> Tailwind CSS, POST CSS, yarn, pnpm ,<code>system design</code>, ',
  },
  {
    id: 2,
    title: 'Data Science',
    info: '<strong>Probability</strong> It is hidden by default, until the collapse plugin adds the appropriate classes that we use to style each element. These classes control the overall appearance, as well as the showing and hiding via CSS transitions. You can modify any of this with custom CSS or overriding our default variables. It\'s also worth noting that just about any HTML can go within the <code>.accordion-body</code>, though the transition does limit overflow.',
  },
  {
    id: 3,
    title: 'AI',
    info: '<strong>This is the third item\'s accordion body.</strong> It is hidden by default, until the collapse plugin adds the appropriate classes that we use to style each element. These classes control the overall appearance, as well as the showing and hiding via CSS transitions. You can modify any of this with custom CSS or overriding our default variables. It\'s also worth noting that just about any HTML can go within the <code>.accordion-body</code>, though the transition does limit overflow.',
  }
]

export default function (props) {
  const accordionContent = INITIAL_DATA.map( (item) => {
    return (
    <AccordionItem
      key={item.id}
      aria-label={item.title}
      startContent={
        <Avatar
          isBordered
          color="primary"
          radius="lg"
          src="https://i.pravatar.cc/150?u=a042581f4e29026024d"
        />
      }
      subtitle="4 unread messages"
      title={item.title}
    >
      {item.info}
    </AccordionItem>
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