import React from "react";
import classes from "./Carousel3D.module.css";

const Carousel3D = ({items}) => {
    const carouselItems = items.filter((item, index) => index < 5);

    return (
        <div className={`${classes['carousel-body']}`}>
            {/* inputs */}
            <input type="radio" name="carousel" id="item-1" defaultChecked />
            <input type="radio" name="carousel" id="item-2" />
            <input type="radio" name="carousel" id="item-3" />
            <input type="radio" name="carousel" id="item-4" />
            <input type="radio" name="carousel" id="item-5" />
            <main id="caraousel3D" className={classes.carousel3D} >
                {carouselItems.map((items, index) => (
                    <div className={`${classes['carousel-item']} ${classes['item carousel-item-' + index]}`} key={index}>
                        <img src ={items.image} alt={items.title} className="carousel-image" />
                        <h3 className={`${classes['carousel-title']}`}>{items.title}</h3>
                        <p className={`${classes['carousel-description']}`}>{items.description}</p>
                        <p className={`${classes['carousel-testimonial']}`}>{items.testimonial}</p>
                    </div>
                ))}
            </main>
        </div>
    )
}

export default Carousel3D;