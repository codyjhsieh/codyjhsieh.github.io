import React from 'react'
import Img from "gatsby-image"

import BlogThumbnail from "../components/blogThumbnail"
import Layout from "../components/layout"
import PhotoList from "../components/photoList"

import {BlogPostContainer} from "../styles/blogStyles"

const BlogPage = ({data}) => (
    <Layout>
        <PhotoList>
            <BlogPostContainer>
                <BlogThumbnail title="Hello" description="World world world world world world">
                    <Img fluid={data.img1.childImageSharp.fluid}/>
                </BlogThumbnail>
            </BlogPostContainer>
            <BlogPostContainer>
                <BlogThumbnail title="Hello" description="World world world world world world">
                    <Img fluid={data.img1.childImageSharp.fluid}/>
                </BlogThumbnail>
            </BlogPostContainer>
            <BlogPostContainer>
                <BlogThumbnail title="Hello" description="World world world world world world">
                    <Img fluid={data.img1.childImageSharp.fluid}/>
                </BlogThumbnail>
            </BlogPostContainer>
            <BlogPostContainer>
                <BlogThumbnail title="Hello" description="World world world world world world">
                    <Img fluid={data.img1.childImageSharp.fluid}/>
                </BlogThumbnail>
            </BlogPostContainer>
            <BlogPostContainer>
                <BlogThumbnail title="Hello" description="World world world world world world">
                    <Img fluid={data.img1.childImageSharp.fluid}/>
                </BlogThumbnail>
            </BlogPostContainer>
        </PhotoList>
    </Layout>
)

export const query = graphql`
  query {
    img1: file(relativePath: { eq: "projects/test.jpg" }) {
      childImageSharp {
        fluid (quality:100) {
          ...GatsbyImageSharpFluid_withWebp_noBase64
        }
      }
    }
  }
`

export default BlogPage