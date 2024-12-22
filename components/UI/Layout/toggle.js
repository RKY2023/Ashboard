import { Form } from 'react-bootstrap';

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