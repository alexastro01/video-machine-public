import { useMemo } from "react";
import type { Caption } from "@remotion/captions";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Captions, captionPages } from "./components/Captions";
import "./components/Typography";
import type { Episode } from "./engine/schema";
import { palette as p, tween } from "./engine/motion";
import { ReviewCaptions } from "./components/ReviewCaptions";
import { EpisodePicture } from "./EpisodePicture";
import { OkMessageSample } from "./ok/OkMessageSample";
import { OkMotionFilm } from "./ok-motion/OkMotionFilm";
import teenMotionEdit from "../episodes/ok-message-motion-teen/edit.json";
import { ShowerFilm } from "./shower/ShowerFilm";
import { LonelyFilm } from "./lonely/LonelyFilm";
import { ProfileChecksFilm } from "./profile-checks/ProfileChecksFilm";
import { StartTaskV3Film } from "./start-task/StartTaskV3Film";
import { Swap5Film } from "./swap5/Swap5Film";
import { Swap4Film } from "./swap4/Swap4Film";
import { Swap3Film } from "./swap3/Swap3Film";
import { AiTypoFilm } from "./ai-typo/AiTypoFilm";
import { SubscriberFilm } from "./subscriber/SubscriberFilm";
import { ReviewLoopFilm } from "./review-loop/ReviewLoopFilm";
import { QuickTestFilm } from "./quick-test/QuickTestFilm";
import { InboxFilm } from "./inbox-png/InboxFilm";
import { HumanInTheLoopFilm } from "./human-in-the-loop/HumanInTheLoopFilm";
import { PresenterFilm } from "./alex-presenter/Film";
import { InstagramQuest } from "./instagram-rpg/quest/Film";
import { JobMarketFilm } from "./job-market/Film";
import { JobMarketOpening } from "./job-market/Opening";
import { RemoteJobOpening } from "./remote-job/Opening";
import { LectureHallFilm } from "./lecture-hall/Film";
import { InstagramRpgFilm } from "./instagram-rpg/Film";
import { ClaudeDesignFilm } from "./claude-design/Film";
import { FlatClaudeFilm } from "./claude-flat/Film";
import { FinalRoundFilm } from "./final-round/Film";
import { RipFilm } from "./rip/Film";
import { AbsolutelyRightFilm } from "./absolutely-right/Film";
import { StoryFilm } from "./mistakes-story/StoryFilm";
import { MistakesFilm } from "./make-no-mistakes/Film";
import { BornYesterdayFilm } from "./born-yesterday/BornYesterdayFilm";
import { CoffeeFilm } from "./coffee/CoffeeFilm";
import { ShareLedgerFilm } from "./share-ledger/Film";
import { BeerFilm } from "./beer/BeerFilm";
import { NvidiaFilm } from "./nvidia/NvidiaFilm";

export type FilmProps = {
  episode: Episode;
  captions: Caption[];
  portrait: boolean;
  rpgPortraits?: boolean;
  showCaptions: boolean;
  audioEnabled: boolean;
};

