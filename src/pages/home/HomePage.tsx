import React from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturesList from './components/FeaturesList';
import styles from './HomePage.module.css';

const HomePage: React.FC = () => {
    return (
        <div className={styles.container}>
            <Header />
            <main className={styles.mainContent}>
                <HeroSection />
                <FeaturesList />
            </main>
        </div>
    );
};

export default HomePage;