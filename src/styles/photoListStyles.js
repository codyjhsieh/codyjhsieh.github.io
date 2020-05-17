
import styled from 'styled-components'

export const PhotoScroll = styled.div` 
    display: flex;
    overflow-x: auto;
    height: 100vh;
    align-items: center;

    &::-webkit-scrollbar {
        display: none;
    }

    img {
        /* position: relative; */
        box-shadow: 0 10px 25px 0 rgba(50,94,128,.2);
        /* height: 100%; */
        /* left: 25vw; */
    }

`

export const PortraitContainer = styled.div` 
    min-width: 30vw;
    margin: 2vw;
    position: relative;
    left: 20vw;

    -webkit-transition: all 1s cubic-bezier(0.165, 0.84, 0.44, 1);
    transition: all 1s cubic-bezier(0.165, 0.84, 0.44, 1);
`
export const LandscapeContainer = styled.div` 
    min-width: 50vw;
    margin: 2vw;
    position: relative;
    left: 20vw;

    -webkit-transition: all 1s cubic-bezier(0.165, 0.84, 0.44, 1);
    transition: all 1s cubic-bezier(0.165, 0.84, 0.44, 1);
`
