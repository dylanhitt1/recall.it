import {NavLink} from "react-router-dom";
import React from 'react'

export const BetterNavLink = (props) => {
    return <NavLink {...props}
                    isActive={(match, location) => {
                        return location.pathname + location.search === props.to
                    }}
    />
}