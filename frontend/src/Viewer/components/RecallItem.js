import numeral from "numeral";
import React from 'react'

export default function RecallItem({recall, short}) {
    let className = ['RecallItem', short === true ? ' -short': ''].join(' ')
    return (
        <div className={className}>
            {
                short !== true &&
                <div className={'image'}>

                </div>
            }
            <div className={'description'}>
                <h3>{recall.productName}</h3>
                <p>{recall.dateString}{recall.sold
                    ? (<span
                        className='left-bullet'>sold ~ {numeral(recall.sold).format('0,0')}</span>)
                    : null
                }</p>
                <p>
                    Injuries: {recall.hazards.join(', ').toLowerCase()}
                </p>
            </div>
        </div>
    )
}