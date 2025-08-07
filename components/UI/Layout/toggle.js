import dynamic from 'next/dynamic';
const Form = dynamic(() => import('react-bootstrap').then(mod => mod.Form), { ssr: false });

const SwitchExample = () => {
  return (
    <Form>
      <Form.Check
        type="switch"
        id="custom-switch"
        label="Dark Mode"
      />
    </Form>
  );
}

export default SwitchExample;