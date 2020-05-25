import React from 'react'
import Img from "gatsby-image"
import { graphql } from "gatsby"

import Layout from "../components/layout"
import PhotoList from "../components/photoList"

import { 
  PortraitContainer,
  ProjectContainer
} from "../styles/photoListStyles"

const ProjectsPage = ({data}) => (
    <Layout>
        <PhotoList>
            <PortraitContainer>
                <ProjectContainer>
                <Img 
                    fluid={data.img1.childImageSharp.fluid}
                />
                </ProjectContainer>
            </PortraitContainer>
            <PortraitContainer>
                <ProjectContainer>
                    <Img 
                        fluid={data.img2.childImageSharp.fluid}
                    />
                </ProjectContainer>
            </PortraitContainer>
            <PortraitContainer>
                <ProjectContainer>
                <Img 
                    fluid={data.img3.childImageSharp.fluid}
                />
                </ProjectContainer>
            </PortraitContainer>
            <PortraitContainer>
                <ProjectContainer>
                    <Img 
                        fluid={data.img4.childImageSharp.fluid}
                    />
                </ProjectContainer>
            </PortraitContainer>
        </PhotoList>
    </Layout>
)

export const query = graphql`
  query {
    img1: file(relativePath: { eq: "projects/1.jpg" }) {
      childImageSharp {
        fluid (quality:100) {
          ...GatsbyImageSharpFluid_withWebp_noBase64
        }
      }
    }
    img2: file(relativePath: { eq: "projects/2.jpg" }) {
      childImageSharp {
        fluid (quality:100) {
          ...GatsbyImageSharpFluid_withWebp_noBase64
        }
      }
    }
    img3: file(relativePath: { eq: "projects/3.jpg" }) {
      childImageSharp {
        fluid (quality:100) {
          ...GatsbyImageSharpFluid_withWebp_noBase64
        }
      }
    }
    img4: file(relativePath: { eq: "projects/4.jpg" }) {
      childImageSharp {
        fluid (quality:100) {
          ...GatsbyImageSharpFluid_withWebp_noBase64
        }
      }
    }
  }
`
export default ProjectsPage