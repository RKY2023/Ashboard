import Link from "next/link";
import { ListGroup } from "react-bootstrap";

const Blogs = () => {
  return (
    <>
    
    <ListGroup>
      <ListGroup.Item>
        <Link href='/blogs/receipe'>Receipe</Link>
      </ListGroup.Item>
      <ListGroup.Item>
        <Link href='/blogs/Routine'>Routine</Link>
      </ListGroup.Item>
      <ListGroup.Item>
        <Link href='/blogs/slideshow'>Slideshow</Link>
      </ListGroup.Item>
      <ListGroup.Item>
        <Link href='/blogs/album'>Album</Link>
      </ListGroup.Item>
      <ListGroup.Item>
        <Link href='/blogs/anime'>Anime</Link>
      </ListGroup.Item>
      <ListGroup.Item>
        <Link href='/blogs/colors'>Colors</Link>
      </ListGroup.Item>
      <ListGroup.Item>
        <Link href='/blogs/js'>Js</Link>
      </ListGroup.Item>
      <ListGroup.Item>
        <Link href='/blogs/manga'>Manga</Link>
      </ListGroup.Item>
      <ListGroup.Item>
        <Link href='/blogs/panchatantra'>Panchatantra</Link>
      </ListGroup.Item>
      
    </ListGroup>
    </>
  );
};

export default Blogs;