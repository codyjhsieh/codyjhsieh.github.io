import styled from 'styled-components'

export const BlogPostContainer = styled.div`
    position: relative;
    left: 20vw;
    height: 90vh;
    min-width: calc(90vh*(2/3)); 
    background-color: #fff;
    margin: 5vh;
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: 5px;

    img {
        border-radius: 5px 5px 0px 0px;
    }

    .gatsby-image-wrapper {
        max-height: 80vh !important; 
    }

    .title {
        margin: 0px;
        font-size: 2vw;
    }

    .description {
        font-size: 1vw;
        margin: 0px;
    }

    .blog-info {
        padding: 3%;
    }
    
`