import React, { useState, useContext } from 'react';

import { UserContext } from '../../utilities/context';
import { Link } from 'react-router';

const UserInfoOptions = ({ id, logout }: { id: string; logout: () => void }) => (
    <ul className="UserInfoOptions" style={{ display: 'block' }}>
        <li>
            <a
                href="https://www.spotify.com/account/?utm_source=play&amp;utm_campaign=wwwredirect"
                target="_blank"
                rel="noopener noreferrer"
            >
                Account
            </a>
        </li>
        <li>
            <Link to={`/user/${id}`}>Profile</Link>
        </li>
        <li>
            <button onClick={logout}>Log out</button>
        </li>
    </ul>
);

const UserInfo = () => {
  const [open, setOpen] = useState(false);
  const user = useContext(UserContext);

  // Return null if user is not available
  if (!user) {
    return null;
  }

  const { images, display_name, id } = user;

  const toggleOpen = () => setOpen((prevOpen) => !prevOpen);

  const logout = () => {
    fetch('/api/logout')
      .then(() => {
        localStorage.removeItem('token');
        window.location.reload();
      })
      .catch((error) => console.log(error));
  };

  const imgSrc = images?.[0]?.url;

  return (
    <div className="userInfo">
      <button className="UserInfoButton no-outline" onClick={toggleOpen}>
        <figure className="figureStyle">
          <img loading="eager" src={imgSrc} className="imgStyle" alt=""></img>
        </figure>
        <span className="UserInfoSpan mediaNoneXL">{display_name}</span>
        <span className="arrowStyle mediaNoneXL">
          {open ? <p>&#9650;</p> : <p>&#9660;</p>}
        </span>
      </button>
      {open && <UserInfoOptions id={id} logout={logout} />}
    </div>
  );
};

export default UserInfo;
