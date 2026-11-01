import { useLocation, useNavigate } from 'react-router'

// The Comment buttons: to the song's comment page, with focus in its composer (CommentPage reads `compose`). From that
// page itself it replaces the entry, as a link to the same page does, so Back still leaves it.
export default function useWriteComment() {
    const navigate = useNavigate()
    const { pathname } = useLocation()
    return (id: string) => {
        const to = `/comments/${id}`
        navigate(to, { state: { compose: true }, replace: pathname === to })
    }
}
