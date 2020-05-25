import React from 'react'

const BlogThumbnail = (props) => {
    return (
        <div>
            {props.children}
            <div className="blog-info">
                <p className="title"><b>{props.title}</b></p>
                <p className="description">{props.description}</p>
            </div>
        </div>
    )
}

export default BlogThumbnail
