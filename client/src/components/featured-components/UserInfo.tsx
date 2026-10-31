import React, { useState, useContext, useEffect, useRef } from 'react';

import { MessageContext, UserContext } from '../../utilities/context';
import { Link, useLocation } from 'react-router';

const UserInfoOptions = ({ id, logout }: { id: string | null; logout: () => void }) => (
    <ul className="UserInfoOptions" role="menu" style={{ display: 'block' }}>
        <li role="none">
            <a
                role="menuitem"
                href="https://www.spotify.com/account/?utm_source=play&amp;utm_campaign=wwwredirect"
                target="_blank"
                rel="noopener noreferrer"
            >
                Account
            </a>
        </li>
        {id && (
            <li role="none">
                <Link role="menuitem" to={`/user/${id}`}>Profile</Link>
            </li>
        )}
        <li role="none">
            <button role="menuitem" onClick={logout}>Log out</button>
        </li>
    </ul>
);

// The account button and its menu. It shows even if your Spotify profile didn't load, so you can always log out.
const UserInfo = () => {
  const [open, setOpen] = useState(false);
  const user = useContext(UserContext);
  const setMessage = useContext(MessageContext);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // A click elsewhere, Escape, or going to another page closes the menu.
  useEffect(() => setOpen(false), [location]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const logout = () => {
    fetch('/api/logout', { method: 'POST' })
      .then((response) => {
        if (!response.ok) throw new Error(`the server answered ${response.status}`);
        window.location.reload();
      })
      .catch((error) => setMessage(`Couldn't log out: ${error.message}`));
  };

  const name = user?.display_name ?? 'Account';
  const imgSrc = user?.images?.[0]?.url;

  return (
    <div className="userInfo" ref={ref}>
      <button className="UserInfoButton no-outline" aria-label={`${name}: account menu`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <figure className="figureStyle">
          {imgSrc ?
            <img loading="eager" src={imgSrc} className="imgStyle" alt=""></img> :
            <span className="imgStyle avatar-initial" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
          }
        </figure>
        <span className="UserInfoSpan mediaNoneXL">{name}</span>
        <span className="arrowStyle mediaNoneXL" aria-hidden="true">
          {open ? <p>&#9650;</p> : <p>&#9660;</p>}
        </span>
      </button>
      {open && <UserInfoOptions id={user?.id ?? null} logout={logout} />}
    </div>
  );
};

export default UserInfo;
