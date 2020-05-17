import styled from 'styled-components'

export const NavigationMenuContainer = styled.div` 
    * {
        box-sizing: border-box;
    }
    
    a {
        color: black;
        text-decoration: none;
        font-weight: 100;
    }
`

export const NavHeader = styled.div`
    .logo {
        font-size: 150%; // font-family: sans-serif;
        font-weight: 700;
    }
`

export const NavBox = styled.div`
    position: fixed;
    bottom: 18vh;
    left: 8vw;
    font-size: 15px;
    line-height: 21px;
    width: 20%;
    background: #fff;
    min-width: 300px;
    max-height: 400px;
    height: 55%;
    padding: 20px 0px 20px 35px;
    z-index: 1;
    font-family: 'Source Sans Pro', sans-serif;
    -webkit-transition: all 1s cubic-bezier(0.165, 0.84, 0.44, 1);
    transition: all 1s cubic-bezier(0.165, 0.84, 0.44, 1);
`

export const NavList = styled.ul`
    list-style-type: none;
    -webkit-padding-start: 0px;
    margin: 40px 0;
    font-family: sans-serif;
    li {
        margin: 30px 0;
        font-size: 130%;
        cursor: pointer;
        a {
            font-family: 'Poppins', sans-serif;
        }
    }
`