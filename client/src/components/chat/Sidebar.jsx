import React from 'react'
import './sidebar.css'

const Sidebar = () => {
    return (
        <div className="sidebar">
            <div className="sidebar-top">
                <img src="/chat/logo.png" alt="" />
            </div>

            <div className="sidebar-profile">
                <img src="/chat/profile.png" alt="" />
            </div>
        </div>
    )
}

export default Sidebar
