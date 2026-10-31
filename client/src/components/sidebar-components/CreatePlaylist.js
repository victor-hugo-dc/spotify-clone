import React, { useContext } from "react";
import Icon from "../icons";
import { MessageContext } from "../../utilities/context";

function CreatePlaylist() {
  const setMessage = useContext(MessageContext);

  return (
    <button
      className="create-button no-outline"
      onClick={() =>
        setMessage("Oops, it looks like I chose not to implement this feature :)")
      }
    >
      <div className="playlist-icon">
        <Icon name="Create" />
      </div>
      <span className="featured-label">Create Playlist</span>
    </button>
  );
}

export default CreatePlaylist;