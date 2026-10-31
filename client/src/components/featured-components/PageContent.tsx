import React from "react";
import { Routes, Route } from "react-router";

import HomePage from "../pages-components/HomePage";
import SearchPage from "../pages-components/SearchPage";
import PlayListPage from "../pages-components/PlayListPage";
import AlbumPage from "../pages-components/AlbumPage";
import UserPage from "../pages-components/UserPage";
import ArtistPage from "../pages-components/ArtistPage";
import CollectionPage from "../pages-components/CollectionPage";
import LikePage from "../pages-components/LikePage";
import SocialPage from "../pages-components/SocialPage";

import AnnotationsPage from '../pages-components/AnnotationsPage'
import CommentPage from "../pages-components/CommentPage";
import type { Playlist } from "../../utilities/types";

export type PageContentProps = {
  playlists: Playlist[];
  refreshPlaylist: () => void;
  message: string;
  status: boolean;
};

export default function PageContent({
  playlists,
  refreshPlaylist,
  message,
  status,
}: PageContentProps) {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/playlist/:id" element={<PlayListPage refreshPlaylist={refreshPlaylist} />} />
        <Route path="/album/:id" element={<AlbumPage />} />
        <Route path="/user/:id" element={<UserPage />} />
        <Route path="/artist/:id" element={<ArtistPage />} />
        <Route path="/social" element={<div className="social-page-content"><SocialPage /></div>} />
        <Route path="/collection/*" element={<CollectionPage playlists={playlists} />} />
        <Route path="/tracks" element={<LikePage />} />
        <Route path="/annotations" element={<AnnotationsPage />} />
        <Route path="/comments/:id" element={<CommentPage />} />
      </Routes>
      <div className={`status-bar-wrapper ${status ? "active" : ""}`}>
        <div className={`status-bar ${status ? "active" : ""}`}>{message}</div>
      </div>
    </>
  );
}
