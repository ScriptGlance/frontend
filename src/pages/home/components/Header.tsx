import React from 'react';
import styles from './Header.module.css';
import micLogo from '../../../assets/logo.png';

const Header: React.FC = () => {
    return (
        <header className={styles.header}>
            <div className={styles.logoContainer}>
                <div className={styles.logoWrapper}>
                    <img src={micLogo} alt="Logo" className={styles.logo} />
                </div>
            </div>
            <div className={styles.authButtons}>
                <button className={styles.loginButton}>Увійти</button>
                <button className={styles.registerButton}>Зареєструватися</button>
            </div>
        </header>
    );
};

export default Header;