export const EpisodeFilm = ({
  episode,
  captions,
  portrait,
  showCaptions,
  audioEnabled,
  rpgPortraits = false,
}: FilmProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pages = useMemo(() => captionPages(captions), [captions]);
  const time = frame / fps;
  if (episode.world === "share-ledger")
    return <ShareLedgerFilm episodeId={episode.id} captions={captions} showCaptions={showCaptions} audioEnabled={audioEnabled} />;
  if (episode.world === "lecture-hall-rpg")
    return <LectureHallFilm episode={episode} captions={captions} showCaptions={showCaptions} audioEnabled={audioEnabled} />;
  if (episode.world === "remote-job-rpg")
    return <RemoteJobOpening episode={episode} captions={captions} showCaptions={showCaptions} audioEnabled={audioEnabled} />;
  if (episode.world === "job-market-rpg") {
    if (episode.jobMarketFull) return <JobMarketFilm episode={episode} captions={captions} showCaptions={showCaptions} audioEnabled={audioEnabled} />;
    return <JobMarketOpening episode={episode} captions={captions} showCaptions={showCaptions} audioEnabled={audioEnabled} />;
  }
  if (episode.world === "instagram-rpg" && episode.rpgCut === "quest") {
    return <InstagramQuest showCaptions={showCaptions} audioEnabled={audioEnabled}/>;
  }
  if (episode.world === "instagram-rpg") {
    return <InstagramRpgFilm portraits={rpgPortraits} showCaptions={showCaptions} audioEnabled={audioEnabled} />;
  }
  if (episode.world === "claude-design") {
    if (!episode.claudeEdit) throw new Error("Run media:prepare for the Claude Code explainer");
    if (episode.claudeEdit.flat) {
      return <FlatClaudeFilm episodeId={episode.id} edit={episode.claudeEdit} flat={episode.claudeEdit.flat} captions={captions} showCaptions={showCaptions} audioEnabled={audioEnabled} />;
    }
    return <ClaudeDesignFilm episodeId={episode.id} edit={episode.claudeEdit} captions={captions} showCaptions={showCaptions} audioEnabled={audioEnabled} />;
  }
  if (episode.world === "alex-presenter") {
    if (!episode.presenterEdit) throw new Error("Run media:prepare to build the presenter edit");
    return <PresenterFilm episodeId={episode.id} edit={episode.presenterEdit} captions={captions} showCaptions={showCaptions} audioEnabled={audioEnabled} />;
  }
  if (episode.world === "final-round")
    return <FinalRoundFilm showCaptions={showCaptions} audioEnabled={audioEnabled} />;
  if (episode.world === "rip")
    return <RipFilm episode={episode} captions={captions} showCaptions={showCaptions} audioEnabled={audioEnabled} />;
  if (episode.world === "absolutely-right")
    return <AbsolutelyRightFilm showCaptions={showCaptions} audioEnabled={audioEnabled} />;
  if (episode.world === "make-no-mistakes-story")
    return <StoryFilm showCaptions={showCaptions} audioEnabled={audioEnabled} />;
  if (episode.world === "make-no-mistakes")
    return <MistakesFilm captions={captions} showCaptions={showCaptions} audioEnabled={audioEnabled} />;
  if (episode.world === "astra-born-yesterday")
    return <BornYesterdayFilm captions={captions} showCaptions={showCaptions} audioEnabled={audioEnabled} />;
  if (episode.world === "human-in-the-loop")
    return <HumanInTheLoopFilm captions={captions} showCaptions={showCaptions} audioEnabled={audioEnabled} />;
  if (episode.world === "inbox-png")
    return <InboxFilm captions={captions} showCaptions={showCaptions} audioEnabled={audioEnabled} />;
  if (episode.world === "astra-quick-test")
    return (
      <QuickTestFilm
        captions={captions}
        showCaptions={showCaptions}
        audioEnabled={audioEnabled}
      />
    );
  if (episode.world === "coffee-motion")
    return (
      <CoffeeFilm
        captions={captions}
        showCaptions={showCaptions}
        audioEnabled={audioEnabled}
      />
    );
  if (episode.world === "beer-motion")
    return (
      <BeerFilm
        captions={captions}
        showCaptions={showCaptions}
        audioEnabled={audioEnabled}
      />
    );
  if (episode.world === "nvidia")
    return (
      <NvidiaFilm
        captions={captions}
        showCaptions={showCaptions}
        audioEnabled={audioEnabled}
      />
    );
  if (episode.world === "review-loop")
    return (
      <ReviewLoopFilm
        captions={captions}
        showCaptions={showCaptions}
        audioEnabled={audioEnabled}
      />
    );
  if (episode.world === "subscriber")
    return (
      <SubscriberFilm
        captions={captions}
        showCaptions={showCaptions}
        audioEnabled={audioEnabled}
      />
    );
  if (episode.world === "ai-typo")
    return (
      <AiTypoFilm
        captions={captions}
        showCaptions={showCaptions}
        audioEnabled={audioEnabled}
      />
    );
  if (episode.world === "swap5")
    return (
      <Swap5Film
        captions={captions}
        showCaptions={showCaptions}
        audioEnabled={audioEnabled}
      />
    );
  if (episode.world === "swap4")
    return (
      <Swap4Film
        captions={captions}
        showCaptions={showCaptions}
        audioEnabled={audioEnabled}
      />
    );
  if (episode.world === "swap3")
    return (
      <Swap3Film
        captions={captions}
        showCaptions={showCaptions}
        audioEnabled={audioEnabled}
      />
    );
  if (episode.world === "start-task") {
    return (
      <StartTaskV3Film
        captions={captions}
        showCaptions={showCaptions}
        audioEnabled={audioEnabled}
      />
    );
  }
  if (episode.world === "profile-motion") {
    return (
      <ProfileChecksFilm
        captions={captions}
        showCaptions={showCaptions}
        audioEnabled={audioEnabled}
      />
    );
  }
  if (episode.world === "lonely-motion") {
    return (
      <LonelyFilm
        captions={captions}
        showCaptions={showCaptions}
        audioEnabled={audioEnabled}
      />
    );
  }
  if (episode.world === "shower-motion") {
    return (
      <ShowerFilm
        captions={captions}
        showCaptions={showCaptions}
        audioEnabled={audioEnabled}
      />
    );
  }
  if (episode.world === "ok-motion") {
    return (
      <OkMotionFilm
        timing={
          episode.id === "ok-message-motion-teen" ? teenMotionEdit : undefined
        }
        audioTracks={episode.audio}
        captions={captions}
        showCaptions={showCaptions}
        audioEnabled={audioEnabled}
      />
    );
  }
  if (episode.world === "ok-message") {
    return (
      <OkMessageSample
        captions={captions}
        showCaptions={showCaptions}
        audioEnabled={audioEnabled}
      />
    );
  }
  return (
    <AbsoluteFill style={{ backgroundColor: p.paper }}>
      <EpisodePicture episode={episode} portrait={portrait} />
      {showCaptions &&
        (episode.reviewEdit || episode.ukEdit ? (
          <ReviewCaptions
            captions={captions}
            episode={episode}
            portrait={portrait}
          />
        ) : (
          <Captions
            pages={pages}
            portrait={portrait}
            hookDuration={
              episode.hook !== "none" ? (episode.scenes[1]?.start ?? 3.4) : 0
            }
          />
        ))}
      {episode.closingFade && (
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            background: episode.renderer === "pixel3d" ? "#24314b" : p.paper,
            opacity: tween(
              time,
              episode.duration - 0.6,
              episode.duration,
              0,
              1,
            ),
          }}
        />
      )}
      {audioEnabled && (
        <>
          <Sequence
            name="Amara · narration"
            from={Math.round(episode.audio.narrationOffset * fps)}
          >
            <Audio src={staticFile(episode.audio.narration)} />
          </Sequence>
          <Audio
            name="Original score"
            src={staticFile(episode.audio.music)}
            volume={(f) =>
              ((episode.ukEdit ?? episode.reviewEdit) &&
              f / fps >= (episode.ukEdit ?? episode.reviewEdit)!.quietStart &&
              f / fps <
                (episode.ukEdit ?? episode.reviewEdit)!.quietStart +
                  (episode.ukEdit ?? episode.reviewEdit)!.quietDuration
                ? episode.ukEdit
                  ? 0
                  : 0.02
                : 1) *
              tween(
                f / fps,
                0,
                0.8,
                0,
                episode.hook !== "none" ? 0.055 : 0.15,
              ) *
              (episode.hook !== "none"
                ? tween(f / fps, 2.8, 4, 0.65, 0.15 / 0.055)
                : 1) *
              tween(f / fps, episode.duration - 2, episode.duration, 1, 0)
            }
          />
          <Audio
            name="Timed Foley"
            src={staticFile(episode.audio.effects)}
            volume={0.7}
          />
        </>
      )}
    </AbsoluteFill>
  );
};
