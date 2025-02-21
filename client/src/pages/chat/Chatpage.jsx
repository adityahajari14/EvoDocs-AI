import React, { useState } from 'react'
import './chatpage.css'
import Sidebar from '../../components/chat/Sidebar'
import Chat from '../../components/chat/Chat'

function Chatpage() {
  return (
    <div className="app">
      <Sidebar />
      <Chat />
    </div>
  )
}

export default Chatpage
