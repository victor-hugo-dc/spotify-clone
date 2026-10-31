import React from "react";
import Icon from "../icons";

function CreatePlaylist({ onClick }: { onClick: () => void }) {
  return (
    <button className="create-button no-outline" onClick={onClick}>
      <div className="playlist-icon">
        <Icon name="Create" />
      </div>
      <span className="featured-label">Create Playlist</span>
    </button>
  );
}

export default CreatePlaylist;
