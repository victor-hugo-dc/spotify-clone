import React, { type ReactNode } from 'react';

export default function Footer({children}: {children: ReactNode}) {
    return (
        <div className="footer">
            {children}
        </div>
    );
}
