import React from 'react'
import Img from "gatsby-image"
import { graphql } from "gatsby"

import Layout from "../components/layout"
import PhotoList from "../components/photoList"

import { 
  PortraitContainer, 
  LandscapeContainer 
} from "../styles/photoListStyles"


const IndexPage = ({ data }) => (
    <Layout>
        <PhotoList>
            <PortraitContainer>
              <Img 
                fluid={data.img1.childImageSharp.fluid}
              />
            </PortraitContainer>
            <LandscapeContainer>
              <Img 
                fluid={data.img2.childImageSharp.fluid}
              />
            </LandscapeContainer>
            <PortraitContainer>
              <Img 
                fluid={data.img3.childImageSharp.fluid}
              />
            </PortraitContainer>
            <LandscapeContainer>
              <Img 
                fluid={data.img4.childImageSharp.fluid}
              />
            </LandscapeContainer>
            <PortraitContainer>
              <Img 
                fluid={data.img5.childImageSharp.fluid}
              />
            </PortraitContainer>
            <LandscapeContainer>
              <Img 
                fluid={data.img6.childImageSharp.fluid}
              />
            </LandscapeContainer>
            <PortraitContainer>
              <Img 
                fluid={data.img7.childImageSharp.fluid}
              />
            </PortraitContainer>
        </PhotoList>
    </Layout>
)

export const query = graphql`
  query {
    img1: file(relativePath: { eq: "photos/1.jpg" }) {
      childImageSharp {
        fluid (quality:100) {
          ...GatsbyImageSharpFluid_withWebp_noBase64
        }
      }
    }
    img2: file(relativePath: { eq: "photos/2.jpg" }) {
      childImageSharp {
        fluid (quality:100) {
          ...GatsbyImageSharpFluid_withWebp_noBase64
        }
      }
    }
    img3: file(relativePath: { eq: "photos/3.jpg" }) {
      childImageSharp {
        fluid (quality:100) {
          ...GatsbyImageSharpFluid_withWebp_noBase64
        }
      }
    }
    img4: file(relativePath: { eq: "photos/4.jpg" }) {
      childImageSharp {
        fluid (quality:100) {
          ...GatsbyImageSharpFluid_withWebp_noBase64
        }
      }
    }
    img5: file(relativePath: { eq: "photos/5.jpg" }) {
      childImageSharp {
        fluid (quality:100) {
          ...GatsbyImageSharpFluid_withWebp_noBase64
        }
      }
    }
    img6: file(relativePath: { eq: "photos/6.jpg" }) {
      childImageSharp {
        fluid (quality:100) {
          ...GatsbyImageSharpFluid_withWebp_noBase64
        }
      }
    }
    img7: file(relativePath: { eq: "photos/7.jpg" }) {
      childImageSharp {
        fluid (quality:100) {
          ...GatsbyImageSharpFluid_withWebp_noBase64
        }
      }
    }
  }
`
export default IndexPage
