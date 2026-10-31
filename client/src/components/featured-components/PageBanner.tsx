import React, { useContext, type CSSProperties, type ReactNode } from 'react'
import Icon from '../icons'
import { Link } from 'react-router'
import { UserContext } from '../../utilities/context'
import useCoverColor from '../../utilities/hooks/useCoverColor'
import type { Artist, Image, User } from '../../utilities/types'
import '../../styles/lists.css'

export type BannerInfo = {
    name: string,
    description?: string | null,
    user: (User | Artist)[],
    // The banner's colour; by default the cover's.
    primary_color?: string | null,
    images?: Image[] | null,
    release_date?: string,
    // What's in it, as the page words it: "31 songs, about 1 hr 43 min", "8 Playlists".
    stats?: string,
}

// The top of a list page, on its cover's colour, which carries on behind the action bar below: the cover (or `cover`,
// as Liked Songs draws its own), what the page is, the name, who made it, when, and what's in it. An artist with a
// picture gets it across the whole banner, with the name over it.
export default function PageBanner({pageTitle, bannerInfo, cover}: {pageTitle: string, bannerInfo: BannerInfo, cover?: ReactNode}) {
    const me = useContext(UserContext)
    const {name, description, user, primary_color, images, release_date, stats} = bannerInfo
    const imgUrl = images?.[0]?.url
    const sampled = useCoverColor(primary_color ? null : imgUrl)
    const round = pageTitle === 'profile' || pageTitle === 'artist'
    const header = pageTitle === 'artist' && imgUrl
    // The title's size follows its length (see .bannerTitle).
    const style = {'--banner-color': primary_color ?? sampled ?? '#535353', '--title-chars': Math.max(name.length, 1)} as CSSProperties

    return (
        <header className={`banner ${header ? 'artistBanner' : ''}`} style={style}>
            {header && <img className='artistBannerImg' src={imgUrl} alt=''/>}
            <div className='bannerContent'>
                {!header &&
                    <div className={`bannerImgDiv ${round ? 'circleDiv' : ''}`}>
                        {cover ?? (imgUrl ? <img src={imgUrl} className='bannerImg' alt=''/> :
                            round ? <span className='bannerInitial' aria-hidden='true'>{name.charAt(0)}</span> : <Icon name='Music2'/>)}
                    </div>
                }
                <div className='bannerInfo'>
                    <span className='pageTitle'>{pageTitle}</span>
                    <h1 className='bannerTitle'>{name}</h1>
                    {description && <p className='bannerDescription'>{description}</p>}
                    <div className='additionalInfo'>
                        {user.map((person) => (
                            <Link to={`/${person.type}/${person.id}`} key={person.id}>
                                {/* Spotify only shares the signed-in user's own picture. */}
                                {person.type === 'user' && person.id === me?.id && me.images?.[0] && <img className='bannerAvatar' src={me.images[0].url} alt=''/>}
                                {person.type === 'artist' ? person.name : person.display_name ?? person.id}
                            </Link>
                        ))}
                        {release_date && <span>{release_date.slice(0, 4)}</span>}
                        {stats && <span>{stats}</span>}
                    </div>
                </div>
            </div>
        </header>
    )
}
