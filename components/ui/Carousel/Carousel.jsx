import { useState } from "react";

const Carousel = ({ items }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = () => {
        setCurrentIndex((prevIndex) => {
            return prevIndex === 0 ? items.length - 1 : prevIndex - 1;
        });
    };

    const goToNext = () => {
        setCurrentIndex((prevIndex) => {
            return prevIndex === items.length - 1 ? 0 : prevIndex + 1;
        });
    };

    return (
        <div className="carousel">
            <button className="carousel-button prev" onClick={goToPrevious}>
                &#10094;
            </button>
            <div className="carousel-content">
                {items.map((item, index) => (
                    <div
                        key={index}
                        className={`carousel-item ${
                            index === currentIndex ? "active" : ""
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
    );
};

export default Carousel;