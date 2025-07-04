import React from "react";
import { useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";


const Carousel = ({items}) => {
    const settings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
    }

    return (
        <div className="w-3/4 auto" key={key}>
            <Slider {...settings}>
                {items.map((item, index) => (
                    <div key={index} className="carousel-item">
                        <h1>{item.title}</h1>
                        <p>{item.description}</p>
                        <img src={item.image} alt={item.title} />
                    </div>
                ))}
            
            </Slider>
        </div>
    )
}

export default Carousel;