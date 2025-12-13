"use client";

import React, { useState, useEffect } from 'react';
import Carousel3D from '../../components/UI/Carousel/Carousel3D';

const Products = () => {
  const [images, setImages] = useState([]);

  const fetchImages = async () => {
    const res = await fetch("https://dummyjson.com/products");
    const data = await res.json();

    if (data.products) {
      let imgArr = [];
      data.products.forEach((prod) => {
        imgArr.push(prod.thumbnail);
      });
      setImages(imgArr);
      // console.log('ss', imgArr);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <div>
      <Carousel3D
        items = {images.map((image, index) => {
          return {
            image: image,
            title: `Product ${index + 1}`,
            description: `Description for Product ${index + 1}`,
            testimonial: `Testimonial for Product ${index + 1}`,
          };
        })}
      /> 
    </div>
  );
};

export default Products;