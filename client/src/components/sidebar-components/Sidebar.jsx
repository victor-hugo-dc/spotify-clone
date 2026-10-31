import React from 'react';

//The main sticky left-hand side bar in the app
function Sidebar({children}) {
    return (
        <div className="sidebar">
            {children}
        </div>
    );
}

export default Sidebar;
