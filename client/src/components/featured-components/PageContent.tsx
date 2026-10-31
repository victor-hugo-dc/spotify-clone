import React from "react";
import { Routes, Route, Link, useLocation } from "react-router";
import PageErrorBoundary from "./PageErrorBoundary";
import PageTitle from "./PageTitle";

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

export type PageContentProps = {
  message: string;
  status: boolean;
};

export default function PageContent({ message, status }: PageContentProps) {
  const location = useLocation();
  return (
    <>
      <PageErrorBoundary resetKey={location.pathname}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/playlist/:id" element={<PlayListPage />} />
        <Route path="/album/:id" element={<AlbumPage />} />
        <Route path="/user/:id" element={<UserPage />} />
        <Route path="/artist/:id" element={<ArtistPage />} />
        <Route path="/social" element={<div className="social-page-content"><SocialPage /></div>} />
        <Route path="/collection/*" element={<CollectionPage />} />
        <Route path="/tracks" element={<LikePage />} />
        <Route path="/annotations" element={<AnnotationsPage />} />
        <Route path="/comments/:id" element={<CommentPage />} />
        <Route path="*" element={
          <div className="page-content" style={{ paddingTop: "16px" }}>
            <PageTitle name="Page not found" />
            <p className="empty-state">There's nothing at this address. <Link to="/">Go home</Link></p>
          </div>
        } />
      </Routes>
      </PageErrorBoundary>
      <div className={`status-bar-wrapper ${status ? "active" : ""}`}>
        <div className={`status-bar ${status ? "active" : ""}`} role="status">{message}</div>
      </div>
    </>
  );
}
