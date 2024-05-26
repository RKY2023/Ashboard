import React from "react";
import { Container, Table } from "react-bootstrap";
import Image from 'next/image';

const INITIAL_hairstyles = [
  {
    id: '0',
    name: 'Short Crew Cut',
    desc: 'A timeless and practical option that keeps hair short all around. It\'s easy to maintain, provides good airflow, and keeps you cool during hot days.',
    img: [
      {
        0: '/images/haircuts/Short Crew Cut1.jpg',
      },
      {
        1: '/images/haircuts/Short Crew Cut2.webp',
      },
      {
        2: '/images/haircuts/Short Crew Cut3.jpg',
      },
      {
        3: '/images/haircuts/Short Crew Cut4.jpg',
      },
      {
        4: '/images/haircuts/Short Crew Cut5.jpg',
      }
    ]
  },
  {
    id: '1',
    name: 'Textured Crop',
    desc: 'A stylish and versatile option where the hair is cut short on the sides and back with a bit more length on top. This allows for easy styling and can be tousled for a textured, relaxed look',
    img: [
      {
        0: '/images/haircuts/Textured Crop1.webp',
      },
      {
        1: '/images/haircuts/Textured Crop2.jpg',
      },
      {
        2: '/images/haircuts/Textured Crop3.webp',
      },
      {
        3: '/images/haircuts/Textured Crop4.webp',
      },
      {
        4: '/images/haircuts/Textured Crop5.jpg',
      }
    ]
  },
  {
    id: '2',
    name: 'Buzz Cut',
    desc: 'A very short haircut that requires minimal maintenance and provides excellent ventilation. It\'s perfect for those who prefer a no-fuss style and want to stay cool in the summer heat',
    img: [
      {
        0: '/images/haircuts/Buzz Cut1.jpg',
      },
      {
        1: '/images/haircuts/Buzz Cut2.jpg',
      },
      {
        2: '/images/haircuts/Buzz Cut3.webp',
      },
      {
        3: '/images/haircuts/Buzz Cut4.jpg',
      },
      {
        4: '/images/haircuts/Buzz Cut5.jpg',
      }
    ]
  },
  {
    id: '3',
    name: 'Fade Haircut',
    desc: 'This style features short sides that gradually blend into longer hair on top. It offers a clean and modern look while still keeping the hair relatively short and manageable',
    img: [
      {
        0: '/images/haircuts/Fade Haircut1.jpg',
      },
      {
        1: '/images/haircuts/Fade Haircut2.jpg',
      },
      {
        2: '/images/haircuts/Fade Haircut3.webp',
      },
      {
        3: '/images/haircuts/Fade Haircut4.jpg',
      },
      {
        4: '/images/haircuts/Fade Haircut5.webp',
      }
    ]
  },
  {
    id: '4',
    name: 'Slicked Back Undercut',
    desc: 'A stylish option where the sides and back are shaved short or faded, while the hair on top is left longer and slicked back with pomade or gel. it\'s a sleek look that\'s suitable for both casual and formal occasions',
    img: [
      {
        0: '/images/haircuts/Slicked Back Undercut1.jpg',
      },
      {
        1: '/images/haircuts/Slicked Back Undercut2.webp',
      },
      {
        2: '/images/haircuts/Slicked Back Undercut3.jpg',
      },
      {
        3: '/images/haircuts/Slicked Back Undercut4.jpg',
      },
      {
        4: '/images/haircuts/Slicked Back Undercut5.jpg',
      }
    ]
  },
  {
    id: '5',
    name: 'Messy Textured Hairstyle',
    desc: 'For those who like a more relaxed and casual look, a messy textured hairstyle can be a great choice. This style typically involves leaving the hair longer on top and using a texturizing product to create a tousled, effortless look',
    img: [
      {
        0: '/images/haircuts/Messy Textured Hairstyle1.jpg',
      },
      {
        1: '/images/haircuts/Messy Textured Hairstyle2.jpg',
      },
      {
        2: '/images/haircuts/Messy Textured Hairstyle3.webp',
      },
      {
        3: '/images/haircuts/Messy Textured Hairstyle4.jpg',
      },
      {
        4: '/images/haircuts/Messy Textured Hairstyle5.webp',
      }
    ]
  },
  {
    id: '5',
    name: 'Classic Pompadour',
    desc: 'While it may require a bit more styling effort, a classic pompadour can be a stylish choice for summer. The sides are kept short while the hair on top is styled upward and back for a retro-inspired look',
    img: [
      {
        0: '/images/haircuts/Classic Pompadour1.jpg',
      },
      {
        1: '/images/haircuts/Classic Pompadour2.jpg',
      },
      {
        2: '/images/haircuts/Classic Pompadour3.jpg',
      },
      {
        3: '/images/haircuts/Classic Pompadour4.webp',
      },
      {
        4: '/images/haircuts/Classic Pompadour5.jpg',
      }
    ]
  },
  {
    id: '7',
    name: 'Short Quiff',
    desc: 'Similar to the pompadour but with less volume, the short quiff features shorter sides and a longer, styled top. it\'s a versatile option that can be dressed up or down depending on the occasion',
    img: [
      {
        0: '/images/haircuts/Short Quiff1.jpg',
      },
      {
        1: '/images/haircuts/Short Quiff2.jpg',
      },
      {
        2: '/images/haircuts/Short Quiff3.jpg',
      },
      {
        3: '/images/haircuts/Short Quiff4.png',
      },
      {
        4: '/images/haircuts/Short Quiff5.jpeg',
      }
    ]
  }
]

// const butterflyRequireContext = require.context('../images/haircuts', true, /\.png$/);

export default function () {

  const imgMap = (img) => {
    let imgDiv = img.map((act,i) => (
      <>
      <Image src={act[i]} width="150" height="150" />
      </>
        
    ));
    return imgDiv;
  };

  const tableContent = INITIAL_hairstyles.map((el) => (
    <tr key={el.id}>
      <td>{el.name}</td>
      
      {/* <td>{el.img}</td> */}
      <td>{el.desc}</td>
      <td>
      {imgMap(el.img)}
      </td>
      
    </tr>
  ));
  return (
    <>
    {/* <Container> */}
      <Table>
          <thead>
              <tr>
                  <th>Name</th>
                  <th width="20%">Desc</th>
              </tr>
          </thead>
          <tbody>
              {tableContent}
          </tbody>
      </Table>
    {/* </Container> */}
    </>
  ); 
}