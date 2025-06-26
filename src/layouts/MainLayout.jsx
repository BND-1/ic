import React from 'react';
import { Outlet } from 'react-router-dom';
import styles from './MainLayout.module.scss';

const MainLayout = () => {
  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout; 