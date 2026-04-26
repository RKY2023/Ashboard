import React from 'react';
import styles from './particle.module.css';

interface ParticleProps {
  className?: string;
}

function Particle({ className }: ParticleProps) {
  return (
    <div className={`${styles.particleContainer} ${className ?? ''}`.trim()}>
      {Array.from({ length: 15 }, (_, i) => (
        <div key={i} className={styles.particle} />
      ))}
    </div>
  );
}

export default Particle;