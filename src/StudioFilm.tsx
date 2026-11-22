import type { Caption } from "@remotion/captions";
import { EpisodeFilm } from "./EpisodeFilm";
import { episodeSchema, type Episode } from "./engine/schema";
import pilot from "../episodes/one-second-ahead/episode.json";
import pilotCaptions from "../episodes/one-second-ahead/captions.json";
import brain from "../episodes/brain-upload/episode.json";
import brainCaptions from "../episodes/brain-upload/captions.json";
import tudor from "../episodes/survive-1500/episode.json";
import tudorCaptions from "../episodes/survive-1500/captions.json";
import uk from "../episodes/uk-disappears/episode.json";
import ukCaptions from "../episodes/uk-disappears/captions.json";
import okMessage from "../episodes/ok-message/episode.json";
import okCaptions from "../episodes/ok-message/captions.json";
import okMotion from "../episodes/ok-message-motion/episode.json";
import okMotionCaptions from "../episodes/ok-message-motion/captions.json";
import okTeen from "../episodes/ok-message-motion-teen/episode.json";
import okTeenCaptions from "../episodes/ok-message-motion-teen/captions.json";
import shower from "../episodes/shower-singing/episode.json";
import showerCaptions from "../episodes/shower-singing/captions.json";
import lonely from "../episodes/lonely-around-people/episode.json";
import lonelyCaptions from "../episodes/lonely-around-people/captions.json";
import profileChecks from "../episodes/profile-checks/episode.json";
import profileCaptions from "../episodes/profile-checks/captions.json";
import startTask from "../episodes/start-the-task/episode.json";
import startTaskCaptions from "../episodes/start-the-task/captions.json";
import swap3 from "../episodes/billionaire-body-swap-3/episode.json";
import swap3Captions from "../episodes/billionaire-body-swap-3/captions.json";
import swap4 from "../episodes/billionaire-body-swap-4/episode.json";
import swap4Captions from "../episodes/billionaire-body-swap-4/captions.json";
import swap5 from "../episodes/billionaire-body-swap-5/episode.json";
import swap5Captions from "../episodes/billionaire-body-swap-5/captions.json";
import aiTypo from "../episodes/ai-typo/episode.json";
import aiTypoCaptions from "../episodes/ai-typo/captions.json";
import subscriber from "../episodes/full-stack-subscriber/episode.json";
import subscriberCaptions from "../episodes/full-stack-subscriber/captions.json";
import reviewLoop from "../episodes/ai-review-loop/episode.json";
import reviewLoopCaptions from "../episodes/ai-review-loop/captions.json";
import quickTest from "../episodes/astra-one-quick-test/episode.json";
import quickTestCaptions from "../episodes/astra-one-quick-test/captions.json";
import inbox from "../episodes/inbox-dot-png/episode.json";
import inboxCaptions from "../episodes/inbox-dot-png/captions.json";
import humanInTheLoop from "../episodes/human-in-the-loop/episode.json";
import humanInTheLoopCaptions from "../episodes/human-in-the-loop/captions.json";
import rip from "../episodes/rip/episode.json";
import ripCaptions from "../episodes/rip/captions.json";
import absolutelyRight from "../episodes/absolutely-right/episode.json";
import absolutelyRightCaptions from "../episodes/absolutely-right/captions.json";
import mistakesStory from "../episodes/make-no-mistakes-story/episode.json";
import storyCaptions from "../episodes/make-no-mistakes-story/captions.json";
import makeNoMistakes from "../episodes/make-no-mistakes/episode.json";
import mistakesCaptions from "../episodes/make-no-mistakes/captions.json";
import bornYesterday from "../episodes/astra-born-yesterday/episode.json";
import bornYesterdayCaptions from "../episodes/astra-born-yesterday/captions.json";
import coffee from "../episodes/is-coffee-actually-a-drug/episode.json";
import shareLedger from "../episodes/norbert-explains-billionaire-income-tax/episode.json";
import shareLedgerCaptions from "../episodes/norbert-explains-billionaire-income-tax/captions.json";
import coffeeCaptions from "../episodes/is-coffee-actually-a-drug/captions.json";
import beer from "../episodes/beer-feels-good/episode.json";
import beerCaptions from "../episodes/beer-feels-good/captions.json";
import nvidia from "../episodes/nvidia-four-trillion/episode.json";
import nvidiaCaptions from "../episodes/nvidia-four-trillion/captions.json";
import finalRound from "../episodes/alex-astro-the-final-round/episode.json";
import finalRoundCaptions from "../episodes/alex-astro-the-final-round/captions.json";
import designFixes from "../episodes/alex-astro-ai-slop-three-fixes/episode.json";
import designCaptions from "../episodes/alex-astro-ai-slop-three-fixes/captions.json";
import designComment from "../episodes/alex-astro-ai-slop-three-fixes/variants/comment-design/episode.json";
import commentCaptions from "../episodes/alex-astro-ai-slop-three-fixes/variants/comment-design/captions.json";
import claudeDesign from "../episodes/alex-astro-how-claude-code-works/episode.json";
import claudeCaptions from "../episodes/alex-astro-how-claude-code-works/captions.json";
import instagramRpg from "../episodes/alex-astro-instagram-algorithm-rpg/episode.json";
import jobMarket from "../episodes/alex-astro-job-market-hell/episode.json";
import remoteJob from "../episodes/alex-astro-remote-job/episode.json";
import remoteJobCaptions from "../episodes/alex-astro-remote-job/captions.json";
import lectureHall from "../episodes/alex-astro-cs-enrollment/episode.json";
import lectureOpening from "../episodes/alex-astro-cs-enrollment/opening/episode.json";
import lectureOpeningCaptions from "../episodes/alex-astro-cs-enrollment/opening/captions.json";
import lectureHallCaptions from "../episodes/alex-astro-cs-enrollment/captions.json";
import jobMarketOpening from "../episodes/alex-astro-job-market-hell/opening/episode.json";
import jobMarketOpeningCaptions from "../episodes/alex-astro-job-market-hell/opening/captions.json";
import jobMarketCaptions from "../episodes/alex-astro-job-market-hell/captions.json";
import instagramCaptions from "../episodes/alex-astro-instagram-algorithm-rpg/captions.json";
import rpgOpening from "../episodes/alex-astro-instagram-algorithm-rpg/opening/episode.json";
import rpgOpeningCaptions from "../episodes/alex-astro-instagram-algorithm-rpg/opening/captions.json";
const episodes = {
  "norbert-explains-billionaire-income-tax": {
    episode: episodeSchema.parse(shareLedger),
    captions: shareLedgerCaptions,
  },
  "cs-enrollment-opening": {episode: episodeSchema.parse(lectureOpening), captions: lectureOpeningCaptions},
  "alex-astro-cs-enrollment": {episode: episodeSchema.parse(lectureHall), captions: lectureHallCaptions},
  "job-market-opening": { episode: episodeSchema.parse(jobMarketOpening), captions: jobMarketOpeningCaptions },
  "alex-astro-job-market-hell": { episode: episodeSchema.parse(jobMarket), captions: jobMarketCaptions },
  "alex-astro-remote-job": { episode: episodeSchema.parse(remoteJob), captions: remoteJobCaptions },
  "instagram-algorithm-opening-study": { episode: episodeSchema.parse(rpgOpening), captions: rpgOpeningCaptions },
  "alex-astro-instagram-algorithm-rpg": { episode: episodeSchema.parse(instagramRpg), captions: instagramCaptions },
  "alex-astro-how-claude-code-works": { episode: episodeSchema.parse(claudeDesign), captions: claudeCaptions },
  "alex-astro-design-comment-1p2x": { episode: episodeSchema.parse(designComment), captions: commentCaptions },
  "alex-astro-ai-slop-three-fixes": { episode: episodeSchema.parse(designFixes), captions: designCaptions },
  "alex-astro-the-final-round": { episode: episodeSchema.parse(finalRound), captions: finalRoundCaptions },
  rip: { episode: episodeSchema.parse(rip), captions: ripCaptions },
  "absolutely-right": { episode: episodeSchema.parse(absolutelyRight), captions: absolutelyRightCaptions },
  "make-no-mistakes-story": { episode: episodeSchema.parse(mistakesStory), captions: storyCaptions },
  "make-no-mistakes": { episode: episodeSchema.parse(makeNoMistakes), captions: mistakesCaptions },
  "astra-born-yesterday": { episode: episodeSchema.parse(bornYesterday), captions: bornYesterdayCaptions },
  "human-in-the-loop": { episode: episodeSchema.parse(humanInTheLoop), captions: humanInTheLoopCaptions },
  "inbox-dot-png": { episode: episodeSchema.parse(inbox), captions: inboxCaptions },
  "astra-one-quick-test": {
    episode: episodeSchema.parse(quickTest),
    captions: quickTestCaptions,
  },
  "is-coffee-actually-a-drug": {
    episode: episodeSchema.parse(coffee),
    captions: coffeeCaptions,
  },
  "beer-feels-good": {
    episode: episodeSchema.parse(beer),
    captions: beerCaptions,
  },
  "nvidia-four-trillion": {
    episode: episodeSchema.parse(nvidia),
    captions: nvidiaCaptions,
  },
  "ai-review-loop": {
    episode: episodeSchema.parse(reviewLoop),
    captions: reviewLoopCaptions,
  },
  "full-stack-subscriber": {
    episode: episodeSchema.parse(subscriber),
    captions: subscriberCaptions,
  },
  "ai-typo": { episode: episodeSchema.parse(aiTypo), captions: aiTypoCaptions },
  "billionaire-body-swap-5": {
    episode: episodeSchema.parse(swap5),
    captions: swap5Captions,
  },
  "billionaire-body-swap-4": {
    episode: episodeSchema.parse(swap4),
    captions: swap4Captions,
  },
  "billionaire-body-swap-3": {
    episode: episodeSchema.parse(swap3),
    captions: swap3Captions,
  },
  "start-the-task": {
    episode: episodeSchema.parse(startTask),
    captions: startTaskCaptions,
  },
  "profile-checks": {
    episode: episodeSchema.parse(profileChecks),
    captions: profileCaptions,
  },
  "lonely-around-people": {
    episode: episodeSchema.parse(lonely),
    captions: lonelyCaptions,
  },
  "shower-singing": {
    episode: episodeSchema.parse(shower),
    captions: showerCaptions,
  },
  "ok-message-motion-teen": {
    episode: episodeSchema.parse(okTeen),
    captions: okTeenCaptions,
  },
  "ok-message-motion": {
    episode: episodeSchema.parse(okMotion),
    captions: okMotionCaptions,
  },
  "ok-message": {
    episode: episodeSchema.parse(okMessage),
    captions: okCaptions,
  },
  "uk-disappears": { episode: episodeSchema.parse(uk), captions: ukCaptions },
  "survive-1500": {
    episode: episodeSchema.parse(tudor),
    captions: tudorCaptions,
  },
  "brain-upload": {
    episode: episodeSchema.parse(brain),
    captions: brainCaptions,
  },
  "one-second-ahead": {
    episode: episodeSchema.parse(pilot),
    captions: pilotCaptions,
  },
};
export const defaultEpisode = episodes["uk-disappears"].episode;
export const getStudioEpisode = (id: string) =>
  episodes[id as keyof typeof episodes];
export type StudioFilmProps = {
  episodeId: string;
  episode?: Episode;
  captions?: Caption[];
  portrait: boolean;
  rpgPortraits?: boolean;
  showCaptions: boolean;
  audioEnabled: boolean;
};
export const StudioFilm = ({
  episodeId,
  episode,
  captions,
  ...controls
}: StudioFilmProps) => {
  const saved = getStudioEpisode(episodeId);
  if (!episode && !saved)
    throw new Error(
      "Open this episode with its studio-props.json file. See README.md.",
    );
  return (
    <EpisodeFilm
      episode={episode ?? saved.episode}
      captions={captions ?? saved.captions}
      {...controls}
    />
  );
};
