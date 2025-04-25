import React from 'react';
import styles from './HeroSection.module.css';
import androidIcon from '../../../assets/android-icon.png';
import heroImage from '../../../assets/hero-image.png';

const HeroSection: React.FC = () => {
    return (
        <section className={styles.heroSection}>
            <div className={styles.heroContent}>
                <h2 className={styles.heroTitle}>
                    Зручний телесуфлер з голосовим керуванням
                </h2>
                <p className={styles.heroDescription}>
                    Автопрокручування тексту за допомогою голосового керування.
                </p>
                <button className={styles.downloadButton}>
                    <div className={styles.androidIconWrapper}>
                        <img src={androidIcon} alt="Android icon" className={styles.androidIcon} />
                    </div>
                    <div className={styles.downloadText}>
                        <span className={styles.downloadLabel}>Завантажити</span>
                        <span className={styles.apkText}>APK</span>
                    </div>
                </button>
            </div>
            <div className={styles.heroImageContainer}>
                <img src={heroImage} alt="Teleprompter illustration" className={styles.heroImage} />
            </div>
        </section>
    );
};

export default HeroSection;