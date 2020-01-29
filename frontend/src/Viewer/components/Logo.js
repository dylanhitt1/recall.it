import React from 'react'

export default function Logo({onClick}) {
    return (
        <div id={'logo'}>
            <img alt='RecallIt Logo' src={'/logo.png'} onClick={onClick}/>
        </div>
    )
}