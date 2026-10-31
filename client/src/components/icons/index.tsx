import type { ComponentType } from "react";
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
import Comment from "./Comment";
import Annotation from "./Annotation";
import * as Lucide from "./Lucide";

// Heart takes `fill`; Play, Pause and the Lucide icons take their size.
export type IconProps = { fill?: boolean; width?: string; height?: string };

const icons = {
  Heart, Back, Forward, "N-Search": NSearch, Play, Music, Music2, CD,
  TrackBack, TrackNext, Shuffle, Repeat, Speaker, Volume, Pause, Comment, Annotation,
  ...Lucide,
};

export type IconName = keyof typeof icons;

export default function Icon({ name, ...props }: IconProps & { name: IconName }) {
  const Svg: ComponentType<IconProps> = icons[name];
  return <Svg {...props} />;
}
