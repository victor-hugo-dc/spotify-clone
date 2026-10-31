import React, { type ReactNode } from 'react';

//The main sticky left-hand side bar in the app
function Sidebar({children}: {children: ReactNode}) {
    return (
        <div className="sidebar">
            {children}
        </div>
    );
}

export default Sidebar;
