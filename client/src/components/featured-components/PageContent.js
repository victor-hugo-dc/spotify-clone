import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";

import HomePage from "../pages-components/HomePage";
import SearchPage from "../pages-components/SearchPage";
import GenrePage from "../pages-components/GenrePage";
import PlayListPage from "../pages-components/PlayListPage";
import AlbumPage from "../pages-components/AlbumPage";
import UserPage from "../pages-components/UserPage";
import ArtistPage from "../pages-components/ArtistPage";
import CollectionPage from "../pages-components/CollectionPage";
import LikePage from "../pages-components/LikePage";
import SocialPage from "../pages-components/SocialPage";

import AnnotationsPage from '../pages-components/AnnotationsPage'
import CommentPage from "../pages-components/CommentPage";

export default function PageContent({
  query,
  playlists,
  refreshPlaylist,
  message,
  status,
}) {
  return (
    <>
      <Switch>
        <Route exact path="/">
          <HomePage />
        </Route>
        <Route path={`/search`}>
          <SearchPage query={query} />
        </Route>
        <Route path="/genre">
          <GenrePage />
        </Route>
        <Route path="/playlist">
          <PlayListPage
            playlists={playlists}
            refreshPlaylist={refreshPlaylist}
          />
        </Route>
        <Route path="/album">
          <AlbumPage />
        </Route>
        <Route path="/user">
          <UserPage />
        </Route>
        <Route path="/artist">
          <ArtistPage />
        </Route>
        <Route path="/social">
          <div className="social-page-content">
            <SocialPage />
          </div>
        </Route>
        <Route path="/collection">
          <Redirect to="/collection/playlist" />
          <CollectionPage playlists={playlists} />
        </Route>
        <Route path="/tracks">
          <LikePage />
        </Route>
        <Route path='/annotations'>
                <AnnotationsPage />
            </Route>
            <Route path='/comments'>
              <CommentPage/>
            </Route>
      </Switch>
      <div className={`status-bar-wrapper ${status ? "active" : ""}`}>
        <div className={`status-bar ${status ? "active" : ""}`}>{message}</div>
      </div>
    </>
  );
}
