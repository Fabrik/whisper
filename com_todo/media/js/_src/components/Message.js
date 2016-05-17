import React, { PropTypes } from 'react'

const Message = ({ onClick, read, text }) => (
    <li
        onClick={onClick}
        style={{
      textDecoration: read ? 'line-through' : 'none'
    }}
    >
        {text}
    </li>
)

Message.propTypes = {
    onClick: PropTypes.func.isRequired,
    read: PropTypes.bool.isRequired,
    text: PropTypes.string.isRequired
}

export default Message