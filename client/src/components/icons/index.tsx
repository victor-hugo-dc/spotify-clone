import type { ComponentType } from "react";
import Home from "./Home";
import Search from "./Search";
import Library from "./Library";
import Create from "./Create";
import Like from "./Like";
import Install from "./Install";
import Back from "./Back";
import Forward from "./Forward";
import NSearch from "./NSearch";
import Heart from "./Heart";
import Play from "./Play";
import Music from "./Music";
import Music2 from "./Music2";
import CD from "./CD";
import TrackBack from "./TrackBack";
import TrackNext from "./TrackNext";
import Shuffle from "./Shuffle";
import Repeat from "./Repeat";
import Speaker from "./Speaker";
import Volume from "./Volume";
import Pause from "./Pause";
import Social from "./Social";
import Comment from "./Comment";
import Annotation from "./Annotation";
import * as Lucide from "./Lucide";

// Heart takes `fill`; Play, Pause, Install and the Lucide icons take their size.
export type IconProps = { fill?: boolean; width?: string; height?: string; viewBox?: string };

const icons = {
  Home, Search, Library, Create, Heart, Like, Install, Back, Forward, "N-Search": NSearch, Play, Music, Music2, CD,
  TrackBack, TrackNext, Shuffle, Repeat, Speaker, Volume, Pause, Social, Comment, Annotation,
  ...Lucide,
};

export type IconName = keyof typeof icons;

export default function Icon({ name, ...props }: IconProps & { name: IconName }) {
  const Svg: ComponentType<IconProps> = icons[name];
  return <Svg {...props} />;
}
