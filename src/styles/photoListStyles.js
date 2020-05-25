
import styled from 'styled-components'

export const PhotoScroll = styled.div` 
    display: flex;
    flex-wrap: nowrap;
    /* width: max-content; */
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
    height: 80vh;
    min-width: calc(80vh*(2/3)); 
    margin: 2vw;
    position: relative;
    left: 20vw;

    -webkit-transition: all 1s cubic-bezier(0.165, 0.84, 0.44, 1);
    transition: all 1s cubic-bezier(0.165, 0.84, 0.44, 1);
`
export const LandscapeContainer = styled.div` 
    height: calc(50vw*(2/3));
    min-width: 50vw; 
    margin: 2vw;
    position: relative;
    left: 20vw;

    -webkit-transition: all 1s cubic-bezier(0.165, 0.84, 0.44, 1);
    transition: all 1s cubic-bezier(0.165, 0.84, 0.44, 1);
`

export const ProjectContainer = styled.div`
    img{
        border-radius: 5px;
    }
    /* box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); */
    box-shadow: 0 20px 70px rgba(0, 0, 0, 0.2);
    -webkit-transform: scale(1.02, 1.02);
    transform: scale(1.02, 1.02);
    -webkit-transition: all 1s cubic-bezier(0.165, 0.84, 0.44, 1);
    transition: all 1s cubic-bezier(0.165, 0.84, 0.44, 1);

`

export const CascadingElement = styled.div.attrs`
    transform: ${props => props.isVisible
    ? 'translateX(0%)'
    : 'translateX(100%)'};
    transition-duration: 0.5s;
    transition-timing-function: ease-in-out;
    transition-property: transform;
    transition-delay: 100 * ${props => props.index}
`;