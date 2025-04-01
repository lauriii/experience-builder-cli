import React from 'react';
import './index.css';

/**
 * Hello World component for Experience Builder
 *
 * @param {Object} props - Component props
 * @param {string} props.greeting - Greeting message to display
 * @param {string} props.color - Text color in hex format
 * @param {Object} props.children - Slots for the component
 * @returns {React.ReactElement} The rendered component
 */
function HelloWorld(props) {
  const { greeting = 'Hello World', color = '#333333', children } = props;
  
  return (
    <div className="hello-world-component">
      <h2 className="greeting" style={{ color }}>
        {greeting}
      </h2>
      
      {children?.content && (
        <div className="content">
          {children.content}
        </div>
      )}
    </div>
  );
}

export default HelloWorld;