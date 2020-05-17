import React from 'react'

import {PhotoScroll} from '../styles/photoListStyles'


const PhotoList = ({ children }) => {
    return (
        <PhotoScroll>
            {children}
        </PhotoScroll>
    )
}

export default PhotoList
