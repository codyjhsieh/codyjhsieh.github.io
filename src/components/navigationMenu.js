import React from 'react'

import {
    NavigationMenuContainer, 
    NavBox, 
    NavHeader,
    NavList,
} from '../styles/navMenuStyles'
import {Link} from 'gatsby'

const NavigationMenu = () => {
    return (
        <NavigationMenuContainer>
            <div className="headBox">
                <NavBox>
                    <NavHeader>
                        <h1>
                            <Link to="/" className="logo">cody hsieh</Link>
                        </h1>
                        <p>coder, photographer, musician</p>
                    </NavHeader>
                    <nav>
                        <NavList>
                            <li>
                                <Link to="/">photos</Link>
                            </li>
                            <li>
                                <Link to="/projects/">projects</Link>
                            </li>
                            <li>
                                <Link to="/blog/">blog</Link>
                            </li>
                            <li>
                                <Link to="/contact/">contact</Link>
                            </li>
                        </NavList>
                    </nav>
                </NavBox>
            </div>
        </NavigationMenuContainer>
    )
}

export default NavigationMenu
