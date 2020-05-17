import React from 'react'

import Layout from "../components/layout"
import {PhotoList} from "../components/photoList"

import Img from "gatsby-image"

import { graphql } from "gatsby"

const PhotoPage = ( {data} ) => (
    <Layout>
        <PhotoList>
            {/* <img className="listItem portrait hidden" src="/assets/images/photos/1.jpg" alt=""/> */}
            {/* <img className="listItem landscape hidden" src="/assets/images/photos/2.jpg" alt=""/>
            <img className="listItem portrait hidden" src="/assets/images/photos/3.jpg" alt=""/>
            <img className="listItem landscape hidden" src="/assets/images/photos/4.jpg" alt=""/>
            <img className="listItem portrait hidden" src="/assets/images/photos/5.jpg" alt=""/>
            <img className="listItem portrait hidden" src="/assets/images/photos/10.jpg" alt=""/>
            <img className="listItem landscape hidden" src="/assets/images/photos/6.jpg" alt=""/>
            <img className="listItem portrait hidden" src="/assets/images/photos/7.jpg" alt=""/>
            <img className="listItem portrait hidden" src="/assets/images/photos/8.jpg" alt=""/>
            <img className="listItem portrait hidden" src="/assets/images/photos/9.jpg" alt=""/> */}
        </PhotoList>
    </Layout>
)

export const query = graphql`
  query {
    file: file(relativePath: { eq: "gatsby-icon.png" }) {
      childImageSharp {
        fixed(width: 125, height: 125) {
          ...GatsbyImageSharpFixed
        }
      }
    }
  }
`
export default PhotoPage
