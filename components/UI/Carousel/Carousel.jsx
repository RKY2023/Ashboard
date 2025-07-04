import React from "react";
import { useState } from "react";
// import "./Carousel.css";

const Carousel = ({items}) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = () => {
        setCurrentIndex((prevIndex) => {
            prevIndex === 0 ?  items.length - 1 : prevIndex - 1;
        })
    }

    const goToNext = () => {
        setCurrentIndex((prevIndex) => {
            prevIndex === items.length - 1 ? 0 : prevIndex + 1;
        })
    }

    return (
        <div className="carousel" key={key}>
            <button className="carousel-button prev" onClick={goToPreviouse}>
                &#10094;
            </button>
            <div className="carousel-content">
                {items.map((item, index) => (
                    <div
                        key={index}
                        classNam={`carousel-item ${
                            index === currenIndex ? "active" : ""
                        }`}
                    >
                        <h1>{item.title}</h1>
                        <p>{item.description}</p>
                        <img src={item.image} alt={item.title} />
                    </div>
                ))}
            </div>
            <button className="carousel-button next" onClick={goToNext}>
                &#10095;
            </button>
        </div>
    )
}

export default Carousel;