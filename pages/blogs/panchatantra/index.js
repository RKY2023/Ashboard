import { Table, Container } from "react-bootstrap";

const panchatantra_JSON = [
  {
    "id": 1,
    "Book_subtitle": "Mitra-bheda",
    "story": 30,
    "Translation": "Dissonance Among Friends",
    "Ryder_translation": "The Loss of Friends",
    "Olivelle_translation": "On Causing Dissension among Allies"
  },
  {
    "id": 2,
    "Book_subtitle": "Mitra-labha",
    "story": 11,
    "Translation": "Achievement of friend(s) (Advantages of friendship)",
    "Ryder_translation": "The Winning of Friends",
    "Olivelle_translation": "On Securing Allies"
  },
  {
    "id": 3,
    "Book_subtitle": "Kakolukiyam",
    "story": 18,
    "Translation": "The story of Crows and Owls",
    "Ryder_translation": "On Crows and Owls",
    "Olivelle_translation": "On War and Peace: The story of the crows and the owls"
  },
  {
    "id": 4,
    "Book_subtitle": "Labdhapranasam",
    "story": 13,
    "Translation": "Loss of what (desired) was attained.",
    "Ryder_translation": "Loss of Gains",
    "Olivelle_translation": "On Losing What You have Gained"
  },
  {
    "id": 5,
    "Book_subtitle": "Apariksitakarakam",
    "story": 12,
    "Translation": "To do without pre-examination",
    "Ryder_translation": "Ill-Considered Action",
    "Olivelle_translation": "On Hasty Actions"
  }
];

const Panchatantra = (props) => {
  const actionMap = (action) => {
    let tt = action.map((act,i) => (
        <div>{act[i]}</div>
    ));
    return tt;
};

const tableContent = panchatantra_JSON.map((el) => (
    <tr>
        <td>{el.id}</td>
        <td>{el["Book_subtitle"]}</td>
        <td>{el.story}</td>
        <td>{el.Translation}</td>
        <td>{el.Ryder_translation}</td>
        <td>{el.Olivelle_translation}</td>
    </tr>
));
  return (
    <>
    <Container>
      <Table>
        <thead>
          <tr>
            <th>Chapter No</th>
            <th>Chapter Name</th>
            <th>Stories</th>
            <th>Translation</th>
            <th>Ryder_translation</th>
            <th>Olivelle_translation</th>
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
export default Panchatantra;