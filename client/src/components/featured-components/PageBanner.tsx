import React, { type CSSProperties } from 'react'
import Icon from '../icons'
import { Link } from 'react-router'
import type { Artist, Image, User } from '../../utilities/types'

export type BannerInfo = {
    name: string,
    description?: string | null,
    user: (User | Artist)[],
    followers?: {total: number},
    primary_color?: string | null,
    images?: Image[] | null,
    release_date?: string,
    total?: number,
}

export default function PageBanner({pageTitle, bannerInfo}: {pageTitle: string, bannerInfo: BannerInfo}) {
    const {name, description, user, followers, primary_color, images, release_date, total} = bannerInfo
    const imgUrl = images?.[0]?.url
    const circle = pageTitle==='profile'||pageTitle==='artist'? 'circleDiv':''

    return (
        <div className="banner" style={{backgroundColor:`${primary_color}`, height: pageTitle === 'artist'?'40vh':'30vh'}}>
            <div className={`bannerImgDiv ${circle}`}>
                {imgUrl ? 
                    <img loading="lazy" src={imgUrl} className={`bannerImg ${circle}`} alt="" />:
                    <div className="svgSizing">
                        <Icon name='Music2'/>
                    </div>
                }
            </div>

            <div className="bannerInfo">
                <h2 className="pageTitle">{pageTitle}</h2>
                <span style={spanStyle}>
                    <h1 className={name.length > 15? "bannerTitleXL":"bannerTitle"}>{name}</h1>
                </span>
                {description && <p className="bannerDescription">{description}</p>}
                <div className="additionalInfo">
                    {user[0] && user.map((person, index) => (
                        <Link to={`/${person.type}/${person.id}`} key={index}>
                            {person.type === 'artist' ? person.name : person.display_name}
                        </Link>
                    ))}
                    {total ? 
                        <h2>{total} Playlists</h2>
                    : null}
                    {followers ?
                        <h2 style={pageTitle === 'artist'? followerStyle:undefined}>{followers.total.toLocaleString('en-US')} {followerTitle(pageTitle)}</h2>
                    : null}
                    {release_date && 
                        <h2>{release_date}</h2>
                    }
                </div>
            </div>
            <div className="bannerOverlay"></div>
        </div>
    )
}


function followerTitle(title: string){
    switch (title) {
        case 'profile':
            return 'Followers'
        case 'artist':
            return 'monthly listeners'
        default:
            return 'Likes'
    }
}

const followerStyle: CSSProperties ={
    fontSize: '16px',
    lineHeight: '2',
    marginTop: '4px',
    color: '#fff'
}

const spanStyle: CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: '3',
    WebkitBoxOrient: 'vertical',
    marginTop: '4px',
    wordBreak: 'break-word',
    overflow: 'hidden',
}
