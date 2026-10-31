// Spotify sends playlist descriptions as HTML (entities such as &amp; and <a> links to other playlists); show them as text.
// DOMParser never runs scripts or loads anything, so this is safe on untrusted input.
export const plainText = (html: string | null | undefined) =>
    html ? new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '' : ''
