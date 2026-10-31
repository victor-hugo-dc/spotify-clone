import React, { type MouseEvent } from 'react';

type Props = {name: string, disable?: boolean, active?: boolean, id?: string | null, onClick?: (e: MouseEvent<HTMLButtonElement>) => void}

const ConnectDevicesItem = ({name, disable, active, id, onClick}: Props) => {
    return (
        <ul className='connect-devices-list'>
            <button className={`connect-devices-items ${disable? 'disable':''} ${active? 'active':''} ellipsis-one-line no-outline`} data-id={id} onClick={active? undefined:onClick}>
                <div className='cd-info'>
                    <h1>{name}</h1>
                </div>
            </button>
        </ul>
    );
}

export default ConnectDevicesItem;
