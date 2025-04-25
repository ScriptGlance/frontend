import React from 'react';
import styles from './FeaturesList.module.css';
import autoScrollIcon from '../../../assets/autoscroll-icon.png';
import languageIcon from '../../../assets/language-icon.png';
import teamPresentationIcon from '../../../assets/team-presentation-icon.png';

interface FeatureProps {
    iconSrc: string;
    iconAlt: string;
    title: string;
    description: string;
}

const Feature: React.FC<FeatureProps> = ({ iconSrc, iconAlt, title, description }) => {
    return (
        <div className={styles.feature}>
            <div className={styles.featureIcon}>
                <img src={iconSrc} alt={iconAlt} className={styles.icon} />
            </div>
            <h3 className={styles.featureTitle}>{title}</h3>
            <p className={styles.featureDescription}>{description}</p>
        </div>
    );
};

const FeaturesList: React.FC = () => {
    const features = [
        {
            iconSrc: autoScrollIcon,
            iconAlt: "Auto scroll icon",
            title: 'Автоматичне прокручування тексту',
            description: 'Телесуфлер адаптується до вашого темпу мовлення'
        },
        {
            iconSrc: languageIcon,
            iconAlt: "Ukrainian language support icon",
            title: 'Підтримка української мови',
            description: 'Точне голосове керування для української мови'
        },
        {
            iconSrc: teamPresentationIcon,
            iconAlt: "Team presentation icon",
            title: 'Спільні виступи',
            description: 'Редагуйте та запускайте виступи разом із командою'
        }
    ];

    return (
        <section className={styles.featuresContainer}>
            {features.map((feature, index) => (
                <Feature
                    key={index}
                    iconSrc={feature.iconSrc}
                    iconAlt={feature.iconAlt}
                    title={feature.title}
                    description={feature.description}
                />
            ))}
        </section>
    );
};

export default FeaturesList;