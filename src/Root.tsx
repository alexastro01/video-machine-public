import { Composition, Still } from "remotion";
import { StudioFilm, defaultEpisode, getStudioEpisode } from "./StudioFilm";
import { CharacterSheet } from "./CharacterSheet";
import { PixelCharacterSheet } from "./PixelCharacterSheet";
import { BlenderCottageTest } from "./BlenderCottageTest";
import okMotion from "../episodes/ok-message-motion/episode.json";
import shower from "../episodes/shower-singing/episode.json";
import lonely from "../episodes/lonely-around-people/episode.json";
import profileChecks from "../episodes/profile-checks/episode.json";
import startTask from "../episodes/start-the-task/episode.json";
import swap5 from "../episodes/billionaire-body-swap-5/episode.json";
import swap4 from "../episodes/billionaire-body-swap-4/episode.json";
import swap3 from "../episodes/billionaire-body-swap-3/episode.json";
import aiTypo from "../episodes/ai-typo/episode.json";
import subscriber from "../episodes/full-stack-subscriber/episode.json";
import reviewLoop from "../episodes/ai-review-loop/episode.json";
import quickTest from "../episodes/astra-one-quick-test/episode.json";
import inbox from "../episodes/inbox-dot-png/episode.json";
import humanInTheLoop from "../episodes/human-in-the-loop/episode.json";
import { MistakesShort } from "./make-no-mistakes/Film";
import mistakesShortEdit from "../episodes/make-no-mistakes/short-edit.json";
import rip from "../episodes/rip/episode.json";
import absolutelyRight from "../episodes/absolutely-right/episode.json";
import mistakesStory from "../episodes/make-no-mistakes-story/episode.json";
import makeNoMistakes from "../episodes/make-no-mistakes/episode.json";
import bornYesterday from "../episodes/astra-born-yesterday/episode.json";
import coffee from "../episodes/is-coffee-actually-a-drug/episode.json";
import shareLedger from "../episodes/norbert-explains-billionaire-income-tax/episode.json";
import beer from "../episodes/beer-feels-good/episode.json";
import nvidia from "../episodes/nvidia-four-trillion/episode.json";
import { OkVoiceVersion, voiceVersions } from "./ok-motion/OkVoiceVersions";
import {
  UkSceneryReview,
  sceneryReviewDefaults,
} from "./pixel/UkSceneryReview";
import finalRound from "../episodes/alex-astro-the-final-round/episode.json";
import designFixes from "../episodes/alex-astro-ai-slop-three-fixes/episode.json";
import designComment from "../episodes/alex-astro-ai-slop-three-fixes/variants/comment-design/episode.json";
import claudeDesign from "../episodes/alex-astro-how-claude-code-works/episode.json";
import instagramRpg from "../episodes/alex-astro-instagram-algorithm-rpg/episode.json";
import jobMarket from "../episodes/alex-astro-job-market-hell/episode.json";
import lectureOpening from "../episodes/alex-astro-cs-enrollment/opening/episode.json";
import lectureHall from "../episodes/alex-astro-cs-enrollment/episode.json";
import jobMarketHook from "../episodes/alex-astro-job-market-hell/opening/episode.json";
import remoteJob from "../episodes/alex-astro-remote-job/episode.json";
import instagramStudy from "../episodes/alex-astro-instagram-algorithm-rpg/opening/episode.json";
export const RemotionRoot = () => (
  <>
    <Composition
      id="BillionaireIncomeTaxOpening"
      component={StudioFilm}
      defaultProps={{ episodeId: shareLedger.id, portrait: true, showCaptions: true, audioEnabled: false }}
      durationInFrames={Math.round(shareLedger.duration * shareLedger.fps)}
      fps={shareLedger.fps}
      width={1080}
      height={1920}
    />
    <Composition id="CSEnrollmentOpening" component={StudioFilm}
      defaultProps={{episodeId:"cs-enrollment-opening",portrait:true,showCaptions:true,audioEnabled:false}}
      durationInFrames={Math.round(lectureOpening.duration*lectureOpening.fps)} fps={lectureOpening.fps} width={1080} height={1920}/>
    <Composition id="CSEnrollmentFull" component={StudioFilm}
      defaultProps={{episodeId:lectureHall.id,portrait:true,showCaptions:true,audioEnabled:false}}
      durationInFrames={Math.round(lectureHall.duration*lectureHall.fps)} fps={lectureHall.fps} width={1080} height={1920}/>
    <Composition id="JobMarketJuniorTown" component={StudioFilm}
      defaultProps={{ episodeId: "job-market-opening", portrait: true, showCaptions: true, audioEnabled: false }}
      durationInFrames={Math.round(jobMarketHook.duration * jobMarketHook.fps)} fps={jobMarketHook.fps} width={1080} height={1920} />
    <Composition id="JobMarketFull" component={StudioFilm}
      defaultProps={{ episodeId: jobMarket.id, portrait: true, showCaptions: true, audioEnabled: false }}
      durationInFrames={Math.round(jobMarket.duration * jobMarket.fps)} fps={jobMarket.fps} width={1080} height={1920} />
    <Composition
      id="RemoteJobOpening"
      component={StudioFilm}
      defaultProps={{ episodeId: remoteJob.id, portrait: true, showCaptions: true, audioEnabled: false }}
      durationInFrames={Math.round(remoteJob.duration * remoteJob.fps)}
      fps={remoteJob.fps}
      width={1080}
      height={1920}
    />
    <Composition id="InstagramAlgorithmQuest" component={StudioFilm}
      defaultProps={{episodeId: instagramRpg.id, portrait:true, showCaptions:true, audioEnabled:true}}
      durationInFrames={Math.round(instagramRpg.duration*instagramRpg.fps)} fps={instagramRpg.fps} width={1080} height={1920}/>
    {(["InstagramRpgField", "InstagramRpgPortrait"] as const).map((id) => (
      <Composition key={id} id={id} component={StudioFilm}
        defaultProps={{episodeId: "instagram-algorithm-opening-study", portrait: true, rpgPortraits: id === "InstagramRpgPortrait", showCaptions: true, audioEnabled: true}}
        durationInFrames={Math.round(instagramStudy.duration * instagramStudy.fps)} fps={instagramStudy.fps} width={1080} height={1920}
      />
    ))}
    <Composition id="HowClaudeCodeWorks" component={StudioFilm}
      defaultProps={{episodeId: claudeDesign.id, portrait: true, showCaptions: true, audioEnabled: true}}
      durationInFrames={Math.round(claudeDesign.duration * claudeDesign.fps)} fps={claudeDesign.fps} width={1080} height={1920}
    />
    <Composition id="AlexAstroDesignComment12x" component={StudioFilm}
      defaultProps={{episodeId: "alex-astro-design-comment-1p2x", portrait: true, showCaptions: true, audioEnabled: true}}
      durationInFrames={Math.round(designComment.duration * designComment.fps)} fps={designComment.fps} width={1080} height={1920}
    />
    <Composition id="AlexAstroDesignFixes" component={StudioFilm}
      defaultProps={{episodeId: "alex-astro-ai-slop-three-fixes", portrait: true, showCaptions: true, audioEnabled: true}}
      durationInFrames={Math.round(designFixes.duration * designFixes.fps)} fps={designFixes.fps} width={1080} height={1920}
    />
    <Composition id="TheFinalRound" component={StudioFilm}
      defaultProps={{episodeId: "alex-astro-the-final-round", portrait: true, showCaptions: true, audioEnabled: true}}
      durationInFrames={Math.round(finalRound.duration * finalRound.fps)} fps={finalRound.fps} width={1080} height={1920}
    />
    <Composition
      id="RIP"
      component={StudioFilm}
      defaultProps={{ episodeId: "rip", portrait: true, showCaptions: true, audioEnabled: true }}
      durationInFrames={Math.round(rip.duration * rip.fps)}
      fps={rip.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="AbsolutelyRight"
      component={StudioFilm}
      defaultProps={{ episodeId: "absolutely-right", portrait: true, showCaptions: true, audioEnabled: true }}
      durationInFrames={Math.round(absolutelyRight.duration * absolutelyRight.fps)}
      fps={absolutelyRight.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="MakeNoMistakesStory"
      component={StudioFilm}
      defaultProps={{ episodeId: "make-no-mistakes-story", portrait: true, showCaptions: true, audioEnabled: true }}
      durationInFrames={Math.round(mistakesStory.duration * mistakesStory.fps)}
      fps={mistakesStory.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="MakeNoMistakesShort"
      component={MistakesShort}
      defaultProps={{ showCaptions: true, audioEnabled: true }}
      durationInFrames={mistakesShortEdit.frames}
      fps={60}
      width={1080}
      height={1920}
    />
    <Composition
      id="MakeNoMistakes"
      component={StudioFilm}
      defaultProps={{ episodeId: "make-no-mistakes", portrait: true, showCaptions: true, audioEnabled: true }}
      durationInFrames={Math.round(makeNoMistakes.duration * makeNoMistakes.fps)}
      fps={makeNoMistakes.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="AstraBornYesterday"
      component={StudioFilm}
      defaultProps={{ episodeId: "astra-born-yesterday", portrait: true, showCaptions: true, audioEnabled: true }}
      durationInFrames={Math.round(bornYesterday.duration * bornYesterday.fps)}
      fps={bornYesterday.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="HumanInTheLoop"
      component={StudioFilm}
      defaultProps={{ episodeId: "human-in-the-loop", portrait: true, showCaptions: true, audioEnabled: true }}
      durationInFrames={Math.round(humanInTheLoop.duration * humanInTheLoop.fps)}
      fps={humanInTheLoop.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="InboxDotPng"
      component={StudioFilm}
      defaultProps={{ episodeId: "inbox-dot-png", portrait: true, showCaptions: true, audioEnabled: true }}
      durationInFrames={Math.round(inbox.duration * inbox.fps)}
      fps={inbox.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="OneQuickTest"
      component={StudioFilm}
      defaultProps={{
        episodeId: "astra-one-quick-test",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={Math.round(quickTest.duration * quickTest.fps)}
      fps={quickTest.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="IsCoffeeActuallyADrug"
      component={StudioFilm}
      defaultProps={{
        episodeId: "is-coffee-actually-a-drug",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={Math.round(coffee.duration * coffee.fps)}
      fps={coffee.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="BeerFeelsGood"
      component={StudioFilm}
      defaultProps={{
        episodeId: "beer-feels-good",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={Math.round(beer.duration * beer.fps)}
      fps={beer.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="NvidiaFourTrillion"
      component={StudioFilm}
      defaultProps={{
        episodeId: "nvidia-four-trillion",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={Math.round(nvidia.duration * nvidia.fps)}
      fps={nvidia.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="AIReviewLoop"
      component={StudioFilm}
      defaultProps={{
        episodeId: "ai-review-loop",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={Math.round(reviewLoop.duration * reviewLoop.fps)}
      fps={reviewLoop.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="FullStackSubscriber"
      component={StudioFilm}
      defaultProps={{
        episodeId: "full-stack-subscriber",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={Math.round(subscriber.duration * subscriber.fps)}
      fps={subscriber.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="AITypo"
      component={StudioFilm}
      defaultProps={{
        episodeId: "ai-typo",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={Math.round(aiTypo.duration * aiTypo.fps)}
      fps={aiTypo.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="BillionaireSwap5"
      component={StudioFilm}
      defaultProps={{
        episodeId: "billionaire-body-swap-5",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={Math.round(swap5.duration * swap5.fps)}
      fps={swap5.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="BillionaireSwap4"
      component={StudioFilm}
      defaultProps={{
        episodeId: "billionaire-body-swap-4",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={Math.round(swap4.duration * swap4.fps)}
      fps={swap4.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="BillionaireSwap3"
      component={StudioFilm}
      defaultProps={{
        episodeId: "billionaire-body-swap-3",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={Math.round(swap3.duration * swap3.fps)}
      fps={swap3.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="StartTheTask"
      component={StudioFilm}
      defaultProps={{
        episodeId: "start-the-task",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={Math.round(startTask.duration * startTask.fps)}
      fps={startTask.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="ProfileChecks"
      component={StudioFilm}
      defaultProps={{
        episodeId: "profile-checks",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={Math.round(profileChecks.duration * profileChecks.fps)}
      fps={profileChecks.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="LonelyAroundPeople"
      component={StudioFilm}
      defaultProps={{
        episodeId: "lonely-around-people",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={Math.round(lonely.duration * lonely.fps)}
      fps={lonely.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="ShowerSinging"
      component={StudioFilm}
      defaultProps={{
        episodeId: "shower-singing",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={Math.round(shower.duration * shower.fps)}
      fps={shower.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="OKCurrent1p2x"
      component={OkVoiceVersion}
      defaultProps={{ voice: "current" as const, audioEnabled: true }}
      durationInFrames={voiceVersions.current.speed.frames}
      fps={60}
      width={1080}
      height={1920}
    />
    <Composition
      id="OKTeen1p2x"
      component={OkVoiceVersion}
      defaultProps={{ voice: "teen" as const, audioEnabled: true }}
      durationInFrames={voiceVersions.teen.speed.frames}
      fps={60}
      width={1080}
      height={1920}
    />
    <Composition
      id="OKMessageMotion"
      component={StudioFilm}
      defaultProps={{
        episodeId: "ok-message-motion",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={Math.round(okMotion.duration * okMotion.fps)}
      fps={okMotion.fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="OKMessageSample"
      component={StudioFilm}
      defaultProps={{
        episodeId: "ok-message",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={540}
      fps={60}
      width={1080}
      height={1920}
    />
    <Composition
      id="BlenderCottageTest"
      component={BlenderCottageTest}
      defaultProps={{ audioEnabled: true }}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
    />
    <Still
      id="SceneryReview"
      component={UkSceneryReview}
      defaultProps={sceneryReviewDefaults}
      width={1080}
      height={1920}
    />
    <Composition
      id="Portrait"
      component={StudioFilm}
      defaultProps={{
        episodeId: "uk-disappears",
        portrait: true,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={1800}
      fps={30}
      width={1080}
      height={1920}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.round(
          (
            props.episode ??
            getStudioEpisode(props.episodeId)?.episode ??
            defaultEpisode
          ).duration *
            (
              props.episode ??
              getStudioEpisode(props.episodeId)?.episode ??
              defaultEpisode
            ).fps,
        ),
        fps: (
          props.episode ??
          getStudioEpisode(props.episodeId)?.episode ??
          defaultEpisode
        ).fps,
      })}
    />
    <Composition
      id="Landscape"
      component={StudioFilm}
      defaultProps={{
        episodeId: "uk-disappears",
        portrait: false,
        showCaptions: true,
        audioEnabled: true,
      }}
      durationInFrames={1800}
      fps={30}
      width={1920}
      height={1080}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.round(
          (
            props.episode ??
            getStudioEpisode(props.episodeId)?.episode ??
            defaultEpisode
          ).duration *
            (
              props.episode ??
              getStudioEpisode(props.episodeId)?.episode ??
              defaultEpisode
            ).fps,
        ),
        fps: (
          props.episode ??
          getStudioEpisode(props.episodeId)?.episode ??
          defaultEpisode
        ).fps,
      })}
    />
    <Still
      id="Thumbnail"
      component={StudioFilm}
      defaultProps={{
        episodeId: "uk-disappears",
        portrait: true,
        showCaptions: false,
        audioEnabled: false,
      }}
      width={1080}
      height={1920}
    />
    <Still
      id="Cast"
      component={PixelCharacterSheet}
      width={1920}
      height={1080}
    />
    <Still
      id="IllustratedCast"
      component={CharacterSheet}
      width={1920}
      height={1080}
    />
  </>
);
