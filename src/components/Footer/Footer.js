import React from 'react'
import Styles from './Footer.module.css'

const Footer = () => {
  return (
    <footer className={Styles.root}>
        <p className={Styles.text}>Copyright &copy; StakeNow {new Date().getFullYear()}</p>
    </footer>
  )
}

export default Footer