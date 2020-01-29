import React from 'react'


export default function Body({children, show}) {
    if (false === show) return null
    return (
        <div className={'-body'}>
            <h2>Recall.It</h2>
            {children}
        </div>
    )

}